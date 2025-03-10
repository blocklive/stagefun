import useSWR from "swr";
import { ethers } from "ethers";
import { supabase } from "../lib/supabase";
import {
  getPoolContract,
  getStageDotFunLiquidityContract,
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

        // Get pool contract
        const poolContract = getPoolContract(provider, poolAddress!);

        // Get the LP token address
        const lpTokenAddress = await poolContract.lpToken();
        console.log("LP Token address:", lpTokenAddress);

        // Get the LP token contract
        const lpTokenContract = getStageDotFunLiquidityContract(
          provider,
          lpTokenAddress
        );

        // For a real implementation, we would need to get all addresses that hold LP tokens
        // Since we don't have a direct way to enumerate all token holders, we'll use a different approach

        // For this example, we'll use a list of known addresses from the users table
        // This is not comprehensive but will work for demonstration purposes
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, username, name, avatar_url, wallet_address")
          .not("wallet_address", "is", null);

        if (usersError) {
          console.error("Error fetching users:", usersError);
          throw usersError;
        }

        console.log("Found users with wallet addresses:", users?.length || 0);

        if (!users || users.length === 0) {
          return [];
        }

        // Extract wallet addresses
        const walletAddresses = users
          .filter((user) => user.wallet_address)
          .map((user) => user.wallet_address as string);

        if (walletAddresses.length === 0) {
          return [];
        }

        // Get LP balances for these addresses
        const balances = await poolContract.getLpBalances(walletAddresses);
        console.log("Got balances:", balances.length);

        // Log the raw balances for debugging
        console.log(
          "Raw balances from blockchain:",
          balances.map((b: any) => b.toString())
        );
        console.log("Wallet addresses:", walletAddresses);

        // Create a more detailed log of addresses and their balances
        const addressBalancePairs = walletAddresses.map((address, index) => {
          const rawBalance = balances[index].toString();
          let formattedBalance = "0";
          try {
            // USDC has 6 decimal places, not 18
            formattedBalance = ethers.formatUnits(rawBalance, 6);
          } catch (error) {
            console.error(`Error formatting balance for ${address}:`, error);
          }
          return {
            address,
            rawBalance,
            formattedBalance,
          };
        });
        console.log("Address-balance pairs:", addressBalancePairs);

        // Filter out zero balances and create patron objects
        const patronsWithBalances = walletAddresses
          .map((address, index) => ({
            address,
            balance: balances[index].toString(),
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

        // Create a map of wallet address to user
        const walletToUserMap = new Map();
        users.forEach((user) => {
          if (user.wallet_address) {
            walletToUserMap.set(user.wallet_address.toLowerCase(), user);
          }
        });

        // Get current user's wallet address
        const currentUserWalletAddress =
          privyUser?.wallet?.address?.toLowerCase();

        // Combine the data
        const enrichedPatrons = patronsWithBalances.map((patron) => {
          const user = walletToUserMap.get(patron.address.toLowerCase());
          const isCurrentUser =
            currentUserWalletAddress === patron.address.toLowerCase() ||
            (dbUser && user?.id === dbUser.id);

          return {
            ...patron,
            userId: user?.id,
            username: user?.username,
            displayName: user?.name,
            avatarUrl: user?.avatar_url,
            isCurrentUser,
          };
        });

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
