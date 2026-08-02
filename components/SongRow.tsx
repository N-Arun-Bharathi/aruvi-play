import React from "react";
import { Pressable, View, Text } from "react-native";
import { Image } from "expo-image";
import { Song } from "../types/song";
import { Icon } from "./Icon";
import { AnimatedHeart } from "./AnimatedHeart";
import { useAuthStore } from "../store/authStore";

interface Props {
  song: Song;
  onPress: () => void;
  isActive?: boolean;
  onLike?: () => void;
  liked?: boolean;
  onAddToQueue?: () => void;
}

export const SongRow = React.memo(function SongRow({
  song,
  onPress,
  isActive,
  onLike,
  liked,
  onAddToQueue,
}: Props) {
  // Never show the heart button for guest users
  const authMode = useAuthStore((s) => s.authMode);
  const canLike = authMode === "authenticated" && !!onLike;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3 active:opacity-60"
    >
      <View className="w-12 h-12 rounded-md bg-surface2 overflow-hidden items-center justify-center">
        {song.artwork ? (
          <Image
            source={{ uri: song.artwork }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
          />
        ) : (
          <Icon name="music" size={20} color="#A0A0A0" />
        )}
      </View>
      <View className="flex-1 ml-3">
        <Text
          className={`text-base font-medium ${isActive ? "text-accent" : "text-text"}`}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text className="text-xs text-muted mt-0.5" numberOfLines={1}>
          {song.artist}
          {song.source === "local" ? " • Local" : ""}
        </Text>
      </View>

      <View className="flex-row items-center">
        {onAddToQueue && (
          <Pressable
            hitSlop={12}
            onPress={() => {
              const { Alert } = require("react-native");
              const { usePlayerStore } = require("../store/playerStore");
              Alert.alert(
                song.title,
                "Queue Options",
                [
                  {
                    text: "Play Next",
                    onPress: () => {
                      usePlayerStore.getState().playNextImmediately(song);
                    },
                  },
                  {
                    text: "Add to Queue End",
                    onPress: () => {
                      usePlayerStore.getState().addToQueue(song);
                    },
                  },
                  { text: "Cancel", style: "cancel" },
                ]
              );
            }}
            className="p-2 mr-1"
          >
            <Icon name="plus" size={20} color="#A0A0A0" />
          </Pressable>
        )}
        {canLike && (
          <AnimatedHeart
            liked={!!liked}
            onPress={onLike}
            size={20}
            activeColor="#EF4444"
            inactiveColor="#A0A0A0"
          />
        )}
      </View>
    </Pressable>
  );
});
