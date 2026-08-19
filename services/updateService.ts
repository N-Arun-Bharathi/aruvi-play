import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Crypto from "expo-crypto";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";
import axios from "axios";

export interface RemoteVersionInfo {
  version: string;
  versionCode: number;
  apkUrl: string;
  sha256?: string;
  releaseNotes?: string[] | string;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  currentVersionCode: number;
  latestVersion: string;
  latestVersionCode: number;
  apkUrl?: string;
  sha256?: string;
  releaseNotes: string[];
  error?: string;
}

export interface DownloadProgress {
  progressPercent: number;
  downloadedBytes: number;
  totalBytes: number;
  downloadedMB: string;
  totalMB: string;
}

const DEFAULT_VERSION_JSON_URLS = [
  "https://raw.githubusercontent.com/N-Arun-Bharathi/aruvi-play/main/version.json",
  "https://aruvi-play.vercel.app/version.json",
];

let cachedResult: { timestamp: number; data: UpdateCheckResult } | null = null;
const CACHE_DURATION_MS = 45 * 60 * 1000; // 45 minutes

let activeDownloadResumable: FileSystem.DownloadResumable | null = null;

/**
 * Robust semantic version comparison.
 * Returns:
 * -1 if v1 < v2 (update available)
 *  0 if v1 == v2 (up to date)
 *  1 if v1 > v2 (installed is newer)
 */
export function compareVersions(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^v/i, "").trim();
  const cleanV2 = v2.replace(/^v/i, "").trim();

  const parts1 = cleanV1.split(".").map((p) => parseInt(p, 10) || 0);
  const parts2 = cleanV2.split(".").map((p) => parseInt(p, 10) || 0);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;

    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }

  return 0;
}

/**
 * Gets the current installed application version and version code dynamically.
 */
export function getInstalledAppInfo(): { version: string; versionCode: number } {
  const version =
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    "1.3.0";

  const versionCodeRaw =
    Application.nativeBuildVersion ||
    Constants.expoConfig?.android?.versionCode;

  const versionCode =
    typeof versionCodeRaw === "number"
      ? versionCodeRaw
      : parseInt(String(versionCodeRaw || "3"), 10) || 3;

  return { version, versionCode };
}

/**
 * Fetches the public version.json and determines if an update is available.
 */
