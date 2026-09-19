import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { usePlayerStore } from "../store/playerStore";

export default function NotificationClickScreen() {
  const router = useRouter();

  useEffect(() => {
    const current = usePlayerStore.getState().current;
    if (current) {
      router.replace("/player" as any);
    } else {
      router.replace("/(tabs)" as any);
    }
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#09090B", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="small" color="#10B981" />
    </View>
  );
}
