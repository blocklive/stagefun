import type { Config } from "tailwindcss";

export default {
  content: ["./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      screens: {
        xs: "430px", // Custom breakpoint at 430px
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
