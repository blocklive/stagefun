import { supabase } from "../supabase";

/**
 * Strip HTML tags from a string
 */
function stripHtmlTags(html: string): string {
  if (!html) return "";

  // Remove HTML tags
  const withoutTags = html.replace(/<[^>]*>/g, "");

  // Decode common HTML entities
  return withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "...")
    .trim();
}

export interface PoolMetadata {
  id: string;
  name: string;
  title: string;
  description: string;
  image_url?: string;
  raised_amount: number;
  target_amount: number;
  token_symbol?: string;
  creator?: {
    id: string;
    name: string;
    avatar_url: string;
  };
  tiers?: any[];
}

export interface PoolWithFullData extends PoolMetadata {
  tiers: Array<{
    id: string;
    name: string;
    price: string;
    description: string;
    onchain_index?: number;
    reward_items: any[];
  }>;
}

/**
 * Fetch basic pool data for metadata generation (used in generateMetadata)
 */
export async function getPoolMetadataBySlug(
  slug: string
): Promise<PoolMetadata | null> {
  try {
    const { data: pool, error } = await supabase
      .from("pools")
      .select(
        `
        *,
        creator:users!creator_id (
          id,
          name,
          avatar_url
        )
      `
      )
      .eq("slug", slug)
      .single();

    if (error || !pool) {
      return null;
    }

    // Strip HTML from description
    const cleanedPool = {
      ...pool,
      description: stripHtmlTags(pool.description || ""),
    };

    return cleanedPool as PoolMetadata;
  } catch (error) {
    console.error("Error fetching pool metadata:", error);
    return null;
  }
}

/**
 * Fetch complete pool data with relationships (used in server page component)
 */
export async function getPoolWithFullDataBySlug(
  slug: string
): Promise<PoolWithFullData | null> {
  try {
    const { data: pool, error } = await supabase
      .from("pools")
      .select(
        `
        *,
        creator:users!creator_id (
          id,
          name,
          avatar_url
        ),
        tiers!pool_id (
          *,
          reward_items:tier_reward_items!tier_id (
            reward:reward_items!reward_item_id (
              id,
              name,
              description,
              type,
              metadata,
              is_active
            )
          )
        )
      `
      )
      .eq("slug", slug)
      .single();

    if (error || !pool) {
      return null;
    }

    // Process the data to match expected interface
    const processedPool: PoolWithFullData = {
      ...pool,
      tiers:
        pool.tiers?.map((tier: any) => ({
          ...tier,
          reward_items: tier.reward_items?.map((ri: any) => ri.reward) || [],
        })) || [],
    };

    return processedPool;
  } catch (error) {
    console.error("Error fetching pool with full data:", error);
    return null;
  }
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate funding percentage
 */
export function calculateFundingPercentage(
  raised: number,
  target: number
): number {
  return target > 0 ? Math.min(Math.round((raised / target) * 100), 100) : 0;
}
