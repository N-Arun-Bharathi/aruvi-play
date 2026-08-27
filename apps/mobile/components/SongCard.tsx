import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Song } from "../types/song";
import { Icon } from "./Icon";
import { useTheme } from "../utils/theme";

interface Props {
  song: Song;
  onPress: () => void;
}

export const SongCard = React.memo(function SongCard({ song, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      className="w-36 mr-3 active:opacity-60"
    >
      <View 
        style={{ backgroundColor: theme.surfaceElevated, borderColor: theme.glassBorder }}
        className="w-36 h-36 rounded-2xl overflow-hidden items-center justify-center border shadow-sm"
      >
        {song.artwork ? (
          <Image
            source={{ uri: song.artwork }}
            style={{ width: 144, height: 144 }}
            contentFit="cover"
          />
        ) : (
          <Icon name="music" size={36} color={theme.secondaryText} />
        )}
      </View>
      <Text className="mt-2 text-sm font-bold" style={{ color: theme.primaryText }} numberOfLines={1}>
        {song.title}
      </Text>
      <Text className="text-xs mt-0.5" style={{ color: theme.secondaryText }} numberOfLines={1}>
        {song.artist}
      </Text>
    </Pressable>
  );
});
