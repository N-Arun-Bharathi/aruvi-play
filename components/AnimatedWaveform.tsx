import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";

interface Props {
  isPlaying: boolean;
  count?: number;
}

export function AnimatedWaveform({ isPlaying, count = 24 }: Props) {
  return (
    <View className="flex-row items-end justify-center h-12 w-full py-2">
      {Array.from({ length: count }).map((_, i) => (
        <WaveformBar key={i} isPlaying={isPlaying} index={i} />
      ))}
    </View>
  );
}

function WaveformBar({ isPlaying, index }: { isPlaying: boolean; index: number }) {
  const height = useSharedValue(6);

  useEffect(() => {
    if (isPlaying) {
      // Create a nice organic wave/bouncing motion
      const randomDuration = 350 + Math.random() * 300;
      const targetHeight = 12 + Math.random() * 24; // 12px to 36px
      
      height.value = withDelay(
        index * 20, // offset waves
        withRepeat(
          withSequence(
            withTiming(targetHeight, { duration: randomDuration }),
            withTiming(6, { duration: randomDuration })
          ),
          -1,
          true
        )
      );
    } else {
      height.value = withTiming(6, { duration: 300 });
    }
  }, [isPlaying]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: height.value,
    };
  });

  return (
    <Animated.View
      style={[animatedStyle]}
      className="w-[3px] bg-accent rounded-full mx-[2px] opacity-80"
    />
  );
}
