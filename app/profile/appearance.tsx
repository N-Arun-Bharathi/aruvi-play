import React from "react";
import { View, Text, Pressable } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { Icon } from "../../components/Icon";
import { useSettingsStore } from "../../store/settingsStore";
import { useTheme } from "../../utils/theme";

export default function AppearanceSettings() {
  const theme = useTheme();
  const settingsTheme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const options: { id: "system" | "dark" | "light"; label: string; desc: string }[] = [
    { id: "system", label: "Use System Default", desc: "Adapt automatically based on device status." },
    { id: "dark", label: "Dark Theme", desc: "Vibrant dark mode for low light spaces." },
    { id: "light", label: "Light Theme", desc: "Clear bright theme for daylight reading." },
  ];

  return (
    <AppScreen edges={["top", "bottom"]}>
      <AppHeader title="Appearance" showBack />
      <View className="flex-1 p-6" style={{ backgroundColor: theme.background }}>
        <Text className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: theme.secondaryText }}>
          Theme Options
        </Text>
        
        {options.map((opt) => {
          const isSelected = settingsTheme === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setTheme(opt.id)}
              className="p-5 rounded-2xl border flex-row items-center justify-between mb-4 active:bg-white/5"
              style={{
                backgroundColor: theme.card,
                borderColor: isSelected ? theme.accent : theme.border,
              }}
            >
              <View className="flex-1 pr-4">
                <Text className="text-base font-bold" style={{ color: theme.primaryText }}>
                  {opt.label}
                </Text>
                <Text className="text-xs mt-1" style={{ color: theme.secondaryText }}>
                  {opt.desc}
                </Text>
              </View>
              {isSelected && (
                <View 
                  className="w-6 h-6 rounded-full items-center justify-center" 
                  style={{ backgroundColor: theme.accent }}
                >
                  <Icon name="check" size={14} color="#000000" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
  );
}
