import React, { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { Icon } from "./Icon";

interface Props {
  liked: boolean;
  onPress: () => void;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
}

export function AnimatedHeart({
  liked,
  onPress,
  size = 24,
  activeColor = "#EF4444", // Red
  inactiveColor = "#A0A0A0",
}: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (liked) {
      scale.value = withSequence(
        withSpring(1.5, { damping: 10, stiffness: 100 }),
        withSpring(1, { damping: 15, stiffness: 100 })
      );
    }
  }, [liked]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    onPress();
    // Immediate feedback scale
    scale.value = withSequence(
      withSpring(0.8, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );
  };

  return (
    <Pressable onPress={handlePress} hitSlop={12} className="p-2">
      <Animated.View style={animatedStyle}>
        <Icon
          name={liked ? "heart-filled" : "heart"}
          size={size}
          color={liked ? activeColor : inactiveColor}
        />
      </Animated.View>
    </Pressable>
  );
}
