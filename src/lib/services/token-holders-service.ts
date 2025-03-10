import { Alchemy, Network } from "alchemy-sdk";

// Configure Alchemy SDK
const config = {
  apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  network: Network.ETH_MAINNET, // Or your target network (adjust as needed)
};

const alchemy = new Alchemy(config);

/**
 * Get token holders for a specific token address
 * @param tokenAddress The address of the token contract
 * @param pageKey Optional page key for pagination
 * @param pageSize Number of holders to fetch per page
 * @returns Token holders with pagination info
 */
export async function getTokenHolders(
  tokenAddress: string,
  pageKey?: string,
  pageSize: number = 100
) {
  try {
    // Get token holders with pagination
    const response = await alchemy.core.getTokenBalances(
      tokenAddress,
      [], // Empty array means get all holders
      { pageKey, pageSize }
    );

    return {
      holders: response.tokenBalances,
      pageKey: response.pageKey, // For pagination
    };
  } catch (error) {
    console.error("Error fetching token holders:", error);
    throw error;
  }
}

/**
 * Enrich holder data with additional information like ENS names
 * @param holders Array of token holders
 * @returns Enriched holder data
 */
export async function enrichHolderData(holders: any[]) {
  // Fetch ENS names or additional data for holders
  const enrichedHolders = await Promise.all(
    holders.map(async (holder) => {
      try {
        const ensName = await alchemy.core.lookupAddress(holder.address);
        return {
          ...holder,
          ensName: ensName || null,
        };
      } catch (error) {
        return holder;
      }
    })
  );

  return enrichedHolders;
}
