import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Icon } from "./Icon";
import { useTheme } from "../utils/theme";

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightActions?: React.ReactNode;
}

export function AppHeader({ title, subtitle, showBack = false, onBackPress, rightActions }: Props) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View 
      className="flex-row items-center justify-between px-5 py-4 border-b" 
      style={{ 
        backgroundColor: theme.background,
        borderBottomColor: theme.border 
      }}
    >
      <View className="flex-row items-center flex-1">
        {showBack && (
          <Pressable
            onPress={onBackPress || (() => router.back())}
            className="mr-3 p-2 rounded-full active:bg-white/5"
          >
            <Icon name="arrow-left" size={24} color={theme.primaryText} />
          </Pressable>
        )}
        <View className="flex-1">
          {subtitle && (
            <Text className="text-xs font-semibold tracking-wider uppercase mb-0.5" style={{ color: theme.secondaryText }}>
              {subtitle}
            </Text>
          )}
          <Text className="text-xl font-bold tracking-tight" style={{ color: theme.primaryText }}>
            {title}
          </Text>
        </View>
      </View>
      {rightActions && <View className="flex-row items-center ml-2">{rightActions}</View>}
    </View>
  );
}
