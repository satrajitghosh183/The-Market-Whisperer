import type { Config } from "tailwindcss";
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b1220",
        card: "#121a2b",
        accent: "#7aa2f7",
        up: "#22c55e",
        down: "#ef4444"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.25)"
      }
    }
  },
  plugins: []
};
export default config;
