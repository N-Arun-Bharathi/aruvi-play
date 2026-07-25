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

export function SkeletonRow() {
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
    <View className="flex-row items-center px-5 py-3">
      <Animated.View
        style={[
          animatedStyle,
          { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.elevatedSurface },
        ]}
      />
      <View className="flex-1 ml-4 justify-center">
        <Animated.View
          style={[
            animatedStyle,
            { width: "65%", height: 16, borderRadius: 4, backgroundColor: theme.elevatedSurface, marginBottom: 8 },
          ]}
        />
        <Animated.View
          style={[
            animatedStyle,
            { width: "40%", height: 12, borderRadius: 4, backgroundColor: theme.elevatedSurface },
          ]}
        />
      </View>
      <Animated.View
        style={[
          animatedStyle,
          { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.elevatedSurface },
        ]}
      />
    </View>
  );
}
