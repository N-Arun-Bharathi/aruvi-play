import { useColorScheme } from "react-native";
import { useSettingsStore } from "../store/settingsStore";

export const darkTheme = {
  id: "dark" as const,
  background: "#09090D",
  surface: "#121218",
  surfaceElevated: "#1A1A22",
  elevatedSurface: "#1A1A22",
  card: "rgba(255, 255, 255, 0.05)",
  glassCard: "rgba(255, 255, 255, 0.06)",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  glassHeader: "rgba(18, 18, 24, 0.70)",
  glassBar: "rgba(24, 24, 30, 0.75)",
  primaryText: "#FFFFFF",
  secondaryText: "#A1A1AA",
  mutedText: "#71717A",
  border: "rgba(255, 255, 255, 0.08)",
  overlay: "rgba(0, 0, 0, 0.65)",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  accent: "#10B981",
  accentMuted: "rgba(16, 185, 129, 0.18)",
  blurTint: "dark" as const,
  statusBar: "light" as const,
  glassGradient: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"] as const,
};

export const lightTheme = {
  id: "light" as const,
  background: "#F2F4F8",
  surface: "#FFFFFF",
  surfaceElevated: "#F8FAFC",
  elevatedSurface: "#F8FAFC",
  card: "rgba(255, 255, 255, 0.75)",
  glassCard: "rgba(255, 255, 255, 0.65)",
  glassBorder: "rgba(255, 255, 255, 0.50)",
  glassHeader: "rgba(255, 255, 255, 0.80)",
  glassBar: "rgba(255, 255, 255, 0.85)",
  primaryText: "#0F172A",
  secondaryText: "#64748B",
  mutedText: "#94A3B8",
  border: "rgba(15, 23, 42, 0.08)",
  overlay: "rgba(0, 0, 0, 0.35)",
  success: "#16A34A",
  error: "#DC2626",
  warning: "#D97706",
  accent: "#059669",
  accentMuted: "rgba(5, 150, 105, 0.12)",
  blurTint: "light" as const,
  statusBar: "dark" as const,
  glassGradient: ["rgba(255,255,255,0.9)", "rgba(255,255,255,0.6)"] as const,
};

export function useTheme() {
  const settingsTheme = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();

  const activeTheme =
    settingsTheme === "system" ? systemScheme || "dark" : settingsTheme;

  return activeTheme === "light" ? lightTheme : darkTheme;
}
