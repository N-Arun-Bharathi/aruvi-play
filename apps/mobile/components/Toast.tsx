import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useToastStore } from "../store/toastStore";
import { useTheme } from "../utils/theme";

const { width } = Dimensions.get("window");

export function Toast() {
  const { message, visible } = useToastStore();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 220,
        easing: Easing.out(Easing.quad),
      });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(-60, {
        duration: 200,
        easing: Easing.in(Easing.quad),
      });
      opacity.value = withTiming(0, { duration: 180 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!message && !visible) return null;

  const topOffset = Math.max(insets.top + 6, 44);

  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="none">
      <Animated.View style={[animatedStyle, { maxWidth: width - 40 }]}>
        <View 
          style={{
            borderColor: theme.glassBorder,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 10,
          }}
          className="rounded-full overflow-hidden border"
        >
          <BlurView
            intensity={85}
            tint={theme.blurTint}
            className="px-5 py-2.5 flex-row items-center justify-center"
          >
            <Text
              style={{ color: theme.primaryText }}
              className="text-xs font-bold text-center"
              numberOfLines={2}
            >
              {message}
            </Text>
          </BlurView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99999,
  },
});