export async function checkForAppUpdates(
  forceRefresh = false,
  customVersionUrl?: string
): Promise<UpdateCheckResult> {
  const installed = getInstalledAppInfo();

  if (
    !forceRefresh &&
    cachedResult &&
    Date.now() - cachedResult.timestamp < CACHE_DURATION_MS
  ) {
    console.log("UpdateService: returning cached update check result.");
    return cachedResult.data;
  }

  const urlsToTry = customVersionUrl
    ? [customVersionUrl, ...DEFAULT_VERSION_JSON_URLS]
    : DEFAULT_VERSION_JSON_URLS;

  let remoteInfo: RemoteVersionInfo | null = null;
  let fetchError = "";

  for (const url of urlsToTry) {
    try {
      console.log(`UpdateService: Fetching version.json from ${url}...`);
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      const data = response.data;
      if (
        data &&
        typeof data === "object" &&
        data.version &&
        typeof data.version === "string" &&
        data.apkUrl &&
        typeof data.apkUrl === "string" &&
        data.apkUrl.startsWith("https://")
      ) {
        remoteInfo = {
          version: data.version,
          versionCode:
            typeof data.versionCode === "number"
              ? data.versionCode
              : parseInt(String(data.versionCode || 0), 10),
          apkUrl: data.apkUrl,
          sha256: data.sha256 || undefined,
          releaseNotes: data.releaseNotes || [],
        };
        break;
      }
    } catch (err: any) {
      console.warn(`UpdateService: Failed to fetch from ${url}:`, err.message);
      fetchError = err.message || "Network request failed";
    }
  }

  // 2. If public version.json URLs failed or returned 404, check Supabase table 'app_versions'
  if (!remoteInfo) {
    try {
      const { supabase } = require("./supabase");
      const { data: latestRelease, error } = await supabase
        .from("app_versions")
        .select("*")
        .order("version_code", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && latestRelease && latestRelease.version_code && latestRelease.apk_url) {
        remoteInfo = {
          version: latestRelease.version_name || `1.${latestRelease.version_code}.0`,
          versionCode: latestRelease.version_code,
          apkUrl: latestRelease.apk_url,
          releaseNotes: latestRelease.release_notes || [],
        };
      }
    } catch (_) {}
  }

  // 3. Fallback to local version.json configuration if remote endpoints were unreachable
  if (!remoteInfo) {
    try {
      const localConfig = require("../version.json");
      if (localConfig && localConfig.version && localConfig.apkUrl && localConfig.apkUrl.startsWith("https://")) {
        remoteInfo = {
          version: localConfig.version,
          versionCode: localConfig.versionCode || 15,
          apkUrl: localConfig.apkUrl,
          sha256: localConfig.sha256 || undefined,
          releaseNotes: localConfig.releaseNotes || [],
        };
      }
    } catch (_) {}
  }

  if (!remoteInfo) {
    const errorResult: UpdateCheckResult = {
      updateAvailable: false,
      currentVersion: installed.version,
      currentVersionCode: installed.versionCode,
      latestVersion: installed.version,
      latestVersionCode: installed.versionCode,
      releaseNotes: [],
      error: fetchError || "Unable to reach update server",
    };
    return errorResult;
  }

  // Parse release notes into array of strings
  let releaseNotes: string[] = [];
  if (Array.isArray(remoteInfo.releaseNotes)) {
    releaseNotes = remoteInfo.releaseNotes;
  } else if (typeof remoteInfo.releaseNotes === "string") {
    releaseNotes = remoteInfo.releaseNotes
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Compare semantic version and versionCode
  const semverDiff = compareVersions(installed.version, remoteInfo.version);
  const codeDiff = remoteInfo.versionCode > installed.versionCode;

  const updateAvailable = semverDiff < 0 || codeDiff;

  const result: UpdateCheckResult = {
    updateAvailable,
    currentVersion: installed.version,
    currentVersionCode: installed.versionCode,
    latestVersion: remoteInfo.version,
    latestVersionCode: remoteInfo.versionCode,
    apkUrl: remoteInfo.apkUrl,
    sha256: remoteInfo.sha256,
    releaseNotes,
  };

  cachedResult = {
    timestamp: Date.now(),
    data: result,
  };

  return result;
}

/**
 * Returns destination file path for downloading an APK.
 */
export function getLocalApkUri(version: string): string {
  const sanitizedVersion = version.replace(/[^a-zA-Z0-9._-]/g, "");
  return `${FileSystem.cacheDirectory}AruviPlay-v${sanitizedVersion}.apk`;
}

/**
 * Checks if a valid, non-corrupt downloaded APK file for a given version already exists in cache.
 */
export async function checkDownloadedApkExists(version: string): Promise<string | null> {
  try {
    const uri = getLocalApkUri(version);
    const isValid = await verifyApkFileIntegrity(uri);
    return isValid ? uri : null;
  } catch {
    return null;
  }
}

/**
 * Cleans up any cached APK file.
 */
export async function cleanupApkFile(version?: string): Promise<void> {
  try {
    if (version) {
      const uri = getLocalApkUri(version);
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } else {
      const dir = FileSystem.cacheDirectory;
      if (dir) {
        const files = await FileSystem.readDirectoryAsync(dir);
        for (const file of files) {
          if (file.startsWith("AruviPlay-") && file.endsWith(".apk")) {
            await FileSystem.deleteAsync(`${dir}${file}`, { idempotent: true });
          }
        }
      }
    }
  } catch (err) {
    console.warn("UpdateService: cleanupApkFile warning:", err);
  }
}

export function formatGoogleDriveDirectUrl(url: string): string {
  let fileId: string | null = null;

  if (url.includes("drive.google.com/file/d/")) {
    const match = url.match(/\/file\/d\/([^\/]+)/);
    if (match && match[1]) fileId = match[1];
  } else if (url.includes("id=")) {
    const match = url.match(/[?&]id=([^&]+)/);
    if (match && match[1]) fileId = match[1];
  }

  if (fileId) {
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  }

  return url;
}

/**
 * Downloads the APK with live progress reporting.
 */
export async function downloadApkUpdate(
  rawApkUrl: string,
  version: string,
  onProgress: (progress: DownloadProgress) => void,
  expectedSha256?: string
): Promise<{ success: boolean; fileUri?: string; error?: string; isHtmlRedirect?: boolean }> {
  const apkUrl = formatGoogleDriveDirectUrl(rawApkUrl);

  if (!apkUrl.startsWith("https://")) {
    return { success: false, error: "Security Error: APK URL must use HTTPS." };
  }

  const destinationUri = getLocalApkUri(version);

  // Clean up any existing file at destination
  await cleanupApkFile(version);

  try {
    const callback = (downloadProgress: FileSystem.DownloadProgressData) => {
      const totalBytes = downloadProgress.totalBytesExpectedToWrite || 0;
      const downloadedBytes = downloadProgress.totalBytesWritten || 0;

      let progressPercent = 0;
      if (totalBytes > 0) {
        progressPercent = Math.min(
          100,
          Math.max(0, Math.round((downloadedBytes / totalBytes) * 100))
        );
      }

      const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
      const totalMB = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : "?";

      onProgress({
        progressPercent,
        downloadedBytes,
        totalBytes,
        downloadedMB: `${downloadedMB} MB`,
        totalMB: `${totalMB} MB`,
      });
    };

    activeDownloadResumable = FileSystem.createDownloadResumable(
      apkUrl,
      destinationUri,
      {},
      callback
    );

    console.log(`UpdateService: Starting download of ${apkUrl} -> ${destinationUri}`);
    const downloadResult = await activeDownloadResumable.downloadAsync();
    activeDownloadResumable = null;

    if (!downloadResult || downloadResult.status !== 200) {
      await cleanupApkFile(version);
      return {
        success: false,
        error: `Download failed with HTTP status ${downloadResult?.status || "unknown"}.`,
      };
    }

    // Verify file exists and is non-empty (valid React Native release APK should be > 5MB)
    const fileInfo = await FileSystem.getInfoAsync(destinationUri);
    if (!fileInfo.exists || fileInfo.size < 100000) {
      await cleanupApkFile(version);
      return { success: false, error: "Downloaded file is incomplete or invalid APK package." };
    }

    // Verify binary APK file header magic bytes (ZIP header starts with PK\x03\x04, base64 starts with UEsDB)
    try {
      const base64Header = await FileSystem.readAsStringAsync(destinationUri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 20,
      });

      if (!base64Header || !base64Header.startsWith("UEsDB")) {
        const textHeader = await FileSystem.readAsStringAsync(destinationUri, {
          encoding: FileSystem.EncodingType.UTF8,
          length: 100,
        });

        await cleanupApkFile(version);

        if (textHeader.includes("<!DOCTYPE html") || textHeader.includes("<html") || textHeader.includes("Virus scan")) {
          return {
            success: false,
            isHtmlRedirect: true,
            error: "Google Drive requires manual confirmation for large files. Opening download in browser...",
          };
        }

        return {
          success: false,
          error: "Package Parse Error: Downloaded file is corrupted or not a valid Android APK package.",
        };
      }
    } catch (_) {}

    // Verify SHA-256 checksum if provided
    if (expectedSha256 && expectedSha256.trim().length >= 32) {
      console.log("UpdateService: Verifying SHA-256 checksum...");
      try {
        const content = await FileSystem.readAsStringAsync(destinationUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const fileDigest = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          content
        );
        if (
          fileDigest.toLowerCase().trim() !==
          expectedSha256.toLowerCase().trim()
        ) {
          await cleanupApkFile(version);
          return {
            success: false,
            error: "Security Checksum Error: APK SHA-256 verification failed.",
          };
        }
        console.log("UpdateService: SHA-256 Checksum verified successfully!");
      } catch (cryptoErr: any) {
        console.warn("UpdateService: SHA-256 check warning:", cryptoErr);
      }
    }

    return { success: true, fileUri: destinationUri };
  } catch (err: any) {
    activeDownloadResumable = null;
    await cleanupApkFile(version);
    return {
      success: false,
      error: err.message || "Failed to download update APK.",
    };
  }
}

