import React from "react";
import { View, Text, ScrollView, Switch, Pressable } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { useSettingsStore } from "../../store/settingsStore";
import { useTheme } from "../../utils/theme";
import Slider from "@react-native-community/slider";

export default function PlaybackSettings() {
  const theme = useTheme();
  const settings = useSettingsStore();

  const qualityOptions: ("high" | "medium" | "low")[] = ["high", "medium", "low"];

  return (
    <AppScreen edges={["top", "bottom"]}>
      <AppHeader title="Playback" showBack />
      <ScrollView 
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        style={{ backgroundColor: theme.background }}
      >
        <Text className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.secondaryText }}>
          Streaming Audio Quality
        </Text>
        <View 
          className="rounded-2xl border p-4 mb-6 flex-row" 
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          {qualityOptions.map((q) => {
            const isSelected = settings.audioQuality === q;
            return (
              <Pressable
                key={q}
                onPress={() => settings.setAudioQuality(q)}
                className="flex-1 py-2 rounded-xl items-center justify-center capitalize"
                style={{
                  backgroundColor: isSelected ? theme.elevatedSurface : "transparent",
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: isSelected ? theme.accent : theme.secondaryText }}
                >
                  {q}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.secondaryText }}>
          Download Audio Quality
        </Text>
        <View 
          className="rounded-2xl border p-4 mb-6 flex-row" 
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          {qualityOptions.map((q) => {
            const isSelected = settings.downloadQuality === q;
            return (
              <Pressable
                key={q}
                onPress={() => settings.setDownloadQuality(q)}
                className="flex-1 py-2 rounded-xl items-center justify-center capitalize"
                style={{
                  backgroundColor: isSelected ? theme.elevatedSurface : "transparent",
                }}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: isSelected ? theme.accent : theme.secondaryText }}
                >
                  {q}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View 
          className="rounded-2xl border p-5 mb-6" 
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>Autoplay Related Tracks</Text>
              <Text className="text-xs mt-1" style={{ color: theme.secondaryText }}>Automatically extend your queue when list finishes.</Text>
            </View>
            <Switch
              value={settings.autoplay}
              onValueChange={settings.setAutoplay}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-sm font-bold" style={{ color: theme.primaryText }}>Explicit Content</Text>
              <Text className="text-xs mt-1" style={{ color: theme.secondaryText }}>Permit loading explicit and unedited versions of songs.</Text>
            </View>
            <Switch
              value={settings.explicitContent}
              onValueChange={settings.setExplicitContent}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <Text className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.secondaryText }}>
          Crossfade ({settings.crossfade} seconds)
        </Text>
        <View 
          className="rounded-2xl border p-5 mb-6" 
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <Slider
            minimumValue={0}
            maximumValue={12}
            step={1}
            value={settings.crossfade}
            onValueChange={settings.setCrossfade}
            minimumTrackTintColor={theme.accent}
            maximumTrackTintColor={theme.border}
            thumbTintColor={theme.accent}
          />
          <Text className="text-[10px] mt-2 text-center" style={{ color: theme.mutedText }}>
            Blending track transitions together (0s disables crossfade).
          </Text>
        </View>
      </ScrollView>
    </AppScreen>
  );
}
