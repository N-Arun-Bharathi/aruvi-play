import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "../utils/theme";

interface Props {
  title: string;
  onSeeAll?: () => void;
  className?: string;
}

export function SectionHeader({ title, onSeeAll, className = "" }: Props) {
  const theme = useTheme();

  return (
    <View className={`flex-row items-center justify-between px-5 py-2 ${className}`}>
      <Text className="text-lg font-bold tracking-tight" style={{ color: theme.primaryText }}>
        {title}
      </Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} className="active:opacity-60">
          <Text className="text-xs font-semibold" style={{ color: theme.accent }}>
            See All
          </Text>
        </Pressable>
      )}
    </View>
  );
}
