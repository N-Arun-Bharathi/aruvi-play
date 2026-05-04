/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#0A0A0A",
        surface: "#161616",
        surface2: "#1F1F1F",
        accent: "#1DB954",
        accent2: "#1ED760",
        muted: "#A0A0A0",
        text: "#FFFFFF",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
