// List of reserved words that cannot be used as slugs
export const RESERVED_SLUGS = [
  // App routes
  "admin",
  "analytics",
  "api",
  "app",
  "auth",
  "blog",
  "dashboard",
  "docs",
  "help",
  "login",
  "logout",
  "onboarding",
  "pools",
  "profile",
  "settings",
  "signup",
  "support",
  "user",
  "users",
  "leaderboard",
  "stats",
  "about",
  "terms",
  "privacy",
  "legal",
  "contact",

  // Reserved functionality
  "create",
  "edit",
  "new",
  "delete",
  "manage",
  "join",
  "invite",
  "report",
  "home",
  "index",

  // Brand-related
  "stage",
  "stagefun",
  "official",
  "staff",
  "team",

  // Common reserved terms
  "www",
  "404",
  "500",
  "test",
  "staging",
  "demo",
];

// Validation regex for slugs - only lowercase letters, numbers, and hyphens
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Validates a slug against reserved words and formatting requirements
 * @param slug The slug to validate
 * @returns An object with isValid flag and a reason if invalid
 */
export const validateSlug = (
  slug: string
): { isValid: boolean; reason?: string } => {
  // Empty slugs are considered valid (they'll use the ID as fallback)
  if (!slug) {
    return { isValid: true };
  }

  // Check the format using regex
  if (!SLUG_REGEX.test(slug)) {
    return {
      isValid: false,
      reason:
        "Slug can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen.",
    };
  }

  // Check against reserved words
  if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
    return {
      isValid: false,
      reason: `"${slug}" is a reserved word and cannot be used as a slug.`,
    };
  }

  // Minimum length check
  if (slug.length < 3) {
    return {
      isValid: false,
      reason: "Slug must be at least 3 characters long.",
    };
  }

  return { isValid: true };
};

/**
 * Formats a string into a valid slug
 * @param input Any string
 * @returns A formatted slug (lowercase, only valid characters)
 */
export const formatSlug = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "") // Remove invalid characters
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .replace(/-{2,}/g, "-"); // Replace multiple hyphens with single
};
