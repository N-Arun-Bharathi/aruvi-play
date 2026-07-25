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
} from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "../../components/Icon";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { useAuthStore } from "../../store/authStore";
import { usePlayerStore } from "../../store/playerStore";
import { useTheme } from "../../utils/theme";
import { DevPerformanceDashboard } from "../../components/DevPerformanceDashboard";

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const userProfile = useAuthStore((s) => s.userProfile);
  const elevateToAdmin = useAuthStore((s) => s.elevateToAdmin);
  const upgradeGuestAccount = useAuthStore((s) => s.upgradeGuestAccount);
  const logout = useAuthStore((s) => s.logout);

  const currentSong = usePlayerStore((s) => s.current);
  const bottomPadding = currentSong ? 210 : 150;

  const [adminKey, setAdminKey] = useState("");
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveEmail, setSaveEmail] = useState("");
  const [savePassword, setSavePassword] = useState("");
  const [saveFavourites, setSaveFavourites] = useState(true);

  const handleAdminKeyChange = async (text: string) => {
    setAdminKey(text);
    if (text.trim() === "5868") {
      await elevateToAdmin("5868");
    } else {
      await elevateToAdmin(text);
    }
  };

  const handleUpdateCheck = () => {
    try {
      const { runUpdateCheckFlow } = require("../../services/updatesService");
      runUpdateCheckFlow(true).catch(() => {});
    } catch (e) {}
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
          className="mx-5 my-5 p-5 rounded-3xl border flex-row items-center relative overflow-hidden"
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
                  backgroundColor: userProfile?.is_owner
                    ? `${theme.accent}15`
                    : userProfile?.is_guest
                    ? `${theme.warning}15`
                    : theme.elevatedSurface,
                }}
              >
                <Text
                  className="text-[9px] font-extrabold uppercase tracking-wider"
                  style={{
                    color: userProfile?.is_owner
                      ? theme.accent
                      : userProfile?.is_guest
                      ? theme.warning
                      : theme.secondaryText,
                  }}
                >
                  {userProfile?.is_owner
                    ? "Admin Owner"
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

        {/* Dev Tools Card */}
        <View className="mx-5 mb-6 p-5 rounded-3xl border" style={{ backgroundColor: theme.card, borderColor: theme.border }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>Dev Tools & Keys</Text>
            <Switch value={showDevPanel} onValueChange={setShowDevPanel} trackColor={{ false: "#27272A", true: theme.accent }} />
          </View>

          <TextInput
            value={adminKey}
            onChangeText={handleAdminKeyChange}
            placeholder="Enter admin key"
            placeholderTextColor={theme.mutedText}
            className="px-4 py-3 rounded-xl border text-sm mb-3 font-mono"
            style={{
              backgroundColor: theme.elevatedSurface,
              borderColor: theme.border,
              color: theme.primaryText,
            }}
          />

          <Pressable onPress={handleUpdateCheck} className="py-3 rounded-xl border items-center bg-white/5 border-white/10">
            <Text className="text-xs font-bold text-white">Check for App Updates</Text>
          </Pressable>
        </View>

        {showDevPanel && <DevPerformanceDashboard />}
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
