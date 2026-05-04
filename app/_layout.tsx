import "../global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useLibraryStore } from "../store/likedStore";
import { usePlayerStore } from "../store/playerStore";

export default function RootLayout() {
  const hydrate = useLibraryStore((s) => s.hydrate);
  const init = usePlayerStore((s) => s.init);

  useEffect(() => {
    hydrate();
    init();
  }, [hydrate, init]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#0A0A0A" },
              animation: "slide_from_bottom",
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="player"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
          </Stack>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
