import React from "react";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { CustomTabBar } from "../../components/CustomTabBar";
import { MiniPlayer } from "../../components/MiniPlayer";
import { usePlaybackEvents } from "../../hooks/usePlaybackEvents";

export default function TabsLayout() {
  // Global initializer hook (called once)
  usePlaybackEvents();

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="search" options={{ title: "Search" }} />
        <Tabs.Screen name="library" options={{ title: "Library" }} />
        <Tabs.Screen name="queue" options={{ title: "Queue" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
