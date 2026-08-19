import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "../../components/Icon";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { SongRow } from "../../components/SongRow";
import { useAuthStore } from "../../store/authStore";
import { useLibraryStore } from "../../store/likedStore";
import { usePlayerStore } from "../../store/playerStore";
import { useTheme } from "../../utils/theme";
import { useSettingsStore } from "../../store/settingsStore";

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const settingsTheme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const authMode = useAuthStore((s) => s.authMode);
  const userProfile = useAuthStore((s) => s.userProfile);
  const secretKeyUnlocked = useAuthStore((s) => s.secretKeyUnlocked);
  const verifyAndUnlockSecretKey = useAuthStore((s) => s.verifyAndUnlockSecretKey);
  const upgradeGuestAccount = useAuthStore((s) => s.upgradeGuestAccount);
  const logout = useAuthStore((s) => s.logout);

  const liked = useLibraryStore((s) => s.liked);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);

  const currentSong = usePlayerStore((s) => s.current);
  const playSong = usePlayerStore((s) => s.playSong);

  const bottomPadding = currentSong ? 210 : 150;

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [savePassword, setSavePassword] = useState("");
  const [saveFavourites, setSaveFavourites] = useState(true);

  // Secret Key input states
  const [secretInput, setSecretInput] = useState("");
  const [secretError, setSecretError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSecretText, setShowSecretText] = useState(false);

  // App Update System States
  const [updateInfo, setUpdateInfo] = useState<any | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<any | null>(null);
  const [downloadedFileUri, setDownloadedFileUri] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [permissionRequired, setPermissionRequired] = useState(false);

  const isDark = settingsTheme === "dark" || (settingsTheme === "system" && theme.id === "dark");
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const isAdmin = userProfile?.isAdmin === true || userProfile?.is_owner === true;

  // Auto-check for updates on Profile screen mount
  React.useEffect(() => {
    let isMounted = true;
    const fetchUpdateStatus = async () => {
      try {
        const { checkForAppUpdates, checkDownloadedApkExists } = require("../../services/updateService");
        const res = await checkForAppUpdates(false);
        if (isMounted) {
          setUpdateInfo(res);
          if (res.error) setUpdateError(res.error);
          if (res.updateAvailable && res.latestVersion) {
            const existingUri = await checkDownloadedApkExists(res.latestVersion);
            if (existingUri && isMounted) {
              setDownloadedFileUri(existingUri);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) setUpdateError("Unable to check for updates");
      }
    };
    fetchUpdateStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualCheck = async () => {
    setIsCheckingUpdate(true);
    setUpdateError(null);
    setPermissionRequired(false);
    try {
      const { checkForAppUpdates, checkDownloadedApkExists } = require("../../services/updateService");
      const res = await checkForAppUpdates(true); // force refresh
      setUpdateInfo(res);
      if (res.error) {
        setUpdateError(res.error);
      } else if (res.updateAvailable && res.latestVersion) {
        const existingUri = await checkDownloadedApkExists(res.latestVersion);
        if (existingUri) {
          setDownloadedFileUri(existingUri);
        }
      } else if (!res.updateAvailable) {
        Alert.alert("Aruvi Play Up-To-Date", `You are using the latest version of Aruvi Play (v${res.currentVersion}).`);
      }
    } catch (err: any) {
      setUpdateError("Unable to check for updates");
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleStartDownload = async () => {
    if (!updateInfo?.apkUrl || !updateInfo?.latestVersion) return;

    setIsDownloading(true);
    setUpdateError(null);
    setPermissionRequired(false);
    setDownloadProgress({ progressPercent: 0, downloadedMB: "0 MB", totalMB: "..." });

    try {
      const { downloadApkUpdate, launchApkInstaller } = require("../../services/updateService");
      const result = await downloadApkUpdate(
        updateInfo.apkUrl,
        updateInfo.latestVersion,
        (progress: any) => {
          setDownloadProgress(progress);
        },
        updateInfo.sha256
      );

      setIsDownloading(false);

      if (result.success && result.fileUri) {
        setDownloadedFileUri(result.fileUri);
        // Automatically launch installer upon download completion
        const installRes = await launchApkInstaller(result.fileUri);
        if (installRes.permissionRequired) {
          setPermissionRequired(true);
        } else if (!installRes.success) {
          setUpdateError(installRes.error || "Installation launch failed");
        }
      } else if (result.isHtmlRedirect && updateInfo.apkUrl) {
        setUpdateError("Google Drive requires manual confirmation. Opening download in browser...");
        Linking.openURL(updateInfo.apkUrl).catch(() => {});
      } else {
        setUpdateError(result.error || "Download failed");
      }
    } catch (err: any) {
      setIsDownloading(false);
      setUpdateError(err.message || "Download failed");
    }
  };

  const handleCancelDownload = async () => {
    try {
      const { cancelApkDownload } = require("../../services/updateService");
      await cancelApkDownload(updateInfo?.latestVersion);
    } catch (_) {}
    setIsDownloading(false);
    setDownloadProgress(null);
  };

  const handleInstallDownloadedApk = async (uri: string) => {
    setUpdateError(null);
    setPermissionRequired(false);
    try {
      const { launchApkInstaller } = require("../../services/updateService");
      const res = await launchApkInstaller(uri);
      if (res.permissionRequired) {
        setPermissionRequired(true);
      } else if (!res.success) {
        setUpdateError(res.error || "Failed to launch installer");
      }
    } catch (err: any) {
      setUpdateError(err.message || "Installation failed");
    }
  };

  const handleOpenPermissionSettings = async () => {
    try {
      const { openInstallPermissionSettings } = require("../../services/updateService");
      await openInstallPermissionSettings();
    } catch (_) {}
  };

  const handleUnlockSecretKey = async () => {
    setSecretError("");
    const cleanCode = secretInput.trim();
    if (!cleanCode) {
      setSecretError("Please enter a secret key.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyAndUnlockSecretKey(cleanCode);
      if (!res.success) {
        setSecretError(res.message || "Invalid secret code. Please try again.");
      } else {
        setSecretInput("");
      }
    } catch (err: any) {
      setSecretError("Failed to verify secret code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasteSecret = async () => {
    try {
      const Clipboard = require("expo-clipboard");
      const text = await Clipboard.getStringAsync();
      if (text) {
        setSecretInput(text.trim());
        if (secretError) setSecretError("");
      }
    } catch (_) {}
  };

  const renderSecretKeySection = () => {
    // Only render secret key / unlocked content for guest users
    if (!userProfile?.is_guest) return null;

    if (authMode === "loading") {
      return (
        <View
          className="mx-5 mb-5 p-5 rounded-3xl border items-center justify-center"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <ActivityIndicator size="small" color={theme.accent} />
          <Text className="text-xs font-semibold mt-2" style={{ color: theme.secondaryText }}>
            Checking profile authorization...
          </Text>
        </View>
      );
    }

    if (secretKeyUnlocked) {
      return (
        <View
          className="mx-5 mb-5 p-5 rounded-3xl border shadow-sm"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 pr-2">
              <View className="w-10 h-10 rounded-2xl items-center justify-center mr-3 bg-red-500/15 border border-red-500/20">
                <Icon name="heart-filled" size={20} color="#EF4444" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-base font-bold mr-2" style={{ color: theme.primaryText }}>
                    Protected Liked Songs
                  </Text>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.accent}20` }}>
                    <Text className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: theme.accent }}>
                      Secret Unlocked
                    </Text>
                  </View>
                </View>
                <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }}>
                  {liked.length} {liked.length === 1 ? "song" : "songs"} in protected library
                </Text>
              </View>
            </View>

            {liked.length > 0 && (
              <Pressable
                onPress={() => playSong(liked[0], liked)}
                className="px-3.5 py-2 rounded-xl bg-accent flex-row items-center active:opacity-80"
              >
                <Icon name="play" size={14} color="#000000" />
                <Text className="text-xs font-bold text-black ml-1.5">Play All</Text>
              </Pressable>
            )}
          </View>

          {liked.length > 0 ? (
            <View className="mt-1">
              {liked.slice(0, 10).map((song, index) => (
                <SongRow
                  key={song.id || index}
                  song={song}
                  onPress={() => playSong(song, liked)}
                  liked={isLiked(song)}
                  onLike={() => toggleLike(song)}
                />
              ))}
              {liked.length > 10 && (
                <Pressable
                  onPress={() => router.push("/(tabs)/library" as any)}
                  className="py-2.5 items-center justify-center border-t border-white/5 mt-2"
                >
                  <Text className="text-xs font-bold" style={{ color: theme.accent }}>
                    View all {liked.length} songs in Library →
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            <Text className="text-xs py-4 text-center" style={{ color: theme.secondaryText }}>
              No liked songs found in your library yet.
            </Text>
          )}
        </View>
      );
    }

    return (
      <View
        className="mx-5 mb-5 p-5 rounded-3xl border shadow-sm"
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
      >
        <View className="flex-row items-center mb-3">
          <View className="w-10 h-10 rounded-2xl items-center justify-center mr-3 bg-amber-500/10 border border-amber-500/20">
            <Icon name="lock" size={20} color="#F59E0B" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold" style={{ color: theme.primaryText }}>
              Protected Liked Songs
            </Text>
            <Text className="text-xs mt-0.5 leading-relaxed" style={{ color: theme.secondaryText }}>
              Enter your secret access code below to unlock the protected Liked Songs section.
            </Text>
          </View>
        </View>

        <View className="mt-3">
          <View
            className="flex-row items-center rounded-2xl border px-3"
            style={{
              backgroundColor: theme.elevatedSurface,
              borderColor: secretError ? "#EF4444" : theme.border,
            }}
          >
            <TextInput
              value={secretInput}
              onChangeText={(txt) => {
                setSecretInput(txt);
                if (secretError) setSecretError("");
              }}
              placeholder="Paste secret code here..."
              placeholderTextColor={theme.mutedText}
              secureTextEntry={!showSecretText}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 py-3 text-sm"
              style={{ color: theme.primaryText }}
            />

            {secretInput.length > 0 && (
              <Pressable
                onPress={() => setShowSecretText(!showSecretText)}
                className="p-2 mr-1"
              >
                <Icon name={showSecretText ? "eye-off" : "eye"} size={16} color={theme.secondaryText} />
              </Pressable>
            )}

            <Pressable
              onPress={handlePasteSecret}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 active:bg-white/10"
            >
              <Text className="text-[11px] font-semibold text-white">Paste</Text>
            </Pressable>
          </View>

          {secretError ? (
            <View className="flex-row items-center mt-2.5 px-1">
              <Icon name="alert" size={14} color="#EF4444" />
              <Text className="text-xs font-semibold text-red-400 ml-1.5 flex-1">
                {secretError}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleUnlockSecretKey}
            disabled={isVerifying}
            className="mt-4 py-3 rounded-2xl bg-accent items-center justify-center active:opacity-80 flex-row"
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Icon name="unlock" size={16} color="#000000" />
                <Text className="text-black font-extrabold text-xs ml-2">
                  Unlock Protected Content
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <AppScreen edges={["top"]}>
      <AppHeader title="Profile & Settings" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* User Card Frame */}
        <View
          className="mx-5 my-5 p-5 rounded-3xl border flex-row items-center relative overflow-hidden shadow-sm"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <ProfileAvatar size={68} />

          <View className="flex-1 ml-4 justify-center">
            <Text className="text-lg font-bold" style={{ color: theme.primaryText }}>
              {userProfile?.name || "Guest User"}
            </Text>
            <Text className="text-xs font-semibold mt-0.5" style={{ color: theme.secondaryText }}>
              {userProfile?.email || (userProfile?.is_guest ? "Temporary Guest Session" : "Free Sync Active")}
            </Text>
            <View className="flex-row mt-2.5">
              <View
                className="px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: isAdmin
                    ? `${theme.accent}15`
                    : userProfile?.is_guest
                    ? `${theme.warning}15`
                    : theme.elevatedSurface,
                }}
              >
                <Text
                  className="text-[9px] font-extrabold uppercase tracking-wider"
                  style={{
                    color: isAdmin
                      ? theme.accent
                      : userProfile?.is_guest
                      ? theme.warning
                      : theme.secondaryText,
                  }}
                >
                  {isAdmin
                    ? "Admin"
                    : userProfile?.is_guest
                    ? "Guest Account"
                    : "Registered User"}
                </Text>
              </View>
            </View>
          </View>

          {!userProfile?.is_guest && (
            <Pressable
              onPress={() => router.push("/profile/edit" as any)}
              className="p-2.5 bg-white/5 rounded-full border border-white/5 active:bg-white/10"
            >
              <Icon name="edit" size={16} color={theme.accent} />
            </Pressable>
          )}
        </View>

        {/* Quick Dark / Light Theme Switch Card */}
        <View
          className="mx-5 mb-5 p-5 rounded-3xl border flex-row items-center justify-between shadow-sm"
          style={{ backgroundColor: theme.glassCard, borderColor: theme.glassBorder }}
        >
          <View className="flex-row items-center flex-1 pr-3">
            <View 
              className="w-10 h-10 rounded-2xl items-center justify-center mr-3 border"
              style={{ backgroundColor: theme.accentMuted, borderColor: theme.glassBorder }}
            >
              <Icon name={isDark ? "moon" : "sun"} size={20} color={theme.accent} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold" style={{ color: theme.primaryText }}>
                {isDark ? "Dark Theme" : "Light Theme"}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }}>
                {isDark ? "Sleek obsidian glassmorphism mode" : "Luminous bright daylight mode"}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={toggleTheme}
            className="px-4 py-2.5 rounded-2xl border flex-row items-center active:opacity-80 shadow-sm"
            style={{ backgroundColor: theme.accent, borderColor: theme.accent }}
          >
            <Icon name={isDark ? "sun" : "moon"} size={16} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white ml-2">
              {isDark ? "Light" : "Dark"} Mode
            </Text>
          </Pressable>
        </View>

        {/* SECRET KEY / UNLOCKED LIKED SONGS SECTION (GUEST / SECRET ACCESS ONLY) */}
        {renderSecretKeySection()}

        {/* Guest Banner Actions */}
        {userProfile?.is_guest ? (
          <View className="mx-5 mb-5 p-5 rounded-3xl border bg-amber-500/10 border-amber-500/30">
            <Text className="text-sm font-bold text-amber-400 mb-1">
              Guest Mode Active
            </Text>
            <Text className="text-xs text-amber-200/80 leading-relaxed mb-4">
              Your queue and temporary favourites are stored locally. Save your account to sync across devices permanently.
            </Text>

            <View className="flex-row space-x-3">
              <Pressable
                onPress={() => setShowSaveModal(true)}
                className="flex-1 py-3 rounded-2xl bg-accent items-center justify-center"
              >
                <Text className="text-black font-extrabold text-xs">Save My Account</Text>
              </Pressable>

              <Pressable
                onPress={logout}
                className="py-3 px-4 rounded-2xl bg-white/10 border border-white/10 items-center justify-center"
              >
                <Text className="text-white font-bold text-xs">Logout Session</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Registered User Logout */
          <View className="mx-5 mb-5">
            <Pressable
              onPress={logout}
              className="py-3.5 px-4 rounded-2xl border border-red-500/30 bg-red-500/10 items-center justify-center flex-row"
            >
              <Icon name="close" size={16} color="#EF4444" />
              <Text className="text-red-400 font-bold text-sm ml-2">Log Out of Account</Text>
            </Pressable>
          </View>
        )}

        {/* App Updates Card */}
        <View
          className="mx-5 mb-6 p-5 rounded-3xl border shadow-sm"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View
                className="w-9 h-9 rounded-2xl items-center justify-center mr-2.5 border"
                style={{ backgroundColor: `${theme.accent}15`, borderColor: `${theme.accent}30` }}
              >
                <Icon name="refresh" size={18} color={theme.accent} />
              </View>
              <Text className="text-base font-bold" style={{ color: theme.primaryText }}>
                App Updates
              </Text>
            </View>

            {updateInfo?.updateAvailable ? (
              <View className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex-row items-center">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                <Text className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider">
                  Update Available
                </Text>
              </View>
            ) : (
              <View className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 flex-row items-center">
                <Icon name="check" size={12} color={theme.accent} />
                <Text className="text-[10px] font-extrabold text-white ml-1 tracking-wider">
                  v{updateInfo?.currentVersion || "1.3.0"}
                </Text>
              </View>
            )}
          </View>

          {/* State 1: Downloading in Progress */}
          {isDownloading ? (
            <View className="mt-2">
              <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>
                Updating Aruvi Play
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }}>
                Downloading v{updateInfo?.latestVersion}
              </Text>

              {/* Progress Bar Container */}
              <View className="w-full h-3 rounded-full bg-white/10 overflow-hidden my-3">
                <View
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${downloadProgress?.progressPercent || 0}%` }}
                />
              </View>

              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-xs font-bold" style={{ color: theme.accent }}>
                  {downloadProgress?.progressPercent || 0}%
                </Text>
                <Text className="text-xs font-semibold" style={{ color: theme.secondaryText }}>
                  {downloadProgress?.downloadedMB || "0 MB"} / {downloadProgress?.totalMB || "? MB"}
                </Text>
              </View>

              <Pressable
                onPress={handleCancelDownload}
                className="py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 items-center justify-center active:opacity-80"
              >
                <Text className="text-xs font-bold text-red-400">Cancel Download</Text>
              </Pressable>
            </View>
          ) : permissionRequired ? (
            /* State 2: Permission Required */
            <View className="mt-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <View className="flex-row items-center mb-2">
                <Icon name="alert" size={16} color="#F59E0B" />
                <Text className="text-xs font-bold text-amber-400 ml-1.5">
                  Allow APK Installation
                </Text>
              </View>
              <Text className="text-xs text-amber-200/80 leading-relaxed mb-3">
                Android requires permission to install updates from Aruvi Play.
              </Text>
              <Pressable
                onPress={handleOpenPermissionSettings}
                className="py-2.5 rounded-xl bg-amber-500 items-center justify-center active:opacity-80"
              >
                <Text className="text-xs font-extrabold text-black">Open Settings</Text>
              </Pressable>
            </View>
          ) : downloadedFileUri ? (
            /* State 3: Ready to Install */
            <View className="mt-2">
              <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>
                Update Downloaded
              </Text>
              <Text className="text-xs mt-0.5 mb-3" style={{ color: theme.secondaryText }}>
                v{updateInfo?.latestVersion} is ready to install.
              </Text>
              <Pressable
                onPress={() => handleInstallDownloadedApk(downloadedFileUri)}
                className="py-3 rounded-2xl bg-accent items-center justify-center active:opacity-80 flex-row"
              >
                <Icon name="check" size={16} color="#000000" />
                <Text className="text-xs font-extrabold text-black ml-2">Install Update Now</Text>
              </Pressable>
            </View>
          ) : updateInfo?.updateAvailable ? (
            /* State 4: Update Available */
            <View className="mt-2">
              <View className="flex-row items-center justify-between py-2 px-3 rounded-2xl bg-white/5 border border-white/10 mb-3">
                <View>
                  <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: theme.mutedText }}>
                    Current Version
                  </Text>
                  <Text className="text-xs font-bold" style={{ color: theme.primaryText }}>
                    v{updateInfo.currentVersion}
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color={theme.mutedText} />
                <View>
                  <Text className="text-[10px] uppercase font-bold tracking-wider" style={{ color: theme.accent }}>
                    Latest Version
                  </Text>
                  <Text className="text-xs font-extrabold" style={{ color: theme.accent }}>
                    v{updateInfo.latestVersion}
                  </Text>
                </View>
              </View>

              {/* Release Notes List */}
              {updateInfo.releaseNotes.length > 0 && (
                <View className="mb-4 px-1">
                  <Text className="text-xs font-bold mb-1.5" style={{ color: theme.primaryText }}>
                    What&apos;s New in v{updateInfo.latestVersion}:
                  </Text>
                  {updateInfo.releaseNotes.map((note: string, idx: number) => (
                    <View key={idx} className="flex-row items-start mb-1">
                      <Text className="text-xs mr-2" style={{ color: theme.accent }}>•</Text>
                      <Text className="text-xs flex-1 leading-relaxed" style={{ color: theme.secondaryText }}>
                        {note}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <Pressable
                onPress={handleStartDownload}
                className="py-3 rounded-2xl bg-accent items-center justify-center active:opacity-80 flex-row shadow-sm"
              >
                <Icon name="download" size={16} color="#000000" />
                <Text className="text-xs font-extrabold text-black ml-2">
                  Update Latest Version (v{updateInfo.latestVersion})
                </Text>
              </Pressable>
            </View>
          ) : (
            /* State 5: Up to Date or Idle */
            <View className="mt-2">
              <View className="flex-row items-center mb-3">
                <View className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 items-center justify-center mr-2">
                  <Icon name="check" size={12} color="#10B981" />
                </View>
                <Text className="text-xs font-bold text-emerald-400">
                  Aruvi Play v{updateInfo?.currentVersion || "1.3.0"} • You&apos;re up to date
                </Text>
              </View>

              {updateError && (
                <Text className="text-xs text-amber-400 mb-2">
                  {updateError}
                </Text>
              )}

              <Pressable
                onPress={handleManualCheck}
                disabled={isCheckingUpdate}
                className="py-3 rounded-xl border items-center bg-white/5 border-white/10 active:bg-white/10 flex-row justify-center"
              >
                {isCheckingUpdate ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Text className="text-xs font-bold text-white">Check for Updates</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Save Account Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowSaveModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "padding"} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}
            keyboardShouldPersistTaps="handled"
            className="bg-black/80"
          >
            <View className="p-6 rounded-3xl border my-auto" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
              <Text className="text-lg font-bold mb-1" style={{ color: theme.primaryText }}>
                Save Your Account
              </Text>
              <Text className="text-xs mb-4 leading-relaxed" style={{ color: theme.secondaryText }}>
                Register your email and password to sync your queue, favourites, and settings across devices.
              </Text>

              <TextInput
                value={saveEmail}
                onChangeText={setSaveEmail}
                placeholder="Enter email address"
                placeholderTextColor={theme.mutedText}
                keyboardType="email-address"
                autoCapitalize="none"
                className="px-4 py-3 rounded-2xl border mb-3 text-sm"
                style={{
                  backgroundColor: theme.elevatedSurface,
                  borderColor: theme.border,
                  color: theme.primaryText,
                }}
              />
              <TextInput
                value={savePassword}
                onChangeText={setSavePassword}
                placeholder="Enter password (6+ chars)"
                placeholderTextColor={theme.mutedText}
                secureTextEntry
                className="px-4 py-3 rounded-2xl border mb-4 text-sm"
                style={{
                  backgroundColor: theme.elevatedSurface,
                  borderColor: theme.border,
                  color: theme.primaryText,
                }}
              />

              <Pressable
                onPress={() => setSaveFavourites(!saveFavourites)}
                className="flex-row items-center mb-6"
              >
                <View
                  className="w-5 h-5 rounded-md border items-center justify-center mr-3"
                  style={{
                    backgroundColor: saveFavourites ? theme.accent : theme.elevatedSurface,
                    borderColor: saveFavourites ? theme.accent : theme.border,
                  }}
                >
                  {saveFavourites && <Icon name="check" size={14} color="#000000" />}
                </View>
                <Text className="text-xs font-semibold" style={{ color: theme.primaryText }}>
                  Save temporary guest favourites to my new account
                </Text>
              </Pressable>

              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => setShowSaveModal(false)}
                  className="flex-1 py-3 rounded-2xl items-center border"
                  style={{ backgroundColor: theme.elevatedSurface, borderColor: theme.border }}
                >
                  <Text className="font-bold text-xs" style={{ color: theme.primaryText }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (saveEmail.includes("@") && savePassword.length >= 6) {
                      const success = await upgradeGuestAccount({
                        email: saveEmail,
                        password: savePassword,
                        saveFavourites,
                      });
                      if (success) setShowSaveModal(false);
                    } else {
                      Alert.alert("Invalid Input", "Please enter a valid email and 6+ character password.");
                    }
                  }}
                  className="flex-1 py-3 rounded-2xl items-center bg-accent"
                >
                  <Text className="font-bold text-xs text-black">Save Account</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
  );
}
