import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f2a22",
        pine: {
          50: "#f1f4ee",
          100: "#e2e9df",
          200: "#cdd9ca",
          500: "#3d7a5f",
          600: "#2a654d",
          700: "#1d523f",
          800: "#164536",
          900: "#103f34",
        },
        gold: {
          300: "#f1dcaf",
          400: "#e8cf94",
          500: "#d4b36b",
          600: "#8f6a24",
        },
        cream: "#f8f8f3",
      },
      fontFamily: {
        display: ["Georgia", "'Times New Roman'", "serif"],
        sans: ["Manrope", "'Avenir Next'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,63,52,.05), 0 12px 32px -18px rgba(16,63,52,.28)",
      },
    },
  },
  plugins: [],
};

export default config;
