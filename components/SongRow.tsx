import React from "react";
import { Pressable, View, Text } from "react-native";
import { Image } from "expo-image";
import { Song } from "../types/song";
import { Icon } from "./Icon";
import { AnimatedHeart } from "./AnimatedHeart";
import { useAuthStore } from "../store/authStore";

import { useTheme } from "../utils/theme";

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
  const authMode = useAuthStore((s) => s.authMode);
  const canLike = authMode === "authenticated" && !!onLike;
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3 active:opacity-60"
    >
      <View 
        style={{ backgroundColor: theme.surfaceElevated, borderColor: theme.glassBorder }}
        className="w-12 h-12 rounded-xl overflow-hidden items-center justify-center border"
      >
        {song.artwork ? (
          <Image
            source={{ uri: song.artwork }}
            style={{ width: 48, height: 48 }}
            contentFit="cover"
          />
        ) : (
          <Icon name="music" size={20} color={theme.secondaryText} />
        )}
      </View>
      <View className="flex-1 ml-3 pr-2">
        <Text
          style={{ color: isActive ? theme.accent : theme.primaryText }}
          className="text-base font-semibold"
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }} numberOfLines={1}>
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
