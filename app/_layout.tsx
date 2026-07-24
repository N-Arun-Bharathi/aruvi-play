import "../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useLibraryStore } from "../store/likedStore";
import { usePlayerStore } from "../store/playerStore";
import { useAuthStore } from "../store/authStore";
import { enableFreeze } from "react-native-screens";
import { Toast } from "../components/Toast";

// Enable screen freeze to optimize navigation memory
enableFreeze(true);

// Set app startup benchmark timestamp
if (typeof global !== "undefined" && !(global as any).appStartTime) {
  (global as any).appStartTime = Date.now();
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  
  const hydrateLiked = useLibraryStore((s) => s.hydrate);
  const initPlayer = usePlayerStore((s) => s.init);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  
  const authenticated = useAuthStore((s) => s.authenticated);
  const authLoading = useAuthStore((s) => s.loading);

  useEffect(() => {
    // Hydrate liked, player, and auth stores in parallel
    Promise.all([
      hydrateAuth(),
      hydrateLiked(),
      initPlayer(),
    ]).then(() => {
      if (typeof global !== "undefined" && !(global as any).appReadyTime) {
        (global as any).appReadyTime = Date.now();
      }
      // Check for app updates automatically on startup
      try {
        const { runUpdateCheckFlow } = require("../services/updatesService");
        runUpdateCheckFlow(false).catch((err: any) => console.error("Update check failed on launch:", err));
      } catch (err) {
        console.error("Updates module loading failed:", err);
      }
    });
  }, []);

  useEffect(() => {
    // Force redirect any navigation to /auth back to the main tabs dashboard
    const inAuthGroup = (segments[0] as string) === "auth";
    if (inAuthGroup) {
      router.replace("/(tabs)" as any);
    }
  }, [segments]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A0A0A" },
        animation: "slide_from_bottom",
      }}
    >
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="player"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="queue"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
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
