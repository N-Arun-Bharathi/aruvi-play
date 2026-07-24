import { supabase } from "./supabase";
import Constants from "expo-constants";
import { Alert, Linking } from "react-native";

export interface VersionInfo {
  versionName: string;
  versionCode: number;
  apkUrl: string;
  releaseNotes: string;
  minimumSupportedVersion: number;
  isMandatory: boolean;
}

/**
 * Checks for app updates against Supabase table 'app_versions'
 */
export async function checkForAppUpdates(): Promise<{
  updateAvailable: boolean;
  isMandatory: boolean;
  latestVersion: VersionInfo | null;
}> {
  try {
    // 1. Get current local app version info
    const currentVersionName = Constants.expoConfig?.version || "1.0.0";
    // Default fallback to 1 if version code is undefined
    const currentVersionCode = Constants.expoConfig?.android?.versionCode || 1;

    console.log(`UpdatesService: Current Installed Version is ${currentVersionName} (code ${currentVersionCode})`);

    // 2. Fetch the latest release from Supabase
    const { data: latestRelease, error } = await supabase
      .from("app_versions")
      .select("*")
      .order("version_code", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("UpdatesService: Failed to fetch app versions from Supabase:", error);
      return { updateAvailable: false, isMandatory: false, latestVersion: null };
    }

    if (!latestRelease) {
      console.log("UpdatesService: No releases found in app_versions database table.");
      return { updateAvailable: false, isMandatory: false, latestVersion: null };
    }

    const latestVersion: VersionInfo = {
      versionName: latestRelease.version_name,
      versionCode: latestRelease.version_code,
      apkUrl: latestRelease.apk_url,
      releaseNotes: latestRelease.release_notes || "No release notes provided.",
      minimumSupportedVersion: latestRelease.minimum_supported_version || 1,
      isMandatory: latestRelease.is_mandatory || false,
    };

    // 3. Compare version codes
    if (latestVersion.versionCode > currentVersionCode) {
      const isMandatory = 
        latestVersion.isMandatory || 
        currentVersionCode < latestVersion.minimumSupportedVersion;

      console.log(`UpdatesService: Update Available! Latest version code ${latestVersion.versionCode} is newer. Mandatory: ${isMandatory}`);

      return {
        updateAvailable: true,
        isMandatory,
        latestVersion,
      };
    }

    return {
      updateAvailable: false,
      isMandatory: false,
      latestVersion: null,
    };
  } catch (err) {
    console.error("UpdatesService: Error during update check:", err);
    return {
      updateAvailable: false,
      isMandatory: false,
      latestVersion: null,
    };
  }
}

/**
 * Helper to show the update popup or alert
 */
export async function runUpdateCheckFlow(manual = false): Promise<void> {
  const result = await checkForAppUpdates();
  
  if (!result.updateAvailable) {
    if (manual) {
      Alert.alert("Aruvi Play Up-To-Date", "You are already using the latest version of Aruvi Play.");
    }
    return;
  }

  const { isMandatory, latestVersion } = result;
  if (!latestVersion) return;

  const currentVersionName = Constants.expoConfig?.version || "1.0.0";

  if (isMandatory) {
    // Show blocking alert (since React Native modal can be custom, we do a persistent Alert that loops until they click update)
    const showBlockAlert = () => {
      Alert.alert(
        "Mandatory Update Required Required",
        `A critical update is required to continue using Aruvi Play.\n\nInstalled: v${currentVersionName}\nLatest: v${latestVersion.versionName}\n\nRelease Notes: ${latestVersion.releaseNotes}`,
        [
          {
            text: "Update Now",
            onPress: async () => {
              await Linking.openURL(latestVersion.apkUrl);
              // Loop to keep blocking
              showBlockAlert();
            }
          }
        ],
        { cancelable: false }
      );
    };
    showBlockAlert();
  } else {
    // Optional update
    Alert.alert(
      "App Update Available",
      `A new version of Aruvi Play is available.\n\nInstalled: v${currentVersionName}\nLatest: v${latestVersion.versionName}\n\nRelease Notes: ${latestVersion.releaseNotes}\n\nWould you like to update now?`,
      [
        { text: "Later", style: "cancel" },
        {
          text: "Update",
          onPress: () => {
            Linking.openURL(latestVersion.apkUrl);
          }
        }
      ]
    );
  }
}
