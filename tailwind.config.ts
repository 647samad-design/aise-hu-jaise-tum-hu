import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1f17",
        pine: {
          50: "#effaf3",
          100: "#d7f3e0",
          200: "#b0e7c4",
          500: "#1f8f57",
          600: "#17744a",
          700: "#125c3c",
          800: "#0f4a31",
          900: "#0b3724",
        },
        gold: {
          300: "#f6dc8b",
          400: "#f0c94f",
          500: "#e2b227",
          600: "#bf9112",
        },
        cream: "#fbf8ef",
      },
      fontFamily: {
        display: ["Georgia", "'Times New Roman'", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,31,23,.06), 0 8px 24px -12px rgba(11,31,23,.25)",
      },
    },
  },
  plugins: [],
};

export default config;
