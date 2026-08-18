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

  const isDark = settingsTheme === "dark" || (settingsTheme === "system" && theme.id === "dark");
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const isAdmin = userProfile?.isAdmin === true || userProfile?.is_owner === true;

  const handleUpdateCheck = () => {
    try {
      const { runUpdateCheckFlow } = require("../../services/updatesService");
      runUpdateCheckFlow(true).catch(() => {});
    } catch (e) {}
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
        <View className="mx-5 mb-6 p-5 rounded-3xl border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>App Version</Text>
            <View className="px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30">
              <Text className="text-xs font-extrabold" style={{ color: theme.accent }}>
                v1.3.0
              </Text>
            </View>
          </View>

          <Pressable onPress={handleUpdateCheck} className="py-3 rounded-xl border items-center bg-white/5 border-white/10 active:bg-white/10">
            <Text className="text-xs font-bold text-white">Check for App Updates</Text>
          </Pressable>
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
