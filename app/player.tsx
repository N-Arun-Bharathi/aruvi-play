import React from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { usePlayerStore } from "../store/playerStore";
import { useLibraryStore } from "../store/likedStore";
import { PlayerControls } from "../components/PlayerControls";
import { SeekBar } from "../components/SeekBar";
import { Icon } from "../components/Icon";

export default function PlayerScreen() {
  const router = useRouter();
  const current = usePlayerStore((s) => s.current);
  const isLiked = useLibraryStore((s) => s.isLiked);
  const toggleLike = useLibraryStore((s) => s.toggleLike);
  const { width } = Dimensions.get("window");
  const artSize = Math.min(width - 48, 360);

  if (!current) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center">
        <Text className="text-muted">Nothing playing</Text>
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-accent">Close</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const liked = isLiked(current.id);

  return (
    <View className="flex-1 bg-bg">
      <LinearGradient
        colors={["#1F1F1F", "#0A0A0A"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 400 }}
      />
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable onPress={() => router.back()} hitSlop={12} className="p-2">
            <Icon name="chevron-down" size={26} />
          </Pressable>
          <Text className="text-text text-sm font-medium">Now playing</Text>
          <Pressable hitSlop={12} className="p-2">
            <Icon name="more" size={22} />
          </Pressable>
        </View>

        <View className="flex-1 px-6 justify-center items-center">
          <View
            style={{ width: artSize, height: artSize }}
            className="rounded-2xl bg-surface2 overflow-hidden items-center justify-center"
          >
            {current.artwork ? (
              <Image
                source={{ uri: current.artwork }}
                style={{ width: artSize, height: artSize }}
                contentFit="cover"
              />
            ) : (
              <Icon name="music" size={64} color="#A0A0A0" />
            )}
          </View>
        </View>

        <View className="px-6">
          <View className="flex-row items-center">
            <View className="flex-1 pr-4">
              <Text className="text-text text-2xl font-bold" numberOfLines={1}>
                {current.title}
              </Text>
              <Text className="text-muted mt-1" numberOfLines={1}>
                {current.artist}
              </Text>
            </View>
            <Pressable
              onPress={() => toggleLike(current)}
              hitSlop={12}
              className="p-2"
            >
              <Icon
                name={liked ? "heart-filled" : "heart"}
                size={26}
                color={liked ? "#1DB954" : "#FFFFFF"}
              />
            </Pressable>
          </View>

          <SeekBar />
          <PlayerControls />
        </View>

        <View className="h-10" />
      </SafeAreaView>
    </View>
  );
}
