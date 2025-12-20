import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0a0a0a",
          "bg-secondary": "#111111",
          border: "rgba(255, 255, 255, 0.1)",
        },
        light: {
          text: "#f5f5f5",
          "text-secondary": "#a0a0a0",
        },
      },
    },
  },
  plugins: [],
};
export default config;