/**
 * Cancels any active APK download in progress.
 */
export async function cancelApkDownload(version?: string): Promise<void> {
  if (activeDownloadResumable) {
    try {
      await activeDownloadResumable.cancelAsync();
    } catch (_) {}
    activeDownloadResumable = null;
  }
  if (version) {
    await cleanupApkFile(version);
  }
}

export async function verifyApkFileIntegrity(fileUri: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || info.size < 100000) return false;

    const base64Header = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 20,
    });

    return !!(base64Header && base64Header.startsWith("UEsDB"));
  } catch {
    return false;
  }
}

/**
 * Launches the native Android package installer using FileProvider content:// URI.
 */
export async function launchApkInstaller(
  fileUri: string
): Promise<{ success: boolean; error?: string; permissionRequired?: boolean }> {
  if (Platform.OS !== "android") {
    return { success: false, error: "APK installation is only supported on Android." };
  }

  try {
    const isValid = await verifyApkFileIntegrity(fileUri);
    if (!isValid) {
      console.warn("UpdateService: Cached APK is corrupt or invalid. Deleting cache...");
      await cleanupApkFile();
      return {
        success: false,
        error: "The cached update package was corrupt. Deleted cached file. Please tap Update to download again.",
      };
    }

    // Convert file:// path to content:// FileProvider URI for Android Intent
    const contentUri = await FileSystem.getContentUriAsync(fileUri);
    console.log(`UpdateService: Content URI for installer is ${contentUri}`);

    // FLAG_GRANT_READ_URI_PERMISSION (1) | FLAG_ACTIVITY_NEW_TASK (268435456)
    const flags = 1 | 268435456;

    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        flags,
        type: "application/vnd.android.package-archive",
      });
      return { success: true };
    } catch (viewErr: any) {
      console.warn("UpdateService: ACTION_VIEW failed, attempting ACTION_INSTALL_PACKAGE fallback...", viewErr);
      await IntentLauncher.startActivityAsync("android.intent.action.INSTALL_PACKAGE", {
        data: contentUri,
        flags,
        type: "application/vnd.android.package-archive",
      });
      return { success: true };
    }
  } catch (err: any) {
    console.error("UpdateService: launchApkInstaller error:", err);
    const errStr = String(err.message || err);

    if (
      errStr.includes("MANAGE_UNKNOWN_APP_SOURCES") ||
      errStr.includes("Permission") ||
      errStr.includes("not allowed")
    ) {
      return {
        success: false,
        permissionRequired: true,
        error: "Android requires permission to install apps from this source.",
      };
    }

    return {
      success: false,
      error: err.message || "Could not launch package installer.",
    };
  }
}

/**
 * Opens Android settings for enabling "Install Unknown Apps" permission.
 */
export async function openInstallPermissionSettings(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const packageName =
      Constants.expoConfig?.android?.package || "com.aruvi.play";
    await IntentLauncher.startActivityAsync(
      "android.settings.MANAGE_UNKNOWN_APP_SOURCES",
      {
        data: `package:${packageName}`,
      }
    );
  } catch (err) {
    console.error("UpdateService: openInstallPermissionSettings error:", err);
  }
}
