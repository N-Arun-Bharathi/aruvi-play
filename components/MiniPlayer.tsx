import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { usePlayerStore } from "../store/playerStore";
import { Icon } from "./Icon";
import { useProgress } from "../hooks/useProgress";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function MiniPlayer() {
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const router = useRouter();
  const { position, duration } = useProgress();
  const insets = useSafeAreaInsets();

  if (!current) return null;
  const pct = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <View 
      style={{ bottom: 96 + (insets.bottom > 0 ? insets.bottom - 10 : 0) }}
      className="absolute left-2 right-2 rounded-xl overflow-hidden bg-surface2 border border-white/5"
    >
      <Pressable
        onPress={() => router.push("/player")}
        className="flex-row items-center px-3 py-2"
      >
        <View className="w-10 h-10 rounded-md bg-bg overflow-hidden items-center justify-center">
          {current.artwork ? (
            <Image
              source={{ uri: current.artwork }}
              style={{ width: 40, height: 40 }}
              contentFit="cover"
            />
          ) : (
            <Icon name="music" size={18} color="#A0A0A0" />
          )}
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-text text-sm" numberOfLines={1}>
            {current.title}
          </Text>
          <Text className="text-muted text-xs" numberOfLines={1}>
            {current.artist}
          </Text>
        </View>
        <Pressable onPress={togglePlay} hitSlop={12} className="p-2">
          <Icon name={isPlaying ? "pause" : "play"} size={22} />
        </Pressable>
        <Pressable onPress={next} hitSlop={12} className="p-2">
          <Icon name="next" size={22} />
        </Pressable>
      </Pressable>
      <View className="h-[2px] bg-white/10">
        <View
          className="h-[2px] bg-accent"
          style={{ width: `${pct * 100}%` }}
        />
      </View>
    </View>
  );
}
