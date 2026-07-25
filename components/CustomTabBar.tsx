import React, { useEffect } from "react";
import { View, Pressable, Dimensions, StyleSheet, Platform, Text } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Icon, IconName } from "./Icon";
import { useTabBarStore } from "../store/tabBarStore";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../store/authStore";

const { width } = Dimensions.get("window");

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const visible = useTabBarStore((s) => s.visible);
  const insets = useSafeAreaInsets();
  
  // Animation values
  const translateY = useSharedValue(0);
  const activeTabX = useSharedValue(0);
  
  const authMode = useAuthStore((s) => s.authMode);
  const isGuest = authMode === "guest";

  // Filter out routes robustly based on authMode
  const visibleRoutes = state.routes.filter((route) => {
    if (isGuest) {
      return route.name !== "library" && route.name !== "rooms";
    }
    // Registered users don't see the Queue tab (they have it in the Player)
    return route.name !== "queue";
  });

  const tabWidth = (width - 32) / (visibleRoutes.length || 5);

  const activeRoute = state.routes[state.index];
  const activeVisibleIndex = visibleRoutes.findIndex((r) => r.key === activeRoute?.key);

  useEffect(() => {
    // Hide/show animation based on scroll direction
    translateY.value = withSpring(visible ? 0 : 100, {
      damping: 18,
      stiffness: 120,
    });
  }, [visible]);

  useEffect(() => {
    // Slide the active indicator capsule based on visible position
    const targetIndex = activeVisibleIndex >= 0 ? activeVisibleIndex : 0;
    activeTabX.value = withSpring(targetIndex * tabWidth, {
      damping: 16,
      stiffness: 140,
    });
  }, [activeVisibleIndex, tabWidth]);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: activeTabX.value }],
    };
  });

  const iconMap: Record<string, IconName> = {
    index: "home",
    search: "search",
    library: "library",
    queue: "queue",
    rooms: "room",
    profile: "profile",
  };

  const labelMap: Record<string, string> = {
    index: "Home",
    search: "Search",
    library: "Library",
    queue: "Queue",
    rooms: "Rooms",
    profile: "Profile",
  };

  const bottomOffset = 24 + (insets.bottom > 0 ? insets.bottom - 10 : 0);

  return (
    <Animated.View
      style={[styles.container, { bottom: bottomOffset }, animatedContainerStyle]}
      className="absolute left-4 right-4 bg-transparent shadow-2xl"
    >
      <BlurView
        intensity={85}
        tint="dark"
        style={styles.blur}
        className="rounded-[28px] border border-white/10 overflow-hidden py-2 px-1 flex-row justify-between items-center"
      >
        {/* Active Tab Indicator Capsule */}
        <Animated.View
          style={[
            styles.indicator,
            { width: tabWidth - 8 },
            animatedIndicatorStyle,
          ]}
          className="absolute bg-white/10 rounded-2xl h-[48px] top-2 left-1.5"
        />

        {visibleRoutes.map((route, visibleIdx) => {
          const isFocused = state.routes[state.index]?.key === route.key;
          const { options } = descriptors[route.key];
          
          const label = labelMap[route.name] ?? route.name;
          const iconName = iconMap[route.name] ?? "home";

          const onPress = () => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }

            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={{ width: tabWidth }}
              className="align-center justify-center py-2 h-[48px] items-center"
            >
              <AnimatedIcon name={iconName} isFocused={isFocused} />
              <Text
                style={{ fontSize: 9, fontWeight: isFocused ? "600" : "400" }}
                className={`mt-1 ${isFocused ? "text-accent" : "text-muted"}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </Animated.View>
  );
}

// Subcomponent to animate active icon press
function AnimatedIcon({ name, isFocused }: { name: IconName; isFocused: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.15 : 1, { damping: 10 });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Icon name={name} size={20} color={isFocused ? "#10B981" : "#71717A"} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    zIndex: 100,
  },
  blur: {
    height: "100%",
  },
  indicator: {
    position: "absolute",
  },
});
