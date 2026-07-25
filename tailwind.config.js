/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#09090B",
        surface: "#121216",
        surface2: "#1A1A20",
        card: "#18181D",
        accent: "#10B981",
        accent2: "#34D399",
        text: "#FFFFFF",
        secondary: "#A1A1AA",
        muted: "#71717A",
        border: "rgba(255, 255, 255, 0.08)",
        success: "#22C55E",
        error: "#EF4444",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
