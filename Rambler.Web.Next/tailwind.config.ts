import type { Config } from "tailwindcss";

// Theme mirrors the legacy Rambler look: deep indigo -> purple gradient,
// turquoise + pink accents, glassmorphism.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rambler: {
          indigo: "#21294F",
          purple: "#51456E",
          violet: "#895EE4",
          turquoise: "#4EBAA5",
          pink: "#FF8CAE",
          name: "#FEE28E",
          self: "#D9686C",
        },
      },
      fontFamily: {
        sans: ["Muli", "system-ui", "sans-serif"],
      },
      keyframes: {
        drift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "msg-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        "dash-flow": {
          to: { strokeDashoffset: "-16" },
        },
        "pulse-ring": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "0.1", transform: "scale(1.12)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        drift: "drift 26s ease-in-out infinite",
        "msg-in": "msg-in 0.2s ease-out both",
        "dash-flow": "dash-flow 0.9s linear infinite",
        "pulse-ring": "pulse-ring 3s ease-in-out infinite",
        "spin-slow": "spin-slow 90s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
