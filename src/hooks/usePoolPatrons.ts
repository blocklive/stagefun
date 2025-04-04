import useSWR from "swr";
import { ethers } from "ethers";
import { supabase } from "../lib/supabase";
import {
  getPoolContract,
  getStageDotFunLiquidityContract,
  getLpHoldersWithBalances,
} from "../lib/contracts/StageDotFunPool";
import { useContractInteraction } from "./useContractInteraction";
import { usePrivy } from "@privy-io/react-auth";
import { useSupabase } from "../contexts/SupabaseContext";

export interface Patron {
  address: string;
  balance: string;
  userId?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isCurrentUser?: boolean;
}

export function usePoolPatrons(poolAddress: string | null) {
  const { getProvider } = useContractInteraction();
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();

  const {
    data: patrons,
    error,
    isValidating,
    mutate,
  } = useSWR(
    poolAddress
      ? ["pool-patrons", poolAddress, privyUser?.wallet?.address, dbUser?.id]
      : null,
    async () => {
      try {
        console.log("Fetching patrons for pool:", poolAddress);

        // Get provider
        const provider = await getProvider();

        // Get LP holders with balances using our new paginated function
        // Pass 0, 0 to get all LP holders in a single call
        const lpHolders = await getLpHoldersWithBalances(
          provider,
          poolAddress!,
          0,
          0
        );
        console.log("Got LP holders with balances:", lpHolders.length);

        if (lpHolders.length === 0) {
          return [];
        }

        // Extract addresses and balances
        const addresses = lpHolders.map((holder) => holder.address);
        const balances = lpHolders.map((holder) => holder.balance.toString());

        // Log the raw balances for debugging
        console.log("Raw balances from blockchain:", balances);
        console.log("Addresses from blockchain:", addresses);

        // Filter out zero balances
        const patronsWithBalances = addresses
          .map((address, index) => ({
            address,
            balance: balances[index],
          }))
          .filter((patron) => {
            try {
              return ethers.getBigInt(patron.balance) > BigInt(0);
            } catch (error) {
              console.error(
                `Error comparing balance for ${patron.address}:`,
                error
              );
              return false;
            }
          });

        console.log("Patrons with balances:", patronsWithBalances.length);

        if (patronsWithBalances.length === 0) {
          return [];
        }

        // Get current user's wallet address
        const currentUserWalletAddress =
          privyUser?.wallet?.address?.toLowerCase();

        // Also get current user's smart wallet address from dbUser
        const currentUserSmartWalletAddress =
          dbUser?.smart_wallet_address?.toLowerCase();

        // First, try to get user data for the current user if they're a patron
        let currentUserData = null;
        if (
          (currentUserWalletAddress &&
            patronsWithBalances.some(
              (p) => p.address.toLowerCase() === currentUserWalletAddress
            )) ||
          (currentUserSmartWalletAddress &&
            patronsWithBalances.some(
              (p) => p.address.toLowerCase() === currentUserSmartWalletAddress
            ))
        ) {
          const { data: userData } = await supabase
            .from("users")
            .select(
              "id, username, name, avatar_url, wallet_address, smart_wallet_address"
            )
            .or(
              `wallet_address.ilike.${currentUserWalletAddress},smart_wallet_address.ilike.${currentUserSmartWalletAddress}`
            )
            .single();

          if (userData) {
            currentUserData = userData;
            console.log("Found current user data:", currentUserData);
          }
        }

        // Then, get data for all patrons
        // Use ilike for case-insensitive matching and or to check both embedded and smart wallet addresses
        const addressFilters: string[] = [];

        // Add wallet_address filters
        patronsWithBalances.forEach((p) => {
          addressFilters.push(
            `wallet_address.ilike.${p.address.toLowerCase()}`
          );
        });

        // Add smart_wallet_address filters
        patronsWithBalances.forEach((p) => {
          addressFilters.push(
            `smart_wallet_address.ilike.${p.address.toLowerCase()}`
          );
        });

        const { data: users, error: usersError } = await supabase
          .from("users")
          .select(
            "id, username, name, avatar_url, wallet_address, smart_wallet_address"
          )
          .or(addressFilters.join(","));

        if (usersError) {
          console.error("Error fetching users:", usersError);
          throw usersError;
        }

        // Create a map of wallet address to user, checking both embedded and smart wallet addresses
        const walletToUserMap = new Map();
        if (users && users.length > 0) {
          users.forEach((user) => {
            // Map embedded wallet
            if (user.wallet_address) {
              walletToUserMap.set(user.wallet_address.toLowerCase(), user);
            }

            // Map smart wallet
            if (user.smart_wallet_address) {
              walletToUserMap.set(
                user.smart_wallet_address.toLowerCase(),
                user
              );
            }
          });
        }

        // Add current user to the map if not already there
        if (
          currentUserData &&
          currentUserData.wallet_address &&
          !walletToUserMap.has(currentUserData.wallet_address.toLowerCase())
        ) {
          walletToUserMap.set(
            currentUserData.wallet_address.toLowerCase(),
            currentUserData
          );
        }

        // Combine the data
        const enrichedPatrons = patronsWithBalances.map((patron) => {
          const normalizedAddress = patron.address.toLowerCase();
          const user = walletToUserMap.get(normalizedAddress);

          // Check if this is the current user by comparing against both the embedded wallet and smart wallet
          const isCurrentUser =
            currentUserWalletAddress === normalizedAddress ||
            currentUserSmartWalletAddress === normalizedAddress ||
            (dbUser && user?.id === dbUser.id);

          // For debugging
          if (isCurrentUser) {
            console.log("Current user is a patron:", {
              address: normalizedAddress,
              user,
              dbUser,
              privyUser,
            });
          }

          // Create a default display name from the address if no user data
          const defaultDisplayName = `${patron.address.substring(
            0,
            6
          )}...${patron.address.substring(patron.address.length - 4)}`;
          const defaultUsername = `${patron.address.substring(0, 6)}`;

          return {
            ...patron,
            userId: user?.id,
            username: user?.username || defaultUsername,
            displayName: user?.name || defaultDisplayName,
            avatarUrl: user?.avatar_url,
            isCurrentUser,
          };
        });

        console.log("Enriched patrons:", enrichedPatrons);

        // Sort by balance (highest first)
        return enrichedPatrons.sort((a, b) => {
          const balanceA = ethers.getBigInt(a.balance);
          const balanceB = ethers.getBigInt(b.balance);
          return balanceB > balanceA ? 1 : -1;
        });
      } catch (err) {
        console.error("Error getting pool patrons:", err);
        throw err;
      }
    },
    {
      refreshInterval: 60000, // Refresh every 60 seconds instead of 30
      revalidateOnFocus: false, // Don't revalidate on focus to reduce API calls
      dedupingInterval: 10000, // Increase deduping interval to 10 seconds
      fallbackData: [], // Default empty array while loading
      shouldRetryOnError: false, // Don't retry on error
    }
  );

  return {
    patrons: patrons || [],
    loading: isValidating && !patrons,
    error,
    refresh: () => mutate(),
  };
}
