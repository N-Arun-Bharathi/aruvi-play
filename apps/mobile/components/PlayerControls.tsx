import React from "react";
import { Pressable, View } from "react-native";
import { usePlayerStore } from "../store/playerStore";
import { Icon } from "./Icon";
import { useTheme } from "../utils/theme";

export function PlayerControls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const theme = useTheme();

  return (
    <View className="flex-row items-center justify-between px-2 mt-6">
      <Pressable onPress={toggleShuffle} hitSlop={12} className="p-3">
        <Icon
          name="shuffle"
          size={22}
          color={shuffle ? theme.accent : theme.primaryText}
        />
      </Pressable>
      <Pressable onPress={prev} hitSlop={12} className="p-3">
        <Icon name="prev" size={36} color={theme.primaryText} />
      </Pressable>
      <Pressable
        onPress={togglePlay}
        hitSlop={12}
        style={{ backgroundColor: theme.primaryText }}
        className="w-16 h-16 rounded-full items-center justify-center shadow-lg"
      >
        <Icon
          name={isPlaying ? "pause" : "play"}
          size={32}
          color={theme.id === "dark" ? "#000000" : "#FFFFFF"}
        />
      </Pressable>
      <Pressable onPress={next} hitSlop={12} className="p-3">
        <Icon name="next" size={36} color={theme.primaryText} />
      </Pressable>
      <Pressable onPress={cycleRepeat} hitSlop={12} className="p-3">
        <Icon
          name={repeat === "one" ? "repeat-one" : "repeat"}
          size={22}
          color={repeat === "off" ? theme.primaryText : theme.accent}
        />
      </Pressable>
    </View>
  );
}
