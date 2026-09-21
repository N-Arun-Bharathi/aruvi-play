import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../utils/theme";

export function SkeletonCard({ size }: { size?: number } = {}) {
  const theme = useTheme();
  const opacity = useSharedValue(0.4);
  const cardSize = size || 120;

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={{ width: cardSize }} className="mr-4">
      <Animated.View
        style={[
          animatedStyle,
          { width: cardSize, height: cardSize, borderRadius: 16, backgroundColor: theme.elevatedSurface },
        ]}
      />
      <Animated.View
        style={[
          animatedStyle,
          { width: cardSize * 0.8, height: 14, borderRadius: 4, backgroundColor: theme.elevatedSurface, marginTop: 8, marginBottom: 4 },
        ]}
      />
      <Animated.View
        style={[
          animatedStyle,
          { width: cardSize * 0.5, height: 10, borderRadius: 4, backgroundColor: theme.elevatedSurface },
        ]}
      />
    </View>
  );
}

