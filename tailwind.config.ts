import type { Config } from "tailwindcss";
import { colors } from "./src/lib/theme";

export default {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: colors.primary,
        success: colors.success,
        error: colors.error,
        warning: colors.warning,
        info: colors.info,
      },
      screens: {
        xs: "430px", // Custom breakpoint at 430px
      },
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0) rotate(0)" },
          "10%, 30%, 50%, 70%, 90%": {
            transform: "translateX(-3px) rotate(-0.5deg)",
          },
          "20%, 40%, 60%, 80%": { transform: "translateX(3px) rotate(0.5deg)" },
        },
        subtlePulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.95" },
        },
      },
      animation: {
        shake: "shake 0.6s ease-in-out infinite",
        "subtle-pulse": "subtlePulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwind-scrollbar-hide"),
  ],
} satisfies Config;
