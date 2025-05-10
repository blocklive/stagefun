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

export interface AddLiquidityETHParams {
  token: string;
  amountTokenDesired: string;
  amountTokenMin: string;
  amountETHMin: string;
  to: string;
  deadline: number;
  value?: string; // Optional value parameter to specify full MON amount to send
}

export interface SwapETHParams {
  amountOutMin: string;
  path: string[];
  to: string;
  deadline: number;
  value?: string; // Optional value to specify MON amount to send
}

export interface SwapForETHParams {
  amountIn: string;
  amountOutMin: string;
  path: string[];
  to: string;
  deadline: number;
}

export interface GetPairParams {
  tokenA: string;
  tokenB: string;
}

export interface GetPairResult {
  success: boolean;
  pairAddress?: string;
  reserves?: [bigint, bigint];
  error?: string;
}

// Add new interface for removeLiquidityETH parameters
export interface RemoveLiquidityETHParams {
  token: string; // The ERC20 token address
  liquidity: string;
  amountTokenMin: string;
  amountETHMin: string;
  to: string;
  deadline: number;
}

export interface UseStageSwapResult {
  isLoading: boolean;
  error: string | null;
  swapExactTokensForTokens: (
    params: SwapParams
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  swapExactETHForTokens: (
    params: SwapETHParams
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  swapExactTokensForETH: (
    params: SwapForETHParams
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  getAmountsOut: (
    params: SwapQuoteParams
  ) => Promise<{ success: boolean; amounts?: string[]; error?: string }>;
  addLiquidity: (params: AddLiquidityParams) => Promise<{
    success: boolean;
    error?: string;
    txHash?: string;
    liquidity?: string;
  }>;
  addLiquidityETH: (params: AddLiquidityETHParams) => Promise<{
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
  removeLiquidityETH: (
    params: RemoveLiquidityETHParams
  ) => Promise<{ success: boolean; error?: string; txHash?: string }>;
  getPair: (params: GetPairParams) => Promise<GetPairResult>;
}

export function useStageSwap(): UseStageSwapResult {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>("");
  const {
    smartWalletAddress,
    callContractFunction,
    isLoading: smartWalletIsLoading,
  } = useSmartWallet();
  const { balance: smartWalletBalance, refresh: refreshSmartWalletBalance } =
    useSmartWalletBalance();

  // Helper function to get token decimals - moved to top level so it's available to all callbacks
  const getTokenDecimals = useCallback(
    async (
      tokenAddress: string,
      provider: ethers.Provider
    ): Promise<number> => {
      try {
        const contract = new ethers.Contract(
          tokenAddress,
          ["function decimals() view returns (uint8)"],
          provider
        );
        return await contract.decimals();
      } catch (error) {
        console.error("Error getting token decimals:", error);
        return 18; // Default to 18 decimals
      }
    },
    []
  );

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

        // Use maximum uint256 value for unlimited approval
        // TODO: just approve the exact amount needed
        const MAX_UINT256 = ethers.MaxUint256; // 2^256-1
        console.log(
          "Using MAX_UINT256 for token approval:",
          MAX_UINT256.toString()
        );

        // Approve if needed - always use MAX_UINT256 to avoid multiple approvals
        showToast.loading("Approving token...", { id: loadingToast });

        const tokenABI = [
          "function approve(address spender, uint256 value) returns (bool)",
        ];

        const approvalResult = await callContractFunction(
          tokenAddress as `0x${string}`,
          tokenABI,
          "approve",
          [routerAddress, MAX_UINT256], // Use MAX_UINT256 instead of exact amount
          "Approve token for swap"
        );

        if (!approvalResult.success) {
          throw new Error(approvalResult.error || "Failed to approve token");
        }

        // Wait for approval transaction to be mined
        await provider.waitForTransaction(approvalResult.txHash as string);

        // Debug: Log the new allowance after approval
        const newAllowance = await getTokenAllowance(
          tokenAddress,
          smartWalletAddress,
          routerAddress,
          provider
        );
        console.log("Token approved. New allowance:", newAllowance.toString());

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
    [
      user,
      getProvider,
      smartWalletAddress,
      callContractFunction,
      getTokenDecimals,
    ]
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

        // Get actual token decimals from contract first thing
        const tokenADecimals = await getTokenDecimals(params.tokenA, provider);
        const tokenBDecimals = await getTokenDecimals(params.tokenB, provider);

        // Log the actual token decimals for debugging
        console.log("Actual token decimals from contract:", {
          tokenA: {
            address: params.tokenA,
            decimals: tokenADecimals,
          },
          tokenB: {
            address: params.tokenB,
            decimals: tokenBDecimals,
          },
        });

        // Initial debug logging
        console.log("Starting addLiquidity with tokens:", {
          tokenA: params.tokenA,
          tokenB: params.tokenB,
          amountADesired: params.amountADesired,
          amountBDesired: params.amountBDesired,
          amountAFormatted: ethers.formatUnits(
            params.amountADesired,
            tokenADecimals
          ),
          amountBFormatted: ethers.formatUnits(
            params.amountBDesired,
            tokenBDecimals
          ),
        });

        // Check actual token balances before proceeding
        try {
          const tokenAContract = new ethers.Contract(
            params.tokenA,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          );
          const tokenBContract = new ethers.Contract(
            params.tokenB,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          );

          const [balanceA, balanceB] = await Promise.all([
            tokenAContract.balanceOf(smartWalletAddress),
            tokenBContract.balanceOf(smartWalletAddress),
          ]);

          console.log("Actual token balances:", {
            tokenA: {
              raw: balanceA.toString(),
              formatted: ethers.formatUnits(balanceA, tokenADecimals),
              needed: ethers.formatUnits(params.amountADesired, tokenADecimals),
            },
            tokenB: {
              raw: balanceB.toString(),
              formatted: ethers.formatUnits(balanceB, tokenBDecimals),
              needed: ethers.formatUnits(params.amountBDesired, tokenBDecimals),
            },
          });

          // Check if balances are sufficient
          if (balanceA < BigInt(params.amountADesired)) {
            throw new Error(
              `Insufficient balance of token A. Have ${ethers.formatUnits(
                balanceA,
                tokenADecimals
              )}, need ${ethers.formatUnits(
                params.amountADesired,
                tokenADecimals
              )}`
            );
          }

          if (balanceB < BigInt(params.amountBDesired)) {
            throw new Error(
              `Insufficient balance of token B. Have ${ethers.formatUnits(
                balanceB,
                tokenBDecimals
              )}, need ${ethers.formatUnits(
                params.amountBDesired,
                tokenBDecimals
              )}`
            );
          }
        } catch (error) {
          console.error("Error checking token balances:", error);
          // Continue anyway as this is just for debugging
        }

        // Use maximum uint256 value for unlimited approval
        const MAX_UINT256 = ethers.MaxUint256; // 2^256-1
        console.log("Using MAX_UINT256 for approvals:", MAX_UINT256.toString());

        // Always approve token A with maximum allowance for ERC20-ERC20 pairs
        showToast.loading("Approving token A with maximum allowance...", {
          id: loadingToast,
        });

        const tokenABI = [
          "function approve(address spender, uint256 value) returns (bool)",
        ];

        const approvalResultA = await callContractFunction(
          params.tokenA as `0x${string}`,
          tokenABI,
          "approve",
          [routerAddress, MAX_UINT256],
          "Approve token A for liquidity"
        );

        if (!approvalResultA.success) {
          throw new Error(approvalResultA.error || "Failed to approve token A");
        }

        await provider.waitForTransaction(approvalResultA.txHash as string);

        // Debug: Log the new allowance after approval
        const newTokenAAllowance = await getTokenAllowance(
          params.tokenA,
          smartWalletAddress,
          routerAddress,
          provider
        );
        console.log(
          "Token A approved. New allowance:",
          newTokenAAllowance.toString()
        );

        // Check and approve tokenB if needed
        const tokenBAllowance = await getTokenAllowance(
          params.tokenB,
          smartWalletAddress,
          routerAddress,
          provider
        );

        console.log("Initial Token B allowance:", tokenBAllowance.toString());

        // Always approve token B with maximum allowance for ERC20-ERC20 pairs
        showToast.loading("Approving token B with maximum allowance...", {
          id: loadingToast,
        });

        const tokenBABI = [
          "function approve(address spender, uint256 value) returns (bool)",
        ];

        const approvalResultB = await callContractFunction(
          params.tokenB as `0x${string}`,
          tokenBABI,
          "approve",
          [routerAddress, MAX_UINT256],
          "Approve token B for liquidity"
        );

        if (!approvalResultB.success) {
          throw new Error(approvalResultB.error || "Failed to approve token B");
        }

        await provider.waitForTransaction(approvalResultB.txHash as string);

        // Debug: Log the new allowance after approval
        const newTokenBAllowance = await getTokenAllowance(
          params.tokenB,
          smartWalletAddress,
          routerAddress,
          provider
        );
        console.log(
          "Token B approved. New allowance:",
          newTokenBAllowance.toString()
        );

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
    [
      user,
      getProvider,
      smartWalletAddress,
      callContractFunction,
      getTokenDecimals,
    ]
  );

  // Add liquidity with ETH
  const addLiquidityETH = useCallback(
    async (
      params: AddLiquidityETHParams
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
      const loadingToast = showToast.loading("Adding liquidity with MON...");

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
          "Using smart wallet for adding liquidity with MON:",
          smartWalletAddress
        );
        showToast.loading("Using smart wallet with gas sponsorship...", {
          id: loadingToast,
        });

        // Get provider and contracts
        const provider = await getProvider();
        const routerContract = await getRouterContract(provider);
        const routerAddress = await routerContract.getAddress();

        // Check and approve the token if needed
        const tokenAllowance = await getTokenAllowance(
          params.token,
          smartWalletAddress,
          routerAddress,
          provider
        );

        if (tokenAllowance < BigInt(params.amountTokenDesired)) {
          showToast.loading("Approving token...", { id: loadingToast });

          const tokenABI = [
            "function approve(address spender, uint256 value) returns (bool)",
          ];

          // Use maximum uint256 value for unlimited approval
          const MAX_UINT256 = ethers.MaxUint256; // 2^256-1

          const approvalResult = await callContractFunction(
            params.token as `0x${string}`,
            tokenABI,
            "approve",
            [routerAddress, MAX_UINT256],
            "Approve token for liquidity"
          );

          if (!approvalResult.success) {
            throw new Error(approvalResult.error || "Failed to approve token");
          }

          await provider.waitForTransaction(approvalResult.txHash as string);
        }

        // Add liquidity with ETH
        showToast.loading("Adding liquidity with MON...", { id: loadingToast });

        const routerABI = [
          "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
        ];

        console.log("Calling addLiquidityETH with smart wallet:", {
          token: params.token,
          amountTokenDesired: params.amountTokenDesired,
          amountTokenMin: params.amountTokenMin,
          amountETHMin: params.amountETHMin,
          to: smartWalletAddress,
          deadline: params.deadline,
        });

        // This is the key: We need to send the MON as value
        // For adding liquidity, we should send the full MON amount, not the minimum
        // The router will only use what's needed based on the ratio
        const ethValueToSend = params.value || params.amountETHMin;

        console.log(
          `Sending ${ethers.formatEther(ethValueToSend)} MON as value`
        );

        const result = await callContractFunction(
          routerAddress as `0x${string}`,
          routerABI,
          "addLiquidityETH",
          [
            params.token,
            params.amountTokenDesired,
            params.amountTokenMin,
            params.amountETHMin,
            smartWalletAddress, // Use smart wallet as recipient
            params.deadline,
          ],
          "Add liquidity with MON",
          { value: ethValueToSend } // Send the MON amount
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to add liquidity with MON");
        }

        // Wait for transaction confirmation
        const receipt = await provider.waitForTransaction(
          result.txHash as string
        );

        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed on-chain");
        }

        showToast.success("Liquidity added successfully!", {
          id: loadingToast,
        });
        return {
          success: true,
          txHash: result.txHash,
          liquidity: "Liquidity token amount",
        };
      } catch (error) {
        console.error("Error in addLiquidityETH:", error);

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
    [
      user,
      getProvider,
      smartWalletAddress,
      callContractFunction,
      getTokenDecimals,
    ]
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
    [
      user,
      getProvider,
      smartWalletAddress,
      callContractFunction,
      getTokenDecimals,
    ]
  );

  // Add the swapExactETHForTokens function implementation (inside the useStageSwap hook)
  const swapExactETHForTokens = useCallback(
    async (
      params: SwapETHParams
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
      const loadingToast = showToast.loading(
        "Processing your swap with native MON..."
      );

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

        console.log("Using smart wallet for MON swap:", smartWalletAddress);
        showToast.loading("Using smart wallet with gas sponsorship...", {
          id: loadingToast,
        });

        // Verify path begins with WETH
        const provider = await getProvider();
        const routerContract = await getRouterContract(provider);
        const routerAddress = await routerContract.getAddress();
        const wethAddress = await routerContract.WETH();

        if (params.path[0].toLowerCase() !== wethAddress.toLowerCase()) {
          throw new Error("The first token in path must be the WETH token");
        }

        // Execute the swap with native MON
        showToast.loading("Executing swap with MON...", { id: loadingToast });

        // Value to send - use the provided value or calculate it properly
        const ethValue =
          params.value ||
          (await (async () => {
            const amounts = await routerContract.getAmountsIn(
              params.amountOutMin,
              params.path
            );
            return amounts[0].toString();
          })());

        const routerABI = [
          "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
        ];

        const result = await callContractFunction(
          routerAddress as `0x${string}`,
          routerABI,
          "swapExactETHForTokens",
          [
            params.amountOutMin,
            params.path,
            smartWalletAddress, // Use smart wallet address as recipient
            params.deadline,
          ],
          "Swap MON for tokens",
          { value: ethValue } // Send native MON
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
        console.error("Error in swapExactETHForTokens:", error);

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
    [
      user,
      getProvider,
      smartWalletAddress,
      callContractFunction,
      getTokenDecimals,
    ]
  );

  // Add the swapExactTokensForETH function implementation (inside the useStageSwap hook)
  const swapExactTokensForETH = useCallback(
    async (
      params: SwapForETHParams
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
      const loadingToast = showToast.loading(
        "Processing your swap to native MON..."
      );

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

        console.log("Using smart wallet for swap to MON:", smartWalletAddress);
        showToast.loading("Using smart wallet with gas sponsorship...", {
          id: loadingToast,
        });

        // Get provider and contracts
        const provider = await getProvider();
        const routerContract = await getRouterContract(provider);
        const routerAddress = await routerContract.getAddress();
        const wethAddress = await routerContract.WETH();

        // Verify path ends with WETH
        if (
          params.path[params.path.length - 1].toLowerCase() !==
          wethAddress.toLowerCase()
        ) {
          console.error("Path error. Path:", params.path);
          console.error("WETH address:", wethAddress);
          throw new Error("The last token in path must be the WETH token");
        }

        // Log token addresses and path for debugging
        console.log("Swap details:", {
          input: params.path[0],
          output: "Native MON",
          amountIn: params.amountIn,
          amountOutMin: params.amountOutMin,
          path: params.path,
          deadline: params.deadline,
          WETH: wethAddress,
        });

        // Check token allowance and approve if needed
        const tokenAddress = params.path[0];

        showToast.loading("Approving token...", { id: loadingToast });

        const tokenABI = [
          "function approve(address spender, uint256 value) returns (bool)",
        ];

        // Use maximum uint256 value for unlimited approval
        const MAX_UINT256 = ethers.MaxUint256; // 2^256-1
        console.log(
          "Using MAX_UINT256 for token approval:",
          MAX_UINT256.toString()
        );

        const approvalResult = await callContractFunction(
          tokenAddress as `0x${string}`,
          tokenABI,
          "approve",
          [routerAddress, MAX_UINT256], // Use MAX_UINT256 instead of exact amount
          "Approve token for swap"
        );

        // approve success
        console.log("Approval result:", approvalResult);
        if (!approvalResult.success) {
          throw new Error(approvalResult.error || "Failed to approve token");
        }

        // Wait for approval transaction to be mined
        await provider.waitForTransaction(approvalResult.txHash as string);

        // Debug: Log the new allowance after approval
        const newAllowance = await getTokenAllowance(
          tokenAddress,
          smartWalletAddress,
          routerAddress,
          provider
        );
        console.log("Token approved. New allowance:", newAllowance.toString());

        // Execute the swap
        showToast.loading("Executing swap to MON...", { id: loadingToast });

        const routerABI = [
          "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
        ];

        // Get smart wallet MON balance before swap
        const balanceBefore = await provider.getBalance(smartWalletAddress);
        console.log(
          "MON balance before swap:",
          ethers.formatEther(balanceBefore)
        );

        const result = await callContractFunction(
          routerAddress as `0x${string}`,
          routerABI,
          "swapExactTokensForETH",
          [
            params.amountIn,
            params.amountOutMin,
            params.path,
            smartWalletAddress, // Use smart wallet address as recipient
            params.deadline,
          ],
          "Swap tokens for MON"
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

        // Get smart wallet MON balance after swap
        const balanceAfter = await provider.getBalance(smartWalletAddress);
        console.log(
          "MON balance after swap:",
          ethers.formatEther(balanceAfter)
        );
        console.log(
          "MON received:",
          ethers.formatEther(balanceAfter - balanceBefore)
        );

        // Force refresh smart wallet balance to reflect the new MON
        refreshSmartWalletBalance();

        showToast.success("Swap completed successfully!", { id: loadingToast });
        return { success: true, txHash: result.txHash };
      } catch (error) {
        console.error("Error in swapExactTokensForETH:", error);

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
    [
      user,
      getProvider,
      smartWalletAddress,
      callContractFunction,
      refreshSmartWalletBalance,
      getTokenDecimals,
    ]
  );

  // Add the getPair function implementation (inside the useStageSwap hook)
  const getPair = useCallback(
    async ({ tokenA, tokenB }: GetPairParams): Promise<GetPairResult> => {
      try {
        const provider = await getProvider();
        const routerContract = await getRouterContract(provider);
        const factoryAddress = await routerContract.factory();

        const factoryContract = new ethers.Contract(
          factoryAddress,
          [
            "function getPair(address tokenA, address tokenB) external view returns (address pair)",
          ],
          provider
        );

        const pairAddress = await factoryContract.getPair(tokenA, tokenB);

        // If pair doesn't exist
        if (pairAddress === "0x0000000000000000000000000000000000000000") {
          return {
            success: true,
            pairAddress,
          };
        }

        // Get reserves if pair exists
        const pairContract = new ethers.Contract(
          pairAddress,
          [
            "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
            "function token0() external view returns (address)",
            "function token1() external view returns (address)",
          ],
          provider
        );

        const [reserves, token0] = await Promise.all([
          pairContract.getReserves(),
          pairContract.token0(),
        ]);

        // Determine which reserve is which based on token order
        const isTokenAZero = tokenA.toLowerCase() === token0.toLowerCase();
        const reserveA = isTokenAZero
          ? BigInt(reserves[0])
          : BigInt(reserves[1]);
        const reserveB = isTokenAZero
          ? BigInt(reserves[1])
          : BigInt(reserves[0]);

        return {
          success: true,
          pairAddress,
          reserves: [reserveA, reserveB],
        };
      } catch (error) {
        console.error("Error getting pair:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Error getting pair",
        };
      }
    },
    [getProvider]
  );

  // New function: Remove liquidity for ETH (Native Token) pairs
  const removeLiquidityETH = useCallback(
    async (
      params: RemoveLiquidityETHParams
    ): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      if (!user) {
        return {
          success: false,
          error: "User is not authenticated. Please log in.",
        };
      }

      setError(null);
      setIsLoading(true);
      const loadingToast = showToast.loading("Removing native liquidity...");

      try {
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

        const provider = await getProvider();
        const routerContract = await getRouterContract(provider);
        const routerAddress = await routerContract.getAddress();
        const wethAddress = await routerContract.WETH(); // Get WETH address from router

        // Get the pair address (ERC20 token and WETH)
        // The factory getPair function expects token addresses, so WETH is used here.
        const factoryContract = await getFactoryContract(provider);
        const pairAddress = await factoryContract.getPair(
          params.token,
          wethAddress
        );

        if (pairAddress === ethers.ZeroAddress) {
          throw new Error(
            "Liquidity pair does not exist for token and WETH/Native"
          );
        }

        // Approve the router to spend the LP tokens from the pair contract
        const pairABI = [
          "function approve(address spender, uint256 value) returns (bool)",
        ];
        const approvalResult = await callContractFunction(
          pairAddress as `0x${string}`,
          pairABI,
          "approve",
          [routerAddress, params.liquidity],
          "Approve LP tokens for native removal"
        );

        if (!approvalResult.success) {
          throw new Error(
            approvalResult.error ||
              "Failed to approve LP tokens for native removal"
          );
        }
        await provider.waitForTransaction(approvalResult.txHash as string);

        // Call removeLiquidityETH on the router
        const routerABI = [
          "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)",
        ];
        const result = await callContractFunction(
          routerAddress as `0x${string}`,
          routerABI,
          "removeLiquidityETH",
          [
            params.token,
            params.liquidity,
            params.amountTokenMin,
            params.amountETHMin,
            smartWalletAddress, // Recipient is the smart wallet
            params.deadline,
          ],
          "Remove native liquidity"
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to remove native liquidity");
        }
        const receipt = await provider.waitForTransaction(
          result.txHash as string
        );
        if (!receipt || receipt.status === 0) {
          throw new Error(
            "Native liquidity removal transaction failed on-chain"
          );
        }

        showToast.success("Native liquidity removed successfully!", {
          id: loadingToast,
        });
        return { success: true, txHash: result.txHash };
      } catch (error) {
        console.error("Error in removeLiquidityETH:", error);
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
    [
      user,
      getProvider,
      smartWalletAddress,
      callContractFunction,
      // getTokenDecimals is not directly used here but kept for consistency if other ETH functions use it
    ]
  );

  return {
    isLoading: isLoading || smartWalletIsLoading,
    error,
    swapExactTokensForTokens,
    swapExactETHForTokens,
    swapExactTokensForETH,
    getAmountsOut,
    addLiquidity,
    addLiquidityETH,
    removeLiquidity,
    removeLiquidityETH,
    getPair,
  };
}
