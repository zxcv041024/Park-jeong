import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 40px rgba(56, 189, 248, 0.34)",
        key: "0 12px 30px rgba(2, 8, 23, 0.28)"
      },
      fontFamily: {
        sans: ["Inter", "Pretendard", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
