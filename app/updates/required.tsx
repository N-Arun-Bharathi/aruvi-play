import React from "react";
import { View, Text, Linking } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { AppScreen } from "../../components/AppScreen";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../utils/theme";
import { Icon } from "../../components/Icon";

export default function UpdateRequired() {
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
      <View className="flex-1 p-6 justify-between" style={{ backgroundColor: theme.background }}>
        <View className="items-center mt-12">
          <View className="w-16 h-16 rounded-full items-center justify-center mb-6 bg-red-500/10">
            <Icon name="lock" size={32} color={theme.error} />
          </View>
          
          <Text className="text-xl font-bold text-center" style={{ color: theme.primaryText }}>
            Critical Update Required
          </Text>
          <Text className="text-sm mt-2 text-center" style={{ color: theme.secondaryText }}>
            A mandatory update (v{versionName || "1.1.0"}) is required to continue using Aruvi Play.
          </Text>

          <View 
            className="p-5 rounded-2xl border w-full mt-8"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <Text className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.secondaryText }}>
              Required Upgrades
            </Text>
            <Text className="text-sm leading-relaxed" style={{ color: theme.primaryText }}>
              {releaseNotes || "This update contains essential database sync upgrades and playback improvements."}
            </Text>
          </View>
        </View>

        <View className="mb-12">
          <PrimaryButton
            title="Update App to Continue"
            onPress={handleUpdate}
          />
          <Text className="text-[10px] text-center mt-3" style={{ color: theme.mutedText }}>
            You cannot bypass this update as older versions are no longer supported.
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}
