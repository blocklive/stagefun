import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ethers } from "ethers";
import showToast from "@/utils/toast";
import { useSmartWallet } from "./useSmartWallet";
import { useSmartWalletBalance } from "./useSmartWalletBalance";
import {
  getRouterContract,
  getFactoryContract,
  getERC20Contract,
  getUSDCContract,
  approveToken,
  getTokenAllowance,
  getDeadlineTimestamp,
} from "../lib/contracts/StageSwap";
import {
  ensureSmartWallet,
  standardizeSmartWalletError,
} from "../lib/utils/smartWalletUtils";

export interface SwapParams {
  amountIn: string;
  amountOutMin: string;
  path: string[];
  to: string;
  deadline: number;
}

export interface SwapQuoteParams {
  amountIn: string;
  path: string[];
}

export interface AddLiquidityParams {
  tokenA: string;
  tokenB: string;
  amountADesired: string;
  amountBDesired: string;
  amountAMin: string;
  amountBMin: string;
  to: string;
  deadline: number;
}

export interface UseStageSwapResult {
  isLoading: boolean;
  error: string | null;
  swapExactTokensForTokens: (
    params: SwapParams
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  getAmountsOut: (
    params: SwapQuoteParams
  ) => Promise<{ success: boolean; amounts?: string[]; error?: string }>;
  addLiquidity: (
    params: AddLiquidityParams
  ) => Promise<{
    success: boolean;
    error?: string;
    txHash?: string;
    liquidity?: string;
  }>;
  removeLiquidity: (
    tokenA: string,
    tokenB: string,
    liquidity: string,
    amountAMin: string,
    amountBMin: string,
    to: string,
    deadline: number
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
}

export function useStageSwap(): UseStageSwapResult {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    smartWalletAddress,
    callContractFunction,
    isLoading: smartWalletIsLoading,
  } = useSmartWallet();
  const { balance: smartWalletBalance, refresh: refreshSmartWalletBalance } =
    useSmartWalletBalance();

  // Get provider from user's wallet
  const getProvider = useCallback(async () => {
    if (!user) {
      throw new Error("User is not authenticated. Please log in.");
    }

    // If user doesn't have a wallet, prompt to create one
    if (!wallets || wallets.length === 0) {
      throw new Error(
        "No wallet found. Please create a wallet before proceeding."
      );
    }

    const embeddedWallet = wallets.find(
      (wallet) => wallet.walletClientType === "privy"
    );

    if (!embeddedWallet) {
      throw new Error("No embedded wallet found. Please create one.");
    }

    // Get provider from embedded wallet
    const provider = await embeddedWallet.getEthereumProvider();
    return new ethers.BrowserProvider(provider);
  }, [user, wallets]);

  // Swap exact tokens for tokens
  const swapExactTokensForTokens = useCallback(
    async (
      params: SwapParams
    ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      if (!user) {
        return {
          success: false,
          error: "User is not authenticated. Please log in.",
        };
      }

      // Clear any previous errors
      setError(null);
      setIsLoading(true);

      // Create a toast for loading status
      const loadingToast = showToast.loading("Processing your swap...");

      try {
        // Ensure smart wallet is available
        const smartWalletResult = await ensureSmartWallet(user, loadingToast);

        if (!smartWalletResult.success) {
          throw new Error(
            smartWalletResult.error ||
              "Smart wallet sync in progress, please retry"
          );
        }

        if (!smartWalletAddress || !callContractFunction) {
          throw new Error(
            "Smart wallet functions not available. Please try again later."
          );
        }

        console.log("Using smart wallet for swap:", smartWalletAddress);
        showToast.loading("Using smart wallet with gas sponsorship...", {
          id: loadingToast,
        });

        // Check token allowance and approve if needed
        const provider = await getProvider();
        const routerContract = await getRouterContract(provider);
        const routerAddress = await routerContract.getAddress();

        // Get the input token (first in path)
        const tokenAddress = params.path[0];
        const tokenContract = await getERC20Contract(tokenAddress, provider);

        // Check allowance
        const allowance = await getTokenAllowance(
          tokenAddress,
          smartWalletAddress,
          routerAddress,
          provider
        );

        // Convert amountIn to BigInt for comparison
        const amountInBigInt = BigInt(params.amountIn);

        // Approve if needed
        if (allowance < amountInBigInt) {
          showToast.loading("Approving token...", { id: loadingToast });

          const tokenABI = [
            "function approve(address spender, uint256 value) returns (bool)",
          ];

          const approvalResult = await callContractFunction(
            tokenAddress as `0x${string}`,
            tokenABI,
            "approve",
            [routerAddress, amountInBigInt],
            "Approve token for swap"
          );

          if (!approvalResult.success) {
            throw new Error(approvalResult.error || "Failed to approve token");
          }

          // Wait for approval transaction to be mined
          await provider.waitForTransaction(approvalResult.txHash as string);
        }

        // Execute the swap
        showToast.loading("Executing swap...", { id: loadingToast });

        const routerABI = [
          "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        ];

        const result = await callContractFunction(
          routerAddress as `0x${string}`,
          routerABI,
          "swapExactTokensForTokens",
          [
            params.amountIn,
            params.amountOutMin,
            params.path,
            smartWalletAddress, // Use smart wallet address as recipient
            params.deadline,
          ],
          "Swap tokens"
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to execute swap");
        }

        // Wait for transaction confirmation
        const receipt = await provider.waitForTransaction(
          result.txHash as string
        );

        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed on-chain");
        }

        showToast.success("Swap completed successfully!", { id: loadingToast });
        return { success: true, txHash: result.txHash };
      } catch (error) {
        console.error("Error in swapExactTokensForTokens:", error);

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        setError(standardizedError);
        showToast.error(standardizedError, { id: loadingToast });
        return { success: false, error: standardizedError };
      } finally {
        setIsLoading(false);
      }
    },
    [user, getProvider, smartWalletAddress, callContractFunction]
  );

  // Get estimated output amounts for a swap
  const getAmountsOut = useCallback(
    async (
      params: SwapQuoteParams
    ): Promise<{ success: boolean; amounts?: string[]; error?: string }> => {
      try {
        const provider = await getProvider();
        const routerContract = await getRouterContract(provider);

        const amountsOut = await routerContract.getAmountsOut(
          params.amountIn,
          params.path
        );

        return {
          success: true,
          amounts: amountsOut.map((amount: bigint) => amount.toString()),
        };
      } catch (error) {
        console.error("Error in getAmountsOut:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return { success: false, error: errorMessage };
      }
    },
    [getProvider]
  );

  // Add liquidity
  const addLiquidity = useCallback(
    async (
      params: AddLiquidityParams
    ): Promise<{
      success: boolean;
      error?: string;
      txHash?: string;
      liquidity?: string;
    }> => {
      if (!user) {
        return {
          success: false,
          error: "User is not authenticated. Please log in.",
        };
      }

      // Clear any previous errors
      setError(null);
      setIsLoading(true);

      // Create a toast for loading status
      const loadingToast = showToast.loading("Adding liquidity...");

      try {
        // Ensure smart wallet is available
        const smartWalletResult = await ensureSmartWallet(user, loadingToast);

        if (!smartWalletResult.success) {
          throw new Error(
            smartWalletResult.error ||
              "Smart wallet sync in progress, please retry"
          );
        }

        if (!smartWalletAddress || !callContractFunction) {
          throw new Error(
            "Smart wallet functions not available. Please try again later."
          );
        }

        console.log(
          "Using smart wallet for adding liquidity:",
          smartWalletAddress
        );
        showToast.loading("Using smart wallet with gas sponsorship...", {
          id: loadingToast,
        });

        // Get provider and contracts
        const provider = await getProvider();
        const routerContract = await getRouterContract(provider);
        const routerAddress = await routerContract.getAddress();

        // Check and approve tokenA if needed
        const tokenAAllowance = await getTokenAllowance(
          params.tokenA,
          smartWalletAddress,
          routerAddress,
          provider
        );

        if (tokenAAllowance < BigInt(params.amountADesired)) {
          showToast.loading("Approving token A...", { id: loadingToast });

          const tokenABI = [
            "function approve(address spender, uint256 value) returns (bool)",
          ];

          const approvalResultA = await callContractFunction(
            params.tokenA as `0x${string}`,
            tokenABI,
            "approve",
            [routerAddress, params.amountADesired],
            "Approve token A for liquidity"
          );

          if (!approvalResultA.success) {
            throw new Error(
              approvalResultA.error || "Failed to approve token A"
            );
          }

          await provider.waitForTransaction(approvalResultA.txHash as string);
        }

        // Check and approve tokenB if needed
        const tokenBAllowance = await getTokenAllowance(
          params.tokenB,
          smartWalletAddress,
          routerAddress,
          provider
        );

        if (tokenBAllowance < BigInt(params.amountBDesired)) {
          showToast.loading("Approving token B...", { id: loadingToast });

          const tokenBBI = [
            "function approve(address spender, uint256 value) returns (bool)",
          ];

          const approvalResultB = await callContractFunction(
            params.tokenB as `0x${string}`,
            tokenBBI,
            "approve",
            [routerAddress, params.amountBDesired],
            "Approve token B for liquidity"
          );

          if (!approvalResultB.success) {
            throw new Error(
              approvalResultB.error || "Failed to approve token B"
            );
          }

          await provider.waitForTransaction(approvalResultB.txHash as string);
        }

        // Add liquidity
        showToast.loading("Adding liquidity...", { id: loadingToast });

        const routerABI = [
          "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
        ];

        const result = await callContractFunction(
          routerAddress as `0x${string}`,
          routerABI,
          "addLiquidity",
          [
            params.tokenA,
            params.tokenB,
            params.amountADesired,
            params.amountBDesired,
            params.amountAMin,
            params.amountBMin,
            smartWalletAddress, // Use smart wallet as recipient
            params.deadline,
          ],
          "Add liquidity"
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to add liquidity");
        }

        // Wait for transaction confirmation
        const receipt = await provider.waitForTransaction(
          result.txHash as string
        );

        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed on-chain");
        }

        // Get the liquidity amount from the transaction logs
        // This would require parsing the event logs, but we'll simplify for now

        showToast.success("Liquidity added successfully!", {
          id: loadingToast,
        });
        return {
          success: true,
          txHash: result.txHash,
          // We would need to parse logs to get the exact liquidity amount
          liquidity: "Liquidity token amount",
        };
      } catch (error) {
        console.error("Error in addLiquidity:", error);

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        setError(standardizedError);
        showToast.error(standardizedError, { id: loadingToast });
        return { success: false, error: standardizedError };
      } finally {
        setIsLoading(false);
      }
    },
    [user, getProvider, smartWalletAddress, callContractFunction]
  );

  // Remove liquidity
  const removeLiquidity = useCallback(
    async (
      tokenA: string,
      tokenB: string,
      liquidity: string,
      amountAMin: string,
      amountBMin: string,
      to: string,
      deadline: number
    ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      if (!user) {
        return {
          success: false,
          error: "User is not authenticated. Please log in.",
        };
      }

      // Clear any previous errors
      setError(null);
      setIsLoading(true);

      // Create a toast for loading status
      const loadingToast = showToast.loading("Removing liquidity...");

      try {
        // Ensure smart wallet is available
        const smartWalletResult = await ensureSmartWallet(user, loadingToast);

        if (!smartWalletResult.success) {
          throw new Error(
            smartWalletResult.error ||
              "Smart wallet sync in progress, please retry"
          );
        }

        if (!smartWalletAddress || !callContractFunction) {
          throw new Error(
            "Smart wallet functions not available. Please try again later."
          );
        }

        console.log(
          "Using smart wallet for removing liquidity:",
          smartWalletAddress
        );
        showToast.loading("Using smart wallet with gas sponsorship...", {
          id: loadingToast,
        });

        // Get provider and contracts
        const provider = await getProvider();
        const routerContract = await getRouterContract(provider);
        const routerAddress = await routerContract.getAddress();
        const factoryContract = await getFactoryContract(provider);

        // Get the pair address
        const pairAddress = await factoryContract.getPair(tokenA, tokenB);

        if (pairAddress === ethers.ZeroAddress) {
          throw new Error("Liquidity pair does not exist");
        }

        // Approve the router to spend the LP tokens
        const pairABI = [
          "function approve(address spender, uint256 value) returns (bool)",
        ];

        const approvalResult = await callContractFunction(
          pairAddress as `0x${string}`,
          pairABI,
          "approve",
          [routerAddress, liquidity],
          "Approve LP tokens for removal"
        );

        if (!approvalResult.success) {
          throw new Error(
            approvalResult.error || "Failed to approve LP tokens"
          );
        }

        await provider.waitForTransaction(approvalResult.txHash as string);

        // Remove liquidity
        showToast.loading("Removing liquidity...", { id: loadingToast });

        const routerABI = [
          "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
        ];

        const result = await callContractFunction(
          routerAddress as `0x${string}`,
          routerABI,
          "removeLiquidity",
          [
            tokenA,
            tokenB,
            liquidity,
            amountAMin,
            amountBMin,
            smartWalletAddress, // Use smart wallet as recipient
            deadline,
          ],
          "Remove liquidity"
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to remove liquidity");
        }

        // Wait for transaction confirmation
        const receipt = await provider.waitForTransaction(
          result.txHash as string
        );

        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed on-chain");
        }

        showToast.success("Liquidity removed successfully!", {
          id: loadingToast,
        });
        return { success: true, txHash: result.txHash };
      } catch (error) {
        console.error("Error in removeLiquidity:", error);

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        const standardizedError = standardizeSmartWalletError(errorMessage);

        setError(standardizedError);
        showToast.error(standardizedError, { id: loadingToast });
        return { success: false, error: standardizedError };
      } finally {
        setIsLoading(false);
      }
    },
    [user, getProvider, smartWalletAddress, callContractFunction]
  );

  return {
    isLoading: isLoading || smartWalletIsLoading,
    error,
    swapExactTokensForTokens,
    getAmountsOut,
    addLiquidity,
    removeLiquidity,
  };
}
