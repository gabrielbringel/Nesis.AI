/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effaf9",
          100: "#d7f1ef",
          200: "#b1e2df",
          300: "#7fccc8",
          400: "#4fb3b0",
          500: "#2f9796",
          600: "#21797b",
          700: "#1b6063",
          800: "#184c50",
          900: "#164044",
          950: "#0a2428",
        },
        severity: {
          critical: "#dc2626",
          moderate: "#f59e0b",
          mild: "#3b82f6",
          safe: "#16a34a",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(16, 64, 68, 0.06)",
      },
    },
  },
  plugins: [],
};
