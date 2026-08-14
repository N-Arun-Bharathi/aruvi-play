import React from "react";
import { View, Text, Pressable } from "react-native";
import { BlurView } from "expo-blur";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { Icon } from "../../components/Icon";
import { useSettingsStore } from "../../store/settingsStore";
import { useTheme } from "../../utils/theme";

export default function AppearanceSettings() {
  const theme = useTheme();
  const settingsTheme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const options: { id: "system" | "dark" | "light"; label: string; desc: string; icon: "moon" | "sun" | "device" }[] = [
    { id: "system", label: "Use System Default", desc: "Adapt automatically based on device theme preference.", icon: "device" },
    { id: "dark", label: "Dark Glass Theme", desc: "Sleek obsidian dark mode with glassmorphic accents.", icon: "moon" },
    { id: "light", label: "Light Glass Theme", desc: "Clean, luminous bright theme with frosted glass elements.", icon: "sun" },
  ];

  return (
    <AppScreen edges={["top", "bottom"]}>
      <AppHeader title="Appearance & Themes" showBack />
      <View className="flex-1 p-6" style={{ backgroundColor: theme.background }}>
        <Text className="text-xs font-bold uppercase tracking-wider mb-4 ml-1" style={{ color: theme.secondaryText }}>
          Theme Preference
        </Text>
        
        {options.map((opt) => {
          const isSelected = settingsTheme === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setTheme(opt.id)}
              className="rounded-2xl border overflow-hidden mb-4 shadow-sm active:opacity-80"
              style={{
                borderColor: isSelected ? theme.accent : theme.glassBorder,
              }}
            >
              <View 
                className="p-5 flex-row items-center justify-between"
                style={{ backgroundColor: isSelected ? theme.accentMuted : theme.glassCard }}
              >
                <View className="flex-1 pr-4">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-base font-bold" style={{ color: theme.primaryText }}>
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <View className="ml-2 px-2 py-0.5 rounded-full bg-accent/20">
                        <Text className="text-[10px] font-bold uppercase" style={{ color: theme.accent }}>
                          Active
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs leading-relaxed" style={{ color: theme.secondaryText }}>
                    {opt.desc}
                  </Text>
                </View>

                <View 
                  className="w-7 h-7 rounded-full items-center justify-center border" 
                  style={{
                    backgroundColor: isSelected ? theme.accent : "transparent",
                    borderColor: isSelected ? theme.accent : theme.border,
                  }}
                >
                  {isSelected && <Icon name="check" size={14} color="#FFFFFF" />}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
  );
}
