import { useColorScheme } from "react-native";
import { useSettingsStore } from "../store/settingsStore";

export interface ThemeColors {
  id: "dark" | "light";
  background: string;
  card: string;
  surface: string;
  surfaceElevated: string;
  elevatedSurface: string;
  border: string;
  glassCard: string;
  glassBorder: string;
  accent: string;
  accentMuted: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  statusBar: "light" | "dark";
  blurTint: "dark" | "light" | "default";
  error: string;
  warning: string;
}

export const darkTheme: ThemeColors = {
  id: "dark",
  background: "#09090B",
  card: "#121217",
  surface: "#121217",
  surfaceElevated: "#18181F",
  elevatedSurface: "#18181F",
  border: "rgba(255, 255, 255, 0.08)",
  glassCard: "rgba(18, 18, 23, 0.85)",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  accent: "#10B981",
  accentMuted: "rgba(16, 185, 129, 0.15)",
  primaryText: "#FFFFFF",
  secondaryText: "#A1A1AA",
  mutedText: "#71717A",
  statusBar: "light",
  blurTint: "dark",
  error: "#EF4444",
  warning: "#F59E0B",
};

export const lightTheme: ThemeColors = {
  id: "light",
  background: "#F8FAFC",
  card: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceElevated: "#F1F5F9",
  elevatedSurface: "#F1F5F9",
  border: "rgba(0, 0, 0, 0.08)",
  glassCard: "rgba(255, 255, 255, 0.85)",
  glassBorder: "rgba(0, 0, 0, 0.1)",
  accent: "#10B981",
  accentMuted: "rgba(16, 185, 129, 0.15)",
  primaryText: "#0F172A",
  secondaryText: "#64748B",
  mutedText: "#94A3B8",
  statusBar: "dark",
  blurTint: "light",
  error: "#EF4444",
  warning: "#F59E0B",
};

export function useTheme(): ThemeColors {
  const colorScheme = useColorScheme();
  let currentThemeSetting = "system";
  try {
    currentThemeSetting = useSettingsStore((s) => s.theme);
  } catch (_) {}

  if (currentThemeSetting === "light") {
    return lightTheme;
  }
  if (currentThemeSetting === "dark") {
    return darkTheme;
  }
  return colorScheme === "light" ? lightTheme : darkTheme;
}
