import React from "react";
import { Pressable, Text, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../utils/theme";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
  icon,
}: Props) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 10, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  const getColors = () => {
    switch (variant) {
      case "secondary":
        return {
          bg: theme.elevatedSurface,
          text: theme.primaryText,
          border: theme.border,
        };
      case "danger":
        return {
          bg: theme.error,
          text: "#FFFFFF",
          border: "transparent",
        };
      case "primary":
      default:
        return {
          bg: theme.accent,
          text: "#000000",
          border: "transparent",
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: disabled ? theme.border : colors.bg,
          borderColor: colors.border,
          borderWidth: colors.border !== "transparent" ? 1 : 0,
        },
        animatedStyle,
      ]}
      className={`flex-row items-center justify-center py-3.5 px-6 rounded-2xl active:opacity-90 ${className}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          {icon && icon}
          <Text
            className={`text-sm font-bold tracking-tight text-center ${icon ? "ml-2" : ""}`}
            style={{ color: disabled ? theme.mutedText : colors.text }}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
