import React from "react";
import { View, TextInput, Pressable } from "react-native";
import { Icon } from "./Icon";
import { useTheme } from "../utils/theme";

interface Props {
  value: string;
  onChangeText: (s: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = "What do you want to listen to?",
  autoFocus,
}: Props) {
  const theme = useTheme();

  return (
    <View 
      className="flex-row items-center rounded-2xl px-4 py-3 border"
      style={{
        backgroundColor: theme.card,
        borderColor: theme.border
      }}
    >
      <Icon name="search" size={18} color={theme.secondaryText} />
      <TextInput
        className="flex-1 ml-3 text-base"
        style={{ color: theme.primaryText }}
        placeholderTextColor={theme.mutedText}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoFocus={autoFocus}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={12} className="p-1">
          <Icon name="close" size={16} color={theme.secondaryText} />
        </Pressable>
      ) : null}
    </View>
  );
}
