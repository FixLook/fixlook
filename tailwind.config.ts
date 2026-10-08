import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#2BB2FF",
          foreground: "#10171F",
          strong: "#075985",
          soft: "#EAF7FF"
        },
        dark: "#10171F",
        accent: {
          DEFAULT: "#F5F7FA",
          foreground: "#10171F"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        }
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        "3xl": "2rem"
      },
      boxShadow: {
        card: "0 2px 8px -4px rgb(16 23 31 / 0.08), 0 12px 32px -24px rgb(16 23 31 / 0.12)",
        float: "0 20px 60px -20px rgb(16 23 31 / 0.2)"
      }
    }
  },
  plugins: [tailwindcssAnimate]
};

export default config;
