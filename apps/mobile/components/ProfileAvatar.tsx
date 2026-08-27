import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "../utils/theme";
import { useAuthStore } from "../store/authStore";

interface Props {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

export function ProfileAvatar({ uri, name, size = 40 }: Props) {
  const theme = useTheme();
  const userProfile = useAuthStore((s) => s.userProfile);
  const [loadError, setLoadError] = useState(false);

  const finalUri = uri !== undefined ? uri : userProfile?.avatar_url;
  const displayName = name !== undefined ? name : userProfile?.name || "Aruvi User";

  useEffect(() => {
    setLoadError(false);
  }, [finalUri]);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "AP";
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase().substring(0, 2);
  };

  const initials = getInitials(displayName || "Aruvi User");

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.elevatedSurface,
        borderWidth: 1,
        borderColor: theme.border,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden"
      }}
    >
      {finalUri && !loadError ? (
        <Image
          source={{ uri: finalUri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          onError={() => setLoadError(true)}
        />
      ) : (
        <Text
          style={{
            color: theme.accent,
            fontSize: size * 0.38,
            fontWeight: "bold",
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
