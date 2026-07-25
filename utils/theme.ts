import { useColorScheme } from "react-native";
import { useSettingsStore } from "../store/settingsStore";

export const darkTheme = {
  background: "#09090B",
  surface: "#121216",
  elevatedSurface: "#1A1A20",
  card: "#18181D",
  primaryText: "#FFFFFF",
  secondaryText: "#A1A1AA",
  mutedText: "#71717A",
  border: "rgba(255, 255, 255, 0.08)",
  overlay: "rgba(0, 0, 0, 0.55)",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  accent: "#10B981",
  accentMuted: "rgba(16, 185, 129, 0.15)",
};

export const lightTheme = {
  background: "#F4F4F5",
  surface: "#FFFFFF",
  elevatedSurface: "#E4E4E7",
  card: "#F4F4F5",
  primaryText: "#09090B",
  secondaryText: "#71717A",
  mutedText: "#A1A1AA",
  border: "rgba(9, 9, 11, 0.08)",
  overlay: "rgba(0, 0, 0, 0.4)",
  success: "#16A34A",
  error: "#DC2626",
  warning: "#D97706",
  accent: "#10B981",
  accentMuted: "rgba(16, 185, 129, 0.1)",
};

export function useTheme() {
  const settingsTheme = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();

  const activeTheme =
    settingsTheme === "system" ? systemScheme || "dark" : settingsTheme;

  return activeTheme === "light" ? lightTheme : darkTheme;
}
