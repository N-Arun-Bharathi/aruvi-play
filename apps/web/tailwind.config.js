/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0f1d",
        surface: "#0f172a",
        surfaceHover: "#1e293b",
        surfaceCard: "#131f38",
        midnight: {
          DEFAULT: "#0a0f1d",
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          300: "#9fb3c8",
          400: "#829ab1",
          500: "#627d98",
          600: "#486581",
          700: "#334e68",
          800: "#1e293b",
          900: "#0f172a",
          950: "#0a0f1d",
        },
        electric: {
          DEFAULT: "#0ea5e9",
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        accent: "#38bdf8",
        accentHover: "#0ea5e9",
        accentLight: "#7dd3fc",
        accentCyan: "#38bdf8",
        accentGlow: "rgba(56, 189, 248, 0.4)",
        secondaryText: "#94A3B8",
        muted: "#64748B",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2.5s infinite alternate",
        "spin-slow": "spin 12s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%": { boxShadow: "0 0 15px rgba(56, 189, 248, 0.25)" },
          "100%": { boxShadow: "0 0 35px rgba(56, 189, 248, 0.65)" },
        },
      },
    },
  },
  plugins: [],
};

