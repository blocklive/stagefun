/**
 * String constants for use throughout the application
 */

export const STRINGS = {
  /**
   * Patron NFT Pass naming
   *
   * @param tierName The name of the tier
   * @returns A string in the format "{tierName} Patron Pass"
   */
  PATRON_PASS_NAME: (tierName: string) => `${tierName} Patron Pass`,

  /**
   * Default description for the Patron NFT Pass
   */
  PATRON_PASS_DESCRIPTION: "Unique NFT proving your membership in this tier",
};

/**
 * Reward item types
 */
export const REWARD_TYPES = {
  NFT: "NFT",
  MERCH: "MERCH",
  TICKET: "TICKET",
  PERK: "PERK", // Generic type for miscellaneous perks/benefits
};

/**
 * Icons for each reward type (using emoji for simplicity)
 */
export const REWARD_TYPE_ICONS = {
  [REWARD_TYPES.NFT]: "🔑", // Key for NFT membership/access pass (changed from art palette)
  [REWARD_TYPES.MERCH]: "👕", // T-shirt for merchandise
  [REWARD_TYPES.TICKET]: "🎟️", // Ticket for event access
  [REWARD_TYPES.PERK]: "⭐", // Star for special perks and experiences
  DEFAULT: "🎁", // Default gift icon when type is unknown
};
