import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
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
import { useUpdateStore } from "../../store/updateStore";
import { getCurrentAppVersion } from "../../services/updateService";

const SUPPORTED_LANGUAGES = [
  { id: "tamil", label: "Tamil", native: "தமிழ்" },
  { id: "telugu", label: "Telugu", native: "తెలుగు" },
  { id: "hindi", label: "Hindi", native: "हिंदी" },
  { id: "malayalam", label: "Malayalam", native: "മലയാളം" },
  { id: "kannada", label: "Kannada", native: "ಕನ್ನಡ" },
  { id: "english", label: "English", native: "English" },
  { id: "punjabi", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const settingsTheme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const languages = useSettingsStore((s) => s.languages);
  const setLanguages = useSettingsStore((s) => s.setLanguages);

  const activeLanguage = languages[0] || "tamil";

  const handleSelectLanguage = async (langId: string) => {
    await setLanguages([langId]);
    try {
      const { clearSearchCache } = require("../../services/saavn");
      clearSearchCache();
    } catch (e) {}
    const { useToastStore } = require("../../store/toastStore");
    const langObj = SUPPORTED_LANGUAGES.find((l) => l.id === langId);
    useToastStore.getState().show(`1st priority language set to ${langObj?.label || langId}`);
  };

  const authMode = useAuthStore((s) => s.authMode);
  const userProfile = useAuthStore((s) => s.userProfile);
  const secretKeyUnlocked = useAuthStore((s) => s.secretKeyUnlocked);
  const verifyAndUnlockSecretKey = useAuthStore((s) => s.verifyAndUnlockSecretKey);
  const upgradeGuestAccount = useAuthStore((s) => s.upgradeGuestAccount);
  const logout = useAuthStore((s) => s.logout);

  const liked = useLibraryStore((s) => s.liked);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const restoreCuratedLikedSongs = useLibraryStore((s) => s.restoreCuratedLikedSongs);

  const currentSong = usePlayerStore((s) => s.current);
  const playSong = usePlayerStore((s) => s.playSong);

  const updateInfo = useUpdateStore((s) => s.updateInfo);
  const isCheckingUpdate = useUpdateStore((s) => s.isChecking);
  const checkUpdate = useUpdateStore((s) => s.checkUpdate);
  const installUpdateAction = useUpdateStore((s) => s.install);
  const openUpdateModal = useUpdateStore((s) => s.openModal);

  const { versionName: currentVersion, versionCode: currentVersionCode } = getCurrentAppVersion();
  const bottomPadding = currentSong ? 210 : 140;

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [savePassword, setSavePassword] = useState("");
  const [saveFavourites, setSaveFavourites] = useState(true);

  // Secret Key input states
  const [secretInput, setSecretInput] = useState("");
  const [secretError, setSecretError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSecretText, setShowSecretText] = useState(false);

  const isDark = settingsTheme === "dark" || (settingsTheme === "system" && theme.id === "dark");
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const isAdmin = userProfile?.isAdmin === true || userProfile?.is_owner === true || (userProfile?.is_owner as any) === 1 || (userProfile?.is_owner as any) === "true";

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
    if (!userProfile?.is_guest) return null;

    if (authMode === "loading") {
      return (
        <View
          className="mx-5 mb-4 p-4 rounded-2xl border items-center justify-center"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <ActivityIndicator size="small" color={theme.accent} />
          <Text className="text-xs font-semibold mt-2" style={{ color: theme.secondaryText }}>
            Checking authorization...
          </Text>
        </View>
      );
    }

    if (secretKeyUnlocked) {
      return (
        <View
          className="mx-5 mb-4 p-4 rounded-3xl border shadow-sm"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1 pr-2">
              <View className="w-9 h-9 rounded-xl items-center justify-center mr-2.5 bg-red-500/15 border border-red-500/20">
                <Icon name="heart-filled" size={18} color="#EF4444" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-sm font-bold mr-2" style={{ color: theme.primaryText }}>
                    Protected Liked Songs
                  </Text>
                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.accent}20` }}>
                    <Text className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: theme.accent }}>
                      Unlocked
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] mt-0.5" style={{ color: theme.secondaryText }}>
                  {liked.length} {liked.length === 1 ? "song" : "songs"}
                </Text>
              </View>
            </View>

            {liked.length > 0 && (
              <Pressable
                onPress={() => playSong(liked[0], liked)}
                className="px-3 py-1.5 rounded-xl bg-accent flex-row items-center active:opacity-80"
              >
                <Icon name="play" size={12} color="#000000" />
                <Text className="text-xs font-bold text-black ml-1">Play</Text>
              </Pressable>
            )}
          </View>

          {liked.length > 0 ? (
            <View className="mt-1">
              {liked.slice(0, 5).map((song, index) => (
                <SongRow
                  key={song.id || index}
                  song={song}
                  onPress={() => playSong(song, liked)}
                  liked={isLiked(song)}
                  onLike={() => toggleLike(song)}
                />
              ))}
              {liked.length > 5 && (
                <Pressable
                  onPress={() => router.push("/(tabs)/library" as any)}
                  className="py-2 items-center justify-center border-t border-white/5 mt-1"
                >
                  <Text className="text-xs font-bold" style={{ color: theme.accent }}>
                    View all {liked.length} songs →
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
      );
    }

    return (
      <View
        className="mx-5 mb-4 p-4 rounded-3xl border shadow-sm"
        style={{ backgroundColor: theme.card, borderColor: theme.border }}
      >
        <View className="flex-row items-center mb-2.5">
          <View className="w-8 h-8 rounded-xl items-center justify-center mr-2.5 bg-amber-500/10 border border-amber-500/20">
            <Icon name="lock" size={16} color="#F59E0B" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>
              Protected Access
            </Text>
            <Text className="text-[11px] mt-0.5" style={{ color: theme.secondaryText }}>
              Enter secret code to unlock protected library
            </Text>
          </View>
        </View>

        <View className="mt-2">
          <View
            className="flex-row items-center rounded-xl border px-3"
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
              placeholder="Enter secret key..."
              placeholderTextColor={theme.mutedText}
              secureTextEntry={!showSecretText}
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 py-2.5 text-xs"
              style={{ color: theme.primaryText }}
            />

            {secretInput.length > 0 && (
              <Pressable
                onPress={() => setShowSecretText(!showSecretText)}
                className="p-1.5 mr-1"
              >
                <Icon name={showSecretText ? "eye-off" : "eye"} size={15} color={theme.secondaryText} />
              </Pressable>
            )}

            <Pressable
              onPress={handlePasteSecret}
              className="px-2 py-1 rounded-md bg-white/5 border border-white/10 active:bg-white/10"
            >
              <Text className="text-[10px] font-semibold text-white">Paste</Text>
            </Pressable>
          </View>

          {secretError ? (
            <Text className="text-[11px] font-semibold text-red-400 mt-1 px-1">
              {secretError}
            </Text>
          ) : null}

          <Pressable
            onPress={handleUnlockSecretKey}
            disabled={isVerifying}
            className="mt-2.5 py-2.5 rounded-xl bg-accent items-center justify-center active:opacity-80 flex-row"
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Icon name="unlock" size={14} color="#000000" />
                <Text className="text-black font-extrabold text-xs ml-1.5">
                  Unlock
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
      {/* ── Top Header with Theme Toggle Icon Only ───────────────── */}
      <AppHeader
        title="Profile"
        rightActions={
          <Pressable
            onPress={toggleTheme}
            hitSlop={10}
            className="w-10 h-10 rounded-full border items-center justify-center active:scale-90"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.12)",
            }}
          >
            <Icon name={isDark ? "sun" : "moon"} size={18} color={theme.accent} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPadding, paddingTop: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* ── 1. User Info Glass Card ──────────────────────────────── */}
        <View
          className="mx-5 mb-4 p-4 rounded-3xl border flex-row items-center shadow-sm"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <ProfileAvatar size={56} />

          <View className="flex-1 ml-3.5 justify-center">
            <Text className="text-base font-extrabold tracking-tight" style={{ color: theme.primaryText }}>
              {userProfile?.name || "Guest User"}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }}>
              {userProfile?.email || (userProfile?.is_guest ? "Temporary Session" : "Free Sync Active")}
            </Text>

            <View className="flex-row mt-2">
              <View
                className="px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: isAdmin
                    ? `${theme.accent}20`
                    : userProfile?.is_guest
                    ? `${theme.warning}15`
                    : `${theme.accent}15`,
                }}
              >
                <Text
                  className="text-[9px] font-black uppercase tracking-wider"
                  style={{
                    color: isAdmin
                      ? theme.accent
                      : userProfile?.is_guest
                      ? theme.warning
                      : theme.accent,
                  }}
                >
                  {isAdmin
                    ? "Admin"
                    : userProfile?.is_guest
                    ? "Guest Mode"
                    : "Aruvi Member"}
                </Text>
              </View>
            </View>
          </View>

          {!userProfile?.is_guest && (
            <Pressable
              onPress={() => router.push("/profile/edit" as any)}
              className="w-9 h-9 rounded-full bg-white/5 border border-white/10 items-center justify-center active:bg-white/10"
            >
              <Icon name="edit" size={15} color={theme.accent} />
            </Pressable>
          )}
        </View>

        {/* ── Admin Management Tools ──────────────────────────────── */}
        {isAdmin && (
          <View
            className="mx-5 mb-4 p-4 rounded-3xl border shadow-sm"
            style={{ backgroundColor: `${theme.accent}08`, borderColor: `${theme.accent}30` }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 pr-2">
                <View
                  className="w-8 h-8 rounded-xl items-center justify-center mr-2.5 border"
                  style={{ backgroundColor: `${theme.accent}20`, borderColor: `${theme.accent}40` }}
                >
                  <Icon name="heart-filled" size={16} color={theme.accent} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>
                    Admin Curated Library
                  </Text>
                  <Text className="text-[11px] mt-0.5" style={{ color: theme.secondaryText }}>
                    {liked.length} liked songs loaded
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => restoreCuratedLikedSongs()}
                className="px-3 py-1.5 rounded-xl border flex-row items-center active:opacity-80"
                style={{
                  backgroundColor: theme.accent,
                  borderColor: theme.accent,
                }}
              >
                <Icon name="refresh" size={12} color="#000000" />
                <Text className="text-xs font-bold ml-1" style={{ color: "#000000" }}>
                  {liked.length === 0 ? "Load 450+ Songs" : "Sync All"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── 2. Preferred Music Language Section ──────────────────── */}
        <View
          className="mx-5 mb-4 p-4 rounded-3xl border shadow-sm"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <View
                className="w-8 h-8 rounded-xl items-center justify-center mr-2.5 border"
                style={{ backgroundColor: `${theme.accent}15`, borderColor: `${theme.accent}30` }}
              >
                <Icon name="music" size={16} color={theme.accent} />
              </View>
              <View>
                <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>
                  Preferred Music Language
                </Text>
                <Text className="text-[11px] mt-0.5" style={{ color: theme.secondaryText }}>
                  Search and recommendation priority
                </Text>
              </View>
            </View>
          </View>

          {/* Language Chips */}
          <View className="flex-row flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = activeLanguage.toLowerCase() === lang.id.toLowerCase();
              return (
                <Pressable
                  key={lang.id}
                  onPress={() => handleSelectLanguage(lang.id)}
                  className="px-3 py-1.5 rounded-xl border flex-row items-center active:opacity-80"
                  style={{
                    backgroundColor: isSelected ? `${theme.accent}20` : theme.elevatedSurface,
                    borderColor: isSelected ? theme.accent : theme.border,
                  }}
                >
                  {isSelected && (
                    <View className="w-3.5 h-3.5 rounded-full bg-accent items-center justify-center mr-1">
                      <Icon name="check" size={9} color="#000000" />
                    </View>
                  )}
                  <Text
                    className="text-xs font-bold"
                    style={{
                      color: isSelected ? theme.accent : theme.primaryText,
                    }}
                  >
                    {lang.label}{" "}
                    <Text
                      className="text-[10px] font-normal opacity-70"
                      style={{ color: isSelected ? theme.accent : theme.mutedText }}
                    >
                      ({lang.native})
                    </Text>
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── 3. App Version & Updates ─────────────────────────────── */}
        <View
          className="mx-5 mb-4 p-4 rounded-3xl border shadow-sm"
          style={{
            backgroundColor: updateInfo?.hasUpdate ? `${theme.accent}12` : theme.card,
            borderColor: updateInfo?.hasUpdate ? `${theme.accent}50` : theme.border,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 pr-2">
              <View
                className="w-8 h-8 rounded-xl items-center justify-center mr-2.5 border"
                style={{
                  backgroundColor: updateInfo?.hasUpdate ? `${theme.accent}25` : `${theme.accent}15`,
                  borderColor: updateInfo?.hasUpdate ? theme.accent : `${theme.accent}30`,
                }}
              >
                <Icon
                  name={updateInfo?.hasUpdate ? "download" : "refresh"}
                  size={16}
                  color={theme.accent}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>
                    {updateInfo?.hasUpdate ? "Update Ready" : "Aruvi Play"}
                  </Text>
                  <View
                    className="ml-2 px-2 py-0.2 rounded-full border"
                    style={{
                      backgroundColor: `${theme.accent}20`,
                      borderColor: `${theme.accent}40`,
                    }}
                  >
                    <Text className="text-[9px] font-black" style={{ color: theme.accent }}>
                      v{updateInfo?.hasUpdate ? updateInfo.versionName : currentVersion}
                    </Text>
                  </View>
                </View>
                <Text className="text-[11px] mt-0.5" style={{ color: theme.secondaryText }}>
                  {updateInfo?.hasUpdate
                    ? "A newer version is ready to install."
                    : `Up to date (Build ${currentVersionCode})`}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={updateInfo?.hasUpdate ? installUpdateAction : () => checkUpdate(true)}
              disabled={isCheckingUpdate}
              className="px-3 py-1.5 rounded-xl border flex-row items-center active:opacity-80"
              style={{
                backgroundColor: updateInfo?.hasUpdate ? theme.accent : theme.elevatedSurface,
                borderColor: updateInfo?.hasUpdate ? theme.accent : theme.border,
              }}
            >
              {isCheckingUpdate ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Text
                  className="text-xs font-bold"
                  style={{ color: updateInfo?.hasUpdate ? "#000000" : theme.accent }}
                >
                  {updateInfo?.hasUpdate ? "Install" : "Check"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* ── 4. Protected Content Section ─────────────────────────── */}
        {renderSecretKeySection()}

        {/* ── 5. Account Actions ───────────────────────────────────── */}
        {userProfile?.is_guest ? (
          <View className="mx-5 mb-4 p-4 rounded-3xl border bg-amber-500/10 border-amber-500/30">
            <Text className="text-xs font-bold text-amber-400 mb-0.5">
              Guest Session
            </Text>
            <Text className="text-[11px] text-amber-200/80 leading-relaxed mb-3">
              Save your account to sync your playlists and favourites across all devices.
            </Text>

            <View className="flex-row space-x-2.5">
              <Pressable
                onPress={() => setShowSaveModal(true)}
                className="flex-1 py-2.5 rounded-xl bg-accent items-center justify-center"
              >
                <Text className="text-black font-extrabold text-xs">Save Account</Text>
              </Pressable>

              <Pressable
                onPress={logout}
                className="py-2.5 px-3 rounded-xl bg-white/10 border border-white/10 items-center justify-center"
              >
                <Text className="text-white font-bold text-xs">Logout</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mx-5 mb-4">
            <Pressable
              onPress={logout}
              className="py-3 px-4 rounded-2xl border border-red-500/30 bg-red-500/10 items-center justify-center flex-row active:opacity-80"
            >
              <Icon name="close" size={15} color="#EF4444" />
              <Text className="text-red-400 font-bold text-xs ml-1.5">Log Out</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* ── Save Account Modal ─────────────────────────────────────── */}
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
                Register your email and password to sync your queue and favourites across devices.
              </Text>

              <TextInput
                value={saveEmail}
                onChangeText={setSaveEmail}
                placeholder="Enter email address"
                placeholderTextColor={theme.mutedText}
                keyboardType="email-address"
                autoCapitalize="none"
                className="px-4 py-2.5 rounded-xl border mb-2.5 text-sm"
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
                className="px-4 py-2.5 rounded-xl border mb-3 text-sm"
                style={{
                  backgroundColor: theme.elevatedSurface,
                  borderColor: theme.border,
                  color: theme.primaryText,
                }}
              />

              <Pressable
                onPress={() => setSaveFavourites(!saveFavourites)}
                className="flex-row items-center mb-5"
              >
                <View
                  className="w-5 h-5 rounded-md border items-center justify-center mr-2.5"
                  style={{
                    backgroundColor: saveFavourites ? theme.accent : theme.elevatedSurface,
                    borderColor: saveFavourites ? theme.accent : theme.border,
                  }}
                >
                  {saveFavourites && <Icon name="check" size={13} color="#000000" />}
                </View>
                <Text className="text-xs font-semibold" style={{ color: theme.primaryText }}>
                  Sync guest favourites to my new account
                </Text>
              </Pressable>

              <View className="flex-row space-x-2.5">
                <Pressable
                  onPress={() => setShowSaveModal(false)}
                  className="flex-1 py-2.5 rounded-xl items-center border"
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
                  className="flex-1 py-2.5 rounded-xl items-center bg-accent"
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
