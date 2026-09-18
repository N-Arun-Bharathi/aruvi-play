import { Linking } from "react-native";
import Constants from "expo-constants";
import { supabase } from "./supabase";
import { APP_VERSION, APP_VERSION_CODE } from "@aruvi/shared";

export interface AppUpdateInfo {
  hasUpdate: boolean;
  versionName: string;
  versionCode: number;
  apkUrl: string;
  releaseNotes: string;
  isMandatory: boolean;
  publishedAt?: string;
  source: "supabase" | "none";
}

/**
 * Compare two semver strings (e.g. "1.0.2" vs "1.0.1")
 * Returns true if remote is strictly newer than current.
 */
export function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  if (!remoteVer || !currentVer) return false;
  const cleanRemote = remoteVer.replace(/^[vV]/, "").trim();
  const cleanCurrent = currentVer.replace(/^[vV]/, "").trim();

  const rParts = cleanRemote.split(".").map((n) => parseInt(n, 10) || 0);
  const cParts = cleanCurrent.split(".").map((n) => parseInt(n, 10) || 0);

  const len = Math.max(rParts.length, cParts.length);
  for (let i = 0; i < len; i++) {
    const r = rParts[i] ?? 0;
    const c = cParts[i] ?? 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

/**
 * Get current running app version and android versionCode
 */
export function getCurrentAppVersion(): { versionName: string; versionCode: number } {
  const versionName = APP_VERSION || Constants.expoConfig?.version || "1.0.0";
  const versionCode = APP_VERSION_CODE || Constants.expoConfig?.android?.versionCode || 1;
  return { versionName, versionCode };
}


/**
 * Fetch latest update metadata STRICTLY from the Supabase database (app_versions table)
 */
export async function checkForUpdate(): Promise<AppUpdateInfo> {
  const { versionName: currentVer, versionCode: currentCode } = getCurrentAppVersion();

  try {
    const { data, error } = await supabase
      .from("app_versions")
      .select("*")
      .order("version_code", { ascending: false })
      .limit(1);

    const latest = Array.isArray(data) ? data[0] : data;

    if (!error && latest && latest.version_name) {
      const remoteVer = String(latest.version_name).trim();
      const remoteCode = Number(latest.version_code) || 1;
      const isCodeNewer = remoteCode > currentCode;
      const isVerNewer = isNewerVersion(remoteVer, currentVer);
      const hasUpdate = isCodeNewer || isVerNewer;

      return {
        hasUpdate,
        versionName: remoteVer,
        versionCode: remoteCode,
        apkUrl: latest.apk_url || "",
        releaseNotes: latest.release_notes || "Performance improvements and regular bug fixes.",
        isMandatory: Boolean(latest.is_mandatory),
        publishedAt: latest.released_at || latest.release_date,
        source: "supabase",
      };
    }
  } catch (supabaseErr) {
    console.warn("[UpdateService] Supabase app_versions check error:", supabaseErr);
  }

  // Default up-to-date fallback
  return {
    hasUpdate: false,
    versionName: currentVer,
    versionCode: currentCode,
    apkUrl: "",
    releaseNotes: "",
    isMandatory: false,
    source: "none",
  };
}

/**
 * Formats any Google Drive or standard download URL for seamless direct downloading.
 * Supports:
 * - Google Drive share links: https://drive.google.com/file/d/FILE_ID/view...
 * - Google Drive open links: https://drive.google.com/open?id=FILE_ID
 * - Direct download links
 */
export function formatDownloadUrl(rawUrl?: string): string {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();

  // If it is a Google Drive file link: /file/d/<id>/...
  const driveFileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    const fileId = driveFileMatch[1];
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  }

  // If it is a Google Drive query link: ?id=<id> or &id=<id>
  const driveIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (trimmed.includes("drive.google.com") && driveIdMatch && driveIdMatch[1]) {
    const fileId = driveIdMatch[1];
    return `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
  }

  return trimmed;
}

/**
 * Launch the APK download in the device browser
 */
export async function installUpdate(apkUrl?: string): Promise<boolean> {
  const targetUrl = formatDownloadUrl(apkUrl);
  if (!targetUrl) return false;
  try {
    await Linking.openURL(targetUrl);
    return true;
  } catch (e) {
    console.error("[UpdateService] Failed to open download link:", e);
    return false;
  }
}

/**
 * Subscribe to realtime updates on the app_versions table in Supabase
 */
export function subscribeToAppUpdates(onUpdate: () => void) {
  try {
    const channel = supabase
      .channel("app_versions_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_versions",
        },
        (payload: any) => {
          console.log("[UpdateService] Realtime update event received from DB:", payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  } catch (err) {
    console.warn("[UpdateService] Realtime subscription error:", err);
    return () => {};
  }
}

