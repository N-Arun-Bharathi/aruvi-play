import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { usePlayerStore } from "../store/playerStore";
import { Icon } from "./Icon";
import { useProgress } from "../hooks/useProgress";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../utils/theme";

export const MiniPlayer = React.memo(function MiniPlayer() {
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const router = useRouter();
  const { position, duration } = useProgress();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  if (!current) return null;
  const pct = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View 
      style={{
        bottom: 96 + (insets.bottom > 0 ? insets.bottom - 10 : 0),
        borderColor: theme.glassBorder,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
      }}
      className="absolute left-3 right-3 rounded-2xl overflow-hidden border"
    >
      <BlurView intensity={85} tint={theme.blurTint} className="px-3 py-2">
        <Pressable
          onPress={() => router.push("/player")}
          className="flex-row items-center"
        >
          <View className="w-11 h-11 rounded-xl bg-black/10 overflow-hidden items-center justify-center border border-white/10">
            {current.artwork ? (
              <Image
                source={{ uri: current.artwork }}
                style={{ width: 44, height: 44 }}
                contentFit="cover"
              />
            ) : (
              <Icon name="music" size={20} color={theme.secondaryText} />
            )}
          </View>
          <View className="flex-1 ml-3 pr-2">
            <Text className="text-sm font-bold" style={{ color: theme.primaryText }} numberOfLines={1}>
              {current.title}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }} numberOfLines={1}>
              {current.artist}
            </Text>
          </View>
          <Pressable onPress={togglePlay} hitSlop={12} className="p-2.5">
            <Icon name={isPlaying ? "pause" : "play"} size={22} color={theme.primaryText} />
          </Pressable>
          <Pressable onPress={next} hitSlop={12} className="p-2.5">
            <Icon name="next" size={22} color={theme.primaryText} />
          </Pressable>
        </Pressable>
      </BlurView>
      <View className="h-[2.5px] w-full" style={{ backgroundColor: theme.border }}>
        <View
          className="h-[2.5px]"
          style={{ width: `${pct * 100}%`, backgroundColor: theme.accent }}
        />
      </View>
    </View>
  );
});
