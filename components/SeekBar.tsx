import React, { useState } from "react";
import { View, Text } from "react-native";
import Slider from "@react-native-community/slider";
import { useProgress } from "../hooks/useProgress";
import { usePlayerStore } from "../store/playerStore";
import { formatTime } from "../utils/format";

export function SeekBar() {
  const { position, duration } = useProgress();
  const seekTo = usePlayerStore((s) => s.seekTo);
  const [scrubbing, setScrubbing] = useState<number | null>(null);

  const value = scrubbing ?? position;
  const max = duration > 0 ? duration : 1;

  return (
    <View className="px-2 mt-6">
      <Slider
        minimumValue={0}
        maximumValue={max}
        value={value}
        minimumTrackTintColor="#1DB954"
        maximumTrackTintColor="#3A3A3A"
        thumbTintColor="#FFFFFF"
        onSlidingStart={() => setScrubbing(position)}
        onValueChange={(v) => setScrubbing(v)}
        onSlidingComplete={async (v) => {
          await seekTo(v);
          setScrubbing(null);
        }}
      />
      <View className="flex-row justify-between -mt-1">
        <Text className="text-muted text-xs">{formatTime(value)}</Text>
        <Text className="text-muted text-xs">{formatTime(duration)}</Text>
      </View>
    </View>
  );
}
