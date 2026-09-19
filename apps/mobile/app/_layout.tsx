import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, AppState } from "react-native";
import { usePlayerStore } from "../store/playerStore";
import { useAuthStore } from "../store/authStore";
import { enableFreeze } from "react-native-screens";
import { Toast } from "../components/Toast";
import { UpdateModal } from "../components/UpdateModal";
import { useToastStore } from "../store/toastStore";
import { useSettingsStore } from "../store/settingsStore";
import { useUpdateStore } from "../store/updateStore";
import { subscribeToAppUpdates } from "../services/updateService";
import { useTheme } from "../utils/theme";
import * as Linking from "expo-linking";


enableFreeze(true);

if (typeof global !== "undefined" && !(global as any).appStartTime) {
  (global as any).appStartTime = Date.now();
}

const GUEST_BLOCKED_SEGMENTS = new Set([
  "library",
  "rooms",
  "liked-songs",
  "history",
  "recently-played",
  "playlists",
  "downloads",
]);

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();

  const initPlayer = usePlayerStore((s) => s.init);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const authMode = useAuthStore((s) => s.authMode);
  const theme = useTheme();

  // ── Startup: init player + resolve auth session + check updates ───────
  useEffect(() => {
    initPlayer().catch((e) => console.warn("initPlayer warning:", e));
    useSettingsStore.getState().hydrate().catch((e) => console.warn("Settings hydrate warning:", e));

    hydrateAuth()
      .then(() => {
        if (typeof global !== "undefined" && !(global as any).appReadyTime) {
          (global as any).appReadyTime = Date.now();
        }
      })
      .catch((err) => console.error("Auth hydration error:", err));

    // Non-blocking background update check after startup
    const updateTimer = setTimeout(() => {
      useUpdateStore.getState().checkUpdate(false).catch((e) => console.warn("Update check warning:", e));
    }, 1500);

    // Listen for Realtime database updates on app_versions table
    const unsubscribeRealtime = subscribeToAppUpdates(() => {
      console.log("[RootLayout] Realtime version push received from DB! Displaying update popup...");
      useUpdateStore.getState().checkUpdate(true).catch((e) => console.warn("Realtime update check warning:", e));
    });

    // Check for updates when app returns to foreground
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        useUpdateStore.getState().checkUpdate(false).catch(() => {});
      }
    });

    return () => {
      clearTimeout(updateTimer);
      unsubscribeRealtime();
      appStateSub.remove();
    };
  }, []);



  // ── Deep Link handler for email verification ─────────────────
  const url = Linking.useURL();
  useEffect(() => {
    if (url && (url.includes("type=signup") || url.includes("type=invite"))) {
      setTimeout(async () => {
        await hydrateAuth();
        const profile = useAuthStore.getState().userProfile;
        const name = (profile as any)?.display_name || profile?.name || "User";
        useToastStore.getState().show(`Congrats ${name}! Your account is verified.`);
      }, 1000);
    }
  }, [url]);

  // ── Navigation guard — runs on every authMode / segment change ─
  useEffect(() => {
    if (authMode === "loading") return;

    const seg0 = (segments[0] as string) || "";
    const seg1 = (segments[1] as string) || "";
    const inAuthScreen = seg0 === "auth";

    if (authMode === "unauthenticated") {
      if (!inAuthScreen) {
        router.replace("/auth" as any);
      }
      return;
    }

    if (authMode === "authenticated" || authMode === "guest") {
      if (inAuthScreen) {
        router.replace("/(tabs)" as any);
        return;
      }

      if (authMode === "guest") {
        const blocked = GUEST_BLOCKED_SEGMENTS.has(seg0) || GUEST_BLOCKED_SEGMENTS.has(seg1);
        if (blocked) {
          router.replace("/auth" as any);
        }
      }
    }
  }, [authMode, segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="player"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="queue"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="playlists/[id]" />
      <Stack.Screen name="playlists/create" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="playlists/edit/[id]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="rooms/create" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="rooms/join" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="rooms/[id]" />
      <Stack.Screen name="profile/edit" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      <Stack.Screen name="profile/appearance" />
      <Stack.Screen name="profile/playback" />
    </Stack>
  );
}

function RootLayoutContent() {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={theme.statusBar} />
      <RootLayoutNav />
      <Toast />
      <UpdateModal />
    </View>
  );
}


export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootLayoutContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
