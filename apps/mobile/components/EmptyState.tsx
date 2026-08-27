import React from "react";
import { View, Text } from "react-native";
import { Icon, IconName } from "./Icon";
import { PrimaryButton } from "./PrimaryButton";
import { useTheme } from "../utils/theme";

interface Props {
  iconName: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ iconName, title, description, actionLabel, onAction }: Props) {
  const theme = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View 
        className="p-5 rounded-full mb-4" 
        style={{ backgroundColor: theme.elevatedSurface }}
      >
        <Icon name={iconName} size={36} color={theme.accent} />
      </View>
      <Text 
        className="text-lg font-bold tracking-tight text-center mb-1" 
        style={{ color: theme.primaryText }}
      >
        {title}
      </Text>
      <Text 
        className="text-sm text-center mb-6 leading-relaxed" 
        style={{ color: theme.secondaryText }}
      >
        {description}
      </Text>
      {actionLabel && onAction && (
        <PrimaryButton title={actionLabel} onPress={onAction} />
      )}
    </View>
  );
}
