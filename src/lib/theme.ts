/**
 * Application theme constants
 * Define colors and other theme values that can be used across the app
 */

export const colors = {
  // Primary brand colors
  primary: {
    DEFAULT: "#836EF9",
    dark: "#6F5BD0",
    light: "#A78DFF",
  },

  // Semantic colors for status/feedback
  success: {
    DEFAULT: "#9EEB00", // New success green
    dark: "#88CE00", // Darker variant
    light: "#B4FF00", // Lighter variant
    bg: "#0F1A00", // Background for success toasts
  },

  error: {
    DEFAULT: "#EF4444",
    dark: "#B91C1C",
    bg: "#2D1A1A",
  },

  warning: {
    DEFAULT: "#F59E0B",
    dark: "#D97706",
    bg: "#422006",
  },

  info: {
    DEFAULT: "#3B82F6",
    dark: "#2563EB",
    bg: "#1A2235",
  },

  // Points yellow
  points: {
    DEFAULT: "#FFDD50",
    dark: "#E5C846",
    light: "#FFE77A",
    bg: "#332C10",
  },

  // Purple accent for multipliers and bonuses
  purple: {
    DEFAULT: "#A08FFF",
    dark: "#8B6FE6",
    light: "#B4A6FF",
    bg: "#1A1833",
  },

  // UI colors
  background: {
    DEFAULT: "#15161A",
    darker: "#0D0E13",
    card: "#1C1C1E",
    input: "#2C2C2E",
  },

  text: {
    DEFAULT: "#FFFFFF",
    secondary: "#CCCCCC",
    tertiary: "#999999",
    disabled: "#666666",
  },

  border: {
    DEFAULT: "#2C2C2E",
    light: "#3C3C3E",
    dark: "#1C1C1E",
  },
};

/**
 * CSS Variables mapping for integration with Tailwind
 * These variables can be used in the globals.css file
 */
export const cssVariables = {
  success: colors.success.DEFAULT,
  "success-dark": colors.success.dark,
  "success-light": colors.success.light,
  "success-bg": colors.success.bg,

  primary: colors.primary.DEFAULT,
  "primary-dark": colors.primary.dark,
  "primary-light": colors.primary.light,

  points: colors.points.DEFAULT,
  "points-dark": colors.points.dark,
  "points-light": colors.points.light,
  "points-bg": colors.points.bg,

  purple: colors.purple.DEFAULT,
  "purple-dark": colors.purple.dark,
  "purple-light": colors.purple.light,
  "purple-bg": colors.purple.bg,
};
