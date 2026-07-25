import React from "react";
import { View, Text, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppScreen } from "../../components/AppScreen";
import { AppHeader } from "../../components/AppHeader";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../utils/theme";
import { Icon } from "../../components/Icon";

export default function UpdateAvailable() {
  const router = useRouter();
  const theme = useTheme();
  const { versionName, releaseNotes, apkUrl } = useLocalSearchParams<{
    versionName: string;
    releaseNotes: string;
    apkUrl: string;
  }>();

  const handleUpdate = () => {
    if (apkUrl) {
      Linking.openURL(apkUrl);
    }
  };

  return (
    <AppScreen edges={["top", "bottom"]}>
      <AppHeader title="App Update Available" />
      <View className="flex-1 p-6 justify-between" style={{ backgroundColor: theme.background }}>
        <View className="items-center mt-6">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-6 bg-emerald-500/10">
            <Icon name="search" size={32} color={theme.accent} />
          </View>
          
          <Text className="text-xl font-bold text-center" style={{ color: theme.primaryText }}>
            New Version Available!
          </Text>
          <Text className="text-sm mt-2 text-center" style={{ color: theme.secondaryText }}>
            A newer release (v{versionName || "1.1.0"}) is available to download.
          </Text>

          <View 
            className="p-5 rounded-2xl border w-full mt-8"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.secondaryText }}>
              Release Notes
            </Text>
            <Text className="text-sm leading-relaxed" style={{ color: theme.primaryText }}>
              {releaseNotes || "Performance enhancements and minor bug fixes."}
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <PrimaryButton
            title="Download & Install Now"
            onPress={handleUpdate}
            className="mb-3"
          />
          <PrimaryButton
            title="Maybe Later"
            onPress={() => router.back()}
            variant="secondary"
          />
        </View>
      </View>
    </AppScreen>
  );
}
