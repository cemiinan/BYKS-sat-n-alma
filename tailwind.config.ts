import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef5ff",
          100: "#d9e8ff",
          700: "#123b6d",
          800: "#0f315b",
          900: "#0a2544"
        }
      },
      boxShadow: {
        soft: "0 16px 40px rgba(15, 49, 91, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
