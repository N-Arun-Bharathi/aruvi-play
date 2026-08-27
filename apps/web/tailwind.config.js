/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#09090B",
        surface: "#121216",
        surfaceHover: "#1F1F26",
        surfaceCard: "#18181D",
        accent: "#10B981",
        accentHover: "#059669",
        accent2: "#34D399",
        accentGlow: "rgba(16, 185, 129, 0.35)",
        secondaryText: "#A1A1AA",
        muted: "#71717A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s infinite alternate",
        "spin-slow": "spin 12s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%": { boxShadow: "0 0 15px rgba(16, 185, 129, 0.2)" },
          "100%": { boxShadow: "0 0 35px rgba(16, 185, 129, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};
