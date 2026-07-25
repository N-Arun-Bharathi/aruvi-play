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

export function SkeletonCard() {
  const theme = useTheme();
  const opacity = useSharedValue(0.4);

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
    <View className="mr-4">
      <Animated.View
        style={[
          animatedStyle,
          { width: 120, height: 120, borderRadius: 16, backgroundColor: theme.elevatedSurface },
        ]}
      />
      <Animated.View
        style={[
          animatedStyle,
          { width: 100, height: 14, borderRadius: 4, backgroundColor: theme.elevatedSurface, marginTop: 8, marginBottom: 4 },
        ]}
      />
      <Animated.View
        style={[
          animatedStyle,
          { width: 70, height: 10, borderRadius: 4, backgroundColor: theme.elevatedSurface },
        ]}
      />
    </View>
  );
}
