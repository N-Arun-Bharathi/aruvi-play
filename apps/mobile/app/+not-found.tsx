import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { Text, View, Pressable } from "react-native";
import { usePlayerStore } from "../store/playerStore";
import { useTheme } from "../utils/theme";

export default function NotFound() {
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    // If a song is currently playing or loaded, take user straight to the player
    const current = usePlayerStore.getState().current;
    if (current) {
      router.replace("/player" as any);
    } else {
      router.replace("/(tabs)" as any);
    }
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ title: "Aruvi Play" }} />
      <View
        className="flex-1 items-center justify-center p-6"
        style={{ backgroundColor: theme.background }}
      >
        <Text className="text-xl font-bold mb-2" style={{ color: theme.primaryText }}>
          Returning to Music...
        </Text>
        <Text className="text-sm mb-6 text-center" style={{ color: theme.secondaryText }}>
          Taking you back to your current session
        </Text>
        <Pressable
          onPress={() => {
            const current = usePlayerStore.getState().current;
            if (current) {
              router.replace("/player" as any);
            } else {
              router.replace("/(tabs)" as any);
            }
          }}
          className="px-6 py-3 rounded-full active:opacity-80"
          style={{ backgroundColor: theme.accent }}
        >
          <Text className="text-black font-bold text-sm">Open Player</Text>
        </Pressable>
      </View>
    </>
  );
}
