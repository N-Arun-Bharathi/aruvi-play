import React from "react";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { Icon, IconName } from "../../components/Icon";
import { MiniPlayer } from "../../components/MiniPlayer";
import { usePlaybackEvents } from "../../hooks/usePlaybackEvents";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  usePlaybackEvents();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#000000",
            borderTopColor: "#222",
            height: 60 + (insets.bottom > 0 ? insets.bottom - 10 : 10),
            paddingBottom: insets.bottom > 0 ? insets.bottom - 5 : 5,
            paddingTop: 10,
          },
          tabBarActiveTintColor: "#FFFFFF",
          tabBarInactiveTintColor: "#777",
          tabBarLabelStyle: { fontSize: 11, marginBottom: insets.bottom > 0 ? 0 : 5 },
          tabBarIcon: ({ color, size }) => {
            const map: Record<string, IconName> = {
              index: "home",
              search: "search",
              library: "library",
            };
            return (
              <Icon name={map[route.name] ?? "home"} size={size} color={color} />
            );
          },
        })}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="search" options={{ title: "Search" }} />
        <Tabs.Screen name="library" options={{ title: "Library" }} />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
