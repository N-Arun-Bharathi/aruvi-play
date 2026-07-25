import React from "react";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { CustomTabBar } from "../../components/CustomTabBar";
import { MiniPlayer } from "../../components/MiniPlayer";
import { usePlaybackEvents } from "../../hooks/usePlaybackEvents";
import { useAuthStore } from "../../store/authStore";

export default function TabsLayout() {
  usePlaybackEvents();

  const authMode = useAuthStore((s) => s.authMode);
  const isGuest = authMode === "guest";

  return (
    <View style={{ flex: 1, backgroundColor: "#09090B" }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {/* Always visible */}
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="search" options={{ title: "Search" }} />

        {/* Queue — only for guests */}
        <Tabs.Screen
          name="queue"
          options={{ title: "Queue", href: isGuest ? undefined : null }}
        />

        {/* Library — only for authenticated */}
        <Tabs.Screen
          name="library"
          options={{ title: "Library", href: isGuest ? null : undefined }}
        />

        {/* Rooms — only for authenticated */}
        <Tabs.Screen
          name="rooms"
          options={{ title: "Rooms", href: isGuest ? null : undefined }}
        />

        {/* Profile — visible to all */}
        <Tabs.Screen
          name="profile"
          options={{ title: "Profile" }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
