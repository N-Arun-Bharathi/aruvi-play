import React from "react";
import { Pressable, View, Text } from "react-native";
import { Image } from "expo-image";
import { Song } from "../types/song";
import { Icon } from "./Icon";

interface Props {
  song: Song;
  onPress: () => void;
  isActive?: boolean;
  onLike?: () => void;
  liked?: boolean;
}

export function SongRow({ song, onPress, isActive, onLike, liked }: Props) {
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
          className={`text-base ${isActive ? "text-accent" : "text-text"}`}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text className="text-sm text-muted" numberOfLines={1}>
          {song.artist}
          {song.source === "local" ? " • Local" : ""}
        </Text>
      </View>
      {onLike ? (
        <Pressable hitSlop={12} onPress={onLike} className="p-2">
          <Icon
            name={liked ? "heart-filled" : "heart"}
            size={20}
            color={liked ? "#1DB954" : "#A0A0A0"}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
