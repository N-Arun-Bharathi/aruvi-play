import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Song } from "../types/song";
import { Icon } from "./Icon";

interface Props {
  song: Song;
  onPress: () => void;
}

export const SongCard = React.memo(function SongCard({ song, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="w-36 mr-3 active:opacity-60"
    >
      <View className="w-36 h-36 rounded-lg bg-surface2 overflow-hidden items-center justify-center">
        {song.artwork ? (
          <Image
            source={{ uri: song.artwork }}
            style={{ width: 144, height: 144 }}
            contentFit="cover"
          />
        ) : (
          <Icon name="music" size={36} color="#A0A0A0" />
        )}
      </View>
      <Text className="text-text mt-2 text-sm" numberOfLines={1}>
        {song.title}
      </Text>
      <Text className="text-muted text-xs" numberOfLines={1}>
        {song.artist}
      </Text>
    </Pressable>
  );
});
