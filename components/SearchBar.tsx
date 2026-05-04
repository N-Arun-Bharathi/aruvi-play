import React from "react";
import { View, TextInput, Pressable } from "react-native";
import { Icon } from "./Icon";

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
  placeholder = "Songs, artists, albums",
  autoFocus,
}: Props) {
  return (
    <View className="flex-row items-center bg-surface rounded-full px-4 py-3">
      <Icon name="search" size={18} color="#A0A0A0" />
      <TextInput
        className="flex-1 ml-3 text-text text-base"
        placeholderTextColor="#7A7A7A"
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        autoFocus={autoFocus}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText("")} hitSlop={12}>
          <Icon name="chevron-down" size={18} color="#A0A0A0" />
        </Pressable>
      ) : null}
    </View>
  );
}
