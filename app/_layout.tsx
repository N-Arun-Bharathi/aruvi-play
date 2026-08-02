import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { usePlayerStore } from "../store/playerStore";
import { useAuthStore } from "../store/authStore";
import { enableFreeze } from "react-native-screens";
import { Toast } from "../components/Toast";
import { useToastStore } from "../store/toastStore";
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

  // ── Startup: init player + resolve auth session (once) ───────
  useEffect(() => {
    initPlayer().catch((e) => console.warn("initPlayer warning:", e));

    hydrateAuth()
      .then(() => {
        if (typeof global !== "undefined" && !(global as any).appReadyTime) {
          (global as any).appReadyTime = Date.now();
        }
        try {
          const { runUpdateCheckFlow } = require("../services/updatesService");
          runUpdateCheckFlow(false).catch(() => {});
        } catch (_) {}
      })
      .catch((err) => console.error("Auth hydration error:", err));
  }, []);

  // ── Deep Link handler for email verification ─────────────────
  const url = Linking.useURL();
  useEffect(() => {
    if (url && (url.includes("type=signup") || url.includes("type=invite"))) {
      // Give Supabase a moment to process the URL internally and establish the session
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
      // If on auth screen, push into app
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
        contentStyle: { backgroundColor: "#09090B" },
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
      <Stack.Screen name="updates/available" options={{ presentation: "modal", gestureEnabled: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="updates/required" options={{ presentation: "transparentModal", gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
          <StatusBar style="light" />
          <RootLayoutNav />
          <Toast />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
