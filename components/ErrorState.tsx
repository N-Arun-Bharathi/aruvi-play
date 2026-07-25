import React from "react";
import { View, Text } from "react-native";
import { Icon } from "./Icon";
import { PrimaryButton } from "./PrimaryButton";
import { useTheme } from "../utils/theme";

interface Props {
  title?: string;
  message: string;
  onRetry: () => void;
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: Props) {
  const theme = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <View 
        className="p-5 rounded-full mb-4 bg-red-500/10"
      >
        <Icon name="lock" size={36} color={theme.error} />
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
        {message}
      </Text>
      <PrimaryButton title="Retry" onPress={onRetry} variant="secondary" />
    </View>
  );
}
