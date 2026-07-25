import React from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../utils/theme";

interface Props {
  children: React.ReactNode;
  edges?: Edge[];
  className?: string;
}

export function AppScreen({ children, edges = ["top", "left", "right"], className = "" }: Props) {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={edges}
      className={className}
    >
      <StatusBar style={theme.background === "#09090B" ? "light" : "dark"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
