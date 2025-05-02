import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowDownIcon } from "@heroicons/react/24/solid";
import { ethers } from "ethers";
import { usePrivy } from "@privy-io/react-auth";
import { TokenSelector } from "./TokenSelector";
import { AmountInput } from "./AmountInput";
import { useStageSwap } from "@/hooks/useStageSwap";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import {
  getDeadlineTimestamp,
  getFactoryContract,
} from "@/lib/contracts/StageSwap";
import showToast from "@/utils/toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

// Define Token interface
interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

// Fixed fee - 0.3% for all pools based on Uniswap V2
const FIXED_FEE = {
  fee: 30, // 0.3%
  displayName: "0.3%",
  description: "Standard fee for all pools",
};

// Official WMON token address
const OFFICIAL_WMON_ADDRESS = "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701";

// Token data with real contract addresses
const TOKENS: Token[] = [
  {
    address: CONTRACT_ADDRESSES.monadTestnet.usdc,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoURI: "/icons/usdc-logo.svg",
  },
  {
    address: "NATIVE", // Special marker for native MON
    symbol: "MON",
    name: "Monad",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
  },
  {
    address: OFFICIAL_WMON_ADDRESS,
    symbol: "WMON",
    name: "Wrapped MON",
    decimals: 18,
    logoURI: "/icons/mon-logo.svg",
  },
];

export function SwapPoolInterface() {
  const { user } = usePrivy();
  const [tokenA, setTokenA] = useState(TOKENS[0]); // USDC
  const [tokenB, setTokenB] = useState(TOKENS[1]); // WMON
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);
  const [poolExists, setPoolExists] = useState<boolean>(false); // Explicitly set to false by default
  const [poolRatio, setPoolRatio] = useState<{
    reserveA: bigint;
    reserveB: bigint;
  } | null>(null);
  const [pairAddress, setPairAddress] = useState<string | null>(null);
  // Add refs at top level
  const prevTokenARef = useRef(tokenA.address);
  const prevTokenBRef = useRef(tokenB.address);

  const {
    addLiquidity,
    addLiquidityETH,
    isLoading: isSwapHookLoading,
    error,
  } = useStageSwap();
  const {
    balances,
    isLoading: isBalanceLoading,
    refresh: refreshBalances,
  } = useTokenBalances();

  // Combined loading state
  const isLoading = isAddingLiquidity || isSwapHookLoading || isBalanceLoading;

  // Check if pool exists and get reserves
  const checkPoolExists = useCallback(async () => {
    if (!tokenA.address || !tokenB.address) return;

    try {
      const provider = new ethers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL
      );
      const factoryContract = await getFactoryContract(provider);

      // Check if pair exists
      const pairAddress = await factoryContract.getPair(
        tokenA.address,
        tokenB.address
      );
      setPairAddress(pairAddress);

      // If zero address, no pool exists
      if (pairAddress === "0x0000000000000000000000000000000000000000") {
        console.log("No pool exists - setting poolExists to false");
        setPoolExists(false);
        setPoolRatio(null);
        return;
      }

      // Get pool reserves
      const pairContract = new ethers.Contract(
        pairAddress,
        [
          "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
          "function token0() external view returns (address)",
          "function totalSupply() view returns (uint)",
        ],
        provider
      );

      const [reserves, token0, totalSupply] = await Promise.all([
        pairContract.getReserves(),
        pairContract.token0(),
        pairContract.totalSupply(),
      ]);

      // Log total supply to check if the pool has LP tokens
      console.log(
        `Pool total supply of LP tokens: ${ethers.formatUnits(totalSupply, 18)}`
      );

      // Determine which reserve is which based on token order
      const isTokenAZero =
        tokenA.address.toLowerCase() === token0.toLowerCase();
      const reserveA = isTokenAZero ? BigInt(reserves[0]) : BigInt(reserves[1]);
      const reserveB = isTokenAZero ? BigInt(reserves[1]) : BigInt(reserves[0]);

      // Format to human-readable numbers for checking emptiness
      const reserveAValue = Number(
        ethers.formatUnits(reserveA, tokenA.decimals)
      );
      const reserveBValue = Number(
        ethers.formatUnits(reserveB, tokenB.decimals)
      );

      console.log(
        `Pool reserves: ${reserveAValue} ${tokenA.symbol}, ${reserveBValue} ${tokenB.symbol}`
      );

      // Check if pool is effectively empty (reserves are very small)
      // Using a higher threshold (0.05) to consider pools with tiny amounts as empty
      const DUST_THRESHOLD = 0.05;
      const isPoolEmpty =
        reserveAValue === 0 ||
        reserveAValue < DUST_THRESHOLD ||
        reserveBValue === 0 ||
        reserveBValue < DUST_THRESHOLD;

      if (isPoolEmpty) {
        // Pool exists but is effectively empty - treat it like a new pool
        console.log(
          "Pool exists but has minimal reserves, treating as new pool"
        );
        setPoolExists(false);
        setPoolRatio(null);
      } else {
        console.log(
          `Pool ratio: 1 ${tokenA.symbol} = ${reserveBValue / reserveAValue} ${
            tokenB.symbol
          }`
        );
        setPoolExists(true);
        setPoolRatio({ reserveA, reserveB });

        // If the pool has significant reserves, display ratio information
        const SIGNIFICANT_AMOUNT = 0.05; // Higher threshold to match DUST_THRESHOLD
        if (
          reserveAValue > SIGNIFICANT_AMOUNT ||
          reserveBValue > SIGNIFICANT_AMOUNT
        ) {
          console.log(
            `Current pool ratio: 1 ${tokenA.symbol} = ${
              reserveBValue / reserveAValue
            } ${tokenB.symbol}`
          );
        }
      }
    } catch (error) {
      console.error("Error checking pool existence:", error);
      setPoolExists(false);
      setPoolRatio(null);
    }
  }, [
    tokenA.address,
    tokenB.address,
    tokenA.decimals,
    tokenB.decimals,
    tokenA.symbol,
    tokenB.symbol,
  ]);

  // Call this when tokens change
  useEffect(() => {
    console.log("Token change effect triggered");

    // Check if tokens have changed
    if (
      prevTokenARef.current !== tokenA.address ||
      prevTokenBRef.current !== tokenB.address
    ) {
      checkPoolExists();

      // Only reset amounts when tokens actually change
      if (amountA || amountB) {
        console.log("Resetting amounts due to token change");
        setAmountA("");
        setAmountB("");
      }

      // Update refs with new token addresses
      prevTokenARef.current = tokenA.address;
      prevTokenBRef.current = tokenB.address;
    }
  }, [tokenA.address, tokenB.address, checkPoolExists]);

  // Function to calculate paired amount based on pool ratio
  const calculatePairedAmount = useCallback(
    (inputAmount: string, inputToken: Token, outputToken: Token) => {
      if (!poolRatio || !inputAmount || parseFloat(inputAmount) === 0)
        return "";

      try {
        const amount = ethers.parseUnits(inputAmount, inputToken.decimals);

        let result;
        if (inputToken.address === tokenA.address) {
          // Calculate tokenB amount based on tokenA input
          result = (amount * poolRatio.reserveB) / poolRatio.reserveA;
        } else {
          // Calculate tokenA amount based on tokenB input
          result = (amount * poolRatio.reserveA) / poolRatio.reserveB;
        }

        return ethers.formatUnits(result, outputToken.decimals);
      } catch (error) {
        console.error("Error calculating paired amount:", error);
        return "";
      }
    },
    [poolRatio, tokenA.address]
  );

  // Handle amount changes with auto calculation for existing pools
  const handleAmountAChange = (value: string) => {
    console.log("handleAmountAChange called with value:", value);
    console.log("Current poolExists state:", poolExists);

    // Ensure we accept the value unconditionally
    setAmountA(value);

    // Only auto-calculate if pool definitely exists (not undefined or false)
    if (poolExists === true && poolRatio) {
      console.log("Auto-calculating token B amount based on pool ratio");
      setAmountB(calculatePairedAmount(value, tokenA, tokenB));
    }
  };

  const handleAmountBChange = (value: string) => {
    console.log("handleAmountBChange called with value:", value);
    console.log("Current poolExists state:", poolExists);

    // Ensure we accept the value unconditionally
    setAmountB(value);

    // Only auto-calculate if pool definitely exists (not undefined or false)
    if (poolExists === true && poolRatio) {
      console.log("Auto-calculating token A amount based on pool ratio");
      setAmountA(calculatePairedAmount(value, tokenB, tokenA));
    }
  };

  // Get the relevant balance for the selected token
  const getTokenBalance = (token: Token): string => {
    if (token.address === CONTRACT_ADDRESSES.monadTestnet.usdc) {
      return balances.usdc;
    } else if (token.address === OFFICIAL_WMON_ADDRESS) {
      return balances.wmon;
    } else if (token.address === "NATIVE") {
      return balances.mon; // Native MON balance
    }
    return "0";
  };

  // Calculate minimum amounts based on slippage tolerance
  const calculateMinAmount = (amount: string, decimals: number): string => {
    if (!amount || parseFloat(amount) === 0) return "0";

    const parsedAmount = ethers.parseUnits(amount, decimals);
    const slippageFactor = 1 - parseFloat(slippageTolerance) / 100;
    const minAmount =
      (parsedAmount * BigInt(Math.floor(slippageFactor * 10000))) /
      BigInt(10000);

    return minAmount.toString();
  };

  // Handle liquidity addition
  const handleAddLiquidity = async () => {
    if (!user) {
      showToast.error("Please log in first");
      return;
    }

    if (
      !amountA ||
      parseFloat(amountA) === 0 ||
      !amountB ||
      parseFloat(amountB) === 0
    ) {
      showToast.error("Please enter amounts for both tokens");
      return;
    }

    // Check if amounts exceed balances
    if (parseFloat(amountA) > parseFloat(getTokenBalance(tokenA))) {
      showToast.error(`Insufficient ${tokenA.symbol} balance`);
      return;
    }

    if (parseFloat(amountB) > parseFloat(getTokenBalance(tokenB))) {
      showToast.error(`Insufficient ${tokenB.symbol} balance`);
      return;
    }

    setIsAddingLiquidity(true);

    try {
      // Log if we're creating a new pool or adding to existing
      if (!poolExists) {
        console.log("Creating new pool or resetting empty pool");
      } else {
        console.log("Adding to existing pool with ratio", poolRatio);
      }

      // Set deadline to 20 minutes from now
      const deadline = getDeadlineTimestamp(20);

      // Check if we're using native MON (in which case we should use addLiquidityETH)
      const isUsingNativeMON =
        tokenA.address === "NATIVE" || tokenB.address === "NATIVE";

      // When using native MON, ensure it's always tokenB for consistency with addLiquidityETH
      let actualTokenA = tokenA;
      let actualTokenB = tokenB;
      let actualAmountA = amountA;
      let actualAmountB = amountB;

      if (tokenA.address === "NATIVE") {
        // Swap positions - addLiquidityETH expects the token to be first and ETH to be second
        actualTokenA = tokenB;
        actualTokenB = tokenA;
        actualAmountA = amountB;
        actualAmountB = amountA;
      }

      // Log the operation being performed
      console.log(`Adding liquidity:`, {
        tokenA: actualTokenA.symbol,
        tokenB: actualTokenB.symbol,
        amountA: actualAmountA,
        amountB: actualAmountB,
        isUsingNativeMON,
        fee: FIXED_FEE.displayName,
      });

      // If this is a "new pool" but actually has dust in it, we should handle this specially
      if (
        !poolExists &&
        pairAddress &&
        pairAddress !== "0x0000000000000000000000000000000000000000"
      ) {
        try {
          // Check if there are dust amounts in the pool
          const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL
          );
          const pairContract = new ethers.Contract(
            pairAddress,
            [
              "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
              "function token0() external view returns (address)",
              "function totalSupply() view returns (uint)",
            ],
            provider
          );

          const [reserves, token0, totalSupply] = await Promise.all([
            pairContract.getReserves(),
            pairContract.token0(),
            pairContract.totalSupply(),
          ]);

          // Log pool details for debugging
          console.log(
            `Pool total supply: ${ethers.formatUnits(totalSupply, 18)}`
          );

          // Determine which reserve is which based on token order
          const isTokenAZero =
            actualTokenA.address.toLowerCase() === token0.toLowerCase();
          const reserveA = isTokenAZero
            ? BigInt(reserves[0])
            : BigInt(reserves[1]);
          const reserveB = isTokenAZero
            ? BigInt(reserves[1])
            : BigInt(reserves[0]);

          // Format to human-readable numbers
          const reserveAValue = Number(
            ethers.formatUnits(reserveA, actualTokenA.decimals)
          );
          const reserveBValue = Number(
            ethers.formatUnits(reserveB, actualTokenB.decimals)
          );

          console.log(
            `Pool reserves: ${reserveAValue} ${actualTokenA.symbol}, ${reserveBValue} ${actualTokenB.symbol}`
          );

          // Check if the pool has significant reserves
          const SIGNIFICANT_AMOUNT = 0.05; // Higher threshold to match DUST_THRESHOLD
          if (
            reserveAValue > SIGNIFICANT_AMOUNT ||
            reserveBValue > SIGNIFICANT_AMOUNT
          ) {
            console.warn(
              "Pool has existing reserves. You must follow the exact ratio:"
            );
            console.warn(
              `Current ratio: 1 ${actualTokenA.symbol} = ${
                reserveBValue / reserveAValue
              } ${actualTokenB.symbol}`
            );

            // Calculate exact amounts needed based on the current ratio to help users
            const inputAmountA = parseFloat(actualAmountA || "0");
            const inputAmountB = parseFloat(actualAmountB || "0");

            if (inputAmountA > 0) {
              const neededAmountB =
                inputAmountA * (reserveBValue / reserveAValue);
              console.warn(
                `For ${inputAmountA} ${
                  actualTokenA.symbol
                }, you need exactly ${neededAmountB.toFixed(6)} ${
                  actualTokenB.symbol
                }`
              );
            }

            if (inputAmountB > 0) {
              const neededAmountA =
                inputAmountB * (reserveAValue / reserveBValue);
              console.warn(
                `For ${inputAmountB} ${
                  actualTokenB.symbol
                }, you need exactly ${neededAmountA.toFixed(6)} ${
                  actualTokenA.symbol
                }`
              );
            }
          }
        } catch (error) {
          console.error("Error checking dust amounts:", error);
        }
      }

      if (isUsingNativeMON) {
        console.log("==== NATIVE MON LIQUIDITY FLOW ====");
        console.log("Input values:", {
          tokenA: tokenA.symbol,
          tokenB: tokenB.symbol,
          amountA,
          amountB,
          tokenA_address: tokenA.address,
          tokenB_address: tokenB.address,
        });

        // For native MON, use the addLiquidityETH function
        // When using native MON, the token must be the non-MON token
        const tokenAddress =
          actualTokenA.address === "NATIVE"
            ? OFFICIAL_WMON_ADDRESS
            : actualTokenA.address;

        console.log("Adjusted tokens:", {
          actualTokenA: actualTokenA.symbol,
          actualTokenB: actualTokenB.symbol,
          tokenAddress: tokenAddress,
          isTokenANative: actualTokenA.address === "NATIVE",
          isTokenBNative: actualTokenB.address === "NATIVE",
        });

        // Convert amounts to wei
        const amountTokenWei = ethers
          .parseUnits(actualAmountA, actualTokenA.decimals)
          .toString();
        const amountETHWei = ethers
          .parseUnits(actualAmountB, actualTokenB.decimals)
          .toString();

        console.log("Amounts in wei:", {
          amountTokenWei,
          amountETHWei,
        });

        // Calculate minimum amounts with slippage tolerance
        // Use a slightly higher slippage for native MON to account for potential price movements
        const effectiveSlippage = parseFloat(slippageTolerance) + 0.1;
        const slippageFactor = 1 - effectiveSlippage / 100;

        const amountTokenMin =
          (BigInt(amountTokenWei) *
            BigInt(Math.floor(slippageFactor * 10000))) /
          BigInt(10000);
        const amountETHMin =
          (BigInt(amountETHWei) * BigInt(Math.floor(slippageFactor * 10000))) /
          BigInt(10000);

        console.log("Slippage calculation:", {
          slippageTolerance,
          effectiveSlippage,
          slippageFactor,
          amountTokenMin: amountTokenMin.toString(),
          amountETHMin: amountETHMin.toString(),
        });

        // Important: Ensure we're sending the actual MON amount, not the minimum
        const monadAmountToSend = amountETHWei;

        console.log("Add liquidity params:", {
          token: tokenAddress,
          amountTokenDesired: amountTokenWei,
          amountTokenMin: amountTokenMin.toString(),
          amountETHMin: amountETHMin.toString(),
          monadAmountToSend,
          deadline,
        });

        // Execute addLiquidityETH - use lower amountETHMin for slippage protection,
        // but ensure the actual ETH value is what we want to add
        const result = await addLiquidityETH({
          token: tokenAddress,
          amountTokenDesired: amountTokenWei,
          amountTokenMin: amountTokenMin.toString(),
          amountETHMin: amountETHMin.toString(),
          to: "", // Will be replaced with smart wallet address in the hook
          deadline,
        });

        if (result.success) {
          // Reset input fields
          setAmountA("");
          setAmountB("");
          // Refresh balances
          refreshBalances();
          // Refresh pool info after adding liquidity
          setTimeout(checkPoolExists, 5000);
        } else {
          showToast.error(result.error || "Failed to add liquidity");
        }
      } else {
        // Regular addLiquidity for token-token pairs (including WMON-token)
        // Convert amounts to wei
        const amountAWei = ethers
          .parseUnits(amountA, tokenA.decimals)
          .toString();
        const amountBWei = ethers
          .parseUnits(amountB, tokenB.decimals)
          .toString();

        // Calculate minimum amounts with slippage tolerance
        const amountAMin = calculateMinAmount(amountA, tokenA.decimals);
        const amountBMin = calculateMinAmount(amountB, tokenB.decimals);

        // Execute regular addLiquidity
        const result = await addLiquidity({
          tokenA: tokenA.address,
          tokenB: tokenB.address,
          amountADesired: amountAWei,
          amountBDesired: amountBWei,
          amountAMin,
          amountBMin,
          to: "", // Will be replaced with smart wallet address in the hook
          deadline,
        });

        if (result.success) {
          // Reset input fields
          setAmountA("");
          setAmountB("");
          // Refresh balances
          refreshBalances();
          // Refresh pool info after adding liquidity
          setTimeout(checkPoolExists, 5000);
        } else {
          showToast.error(result.error || "Failed to add liquidity");
        }
      }
    } catch (error) {
      console.error("Error adding liquidity:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to add liquidity"
      );
    } finally {
      setIsAddingLiquidity(false);
    }
  };

  // Handle slippage tolerance change
  const handleSlippageChange = (value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      if (value === "" || parseFloat(value) <= 100) {
        setSlippageTolerance(value);
      }
    }
  };

  // Format display ratio between tokens
  const getDisplayRatio = () => {
    if (!poolRatio) return null;

    try {
      // Calculate how many of token B for 1 of token A
      const oneTokenA = ethers.parseUnits("1", tokenA.decimals);
      const equivalentTokenB =
        (oneTokenA * poolRatio.reserveB) / poolRatio.reserveA;
      return ethers.formatUnits(equivalentTokenB, tokenB.decimals);
    } catch (error) {
      console.error("Error calculating ratio:", error);
      return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#1e1e2a] rounded-2xl shadow-md p-6 text-white">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Add Liquidity</h2>
        <p className="text-sm text-gray-400 mt-1">
          Add liquidity to receive LP tokens
        </p>
      </div>

      {/* Pool exists indicator */}
      {poolExists !== undefined && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            poolExists
              ? "bg-blue-900/30 text-blue-400 border border-blue-800/50"
              : "bg-yellow-900/30 text-yellow-400 border border-yellow-800/50"
          }`}
        >
          {poolExists ? (
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <span className="font-medium">Existing Pool</span>
                <p className="text-xs mt-1">
                  Tokens will be added according to the current pool ratio.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <span className="font-medium">New or Empty Pool</span>
                <p className="text-xs mt-1">
                  You are creating a new pool or resetting an empty one. Your
                  input will set the price ratio.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fee - Just show the fixed fee */}
      <div className="mb-4">
        <label className="text-sm text-gray-400 block mb-2">Fee</label>
        <div className="w-full flex items-center bg-gray-800 p-3 rounded-lg border border-gray-700">
          <div className="flex-1">
            <div className="flex items-center">
              <span className="text-white font-medium mr-2">
                {FIXED_FEE.displayName}
              </span>
              <span className="bg-blue-900/40 text-blue-400 text-xs px-2 py-1 rounded border border-blue-800/40">
                Standard
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {FIXED_FEE.description}
            </p>
          </div>
        </div>
      </div>

      {/* If it's an existing pool, show the ratio */}
      {poolExists && poolRatio && (
        <div className="mb-4 text-sm text-center text-gray-400">
          <span>
            Pool Ratio: 1 {tokenA.symbol} = {getDisplayRatio()} {tokenB.symbol}
          </span>
        </div>
      )}

      {/* First token input */}
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm text-gray-400">Input</label>
          <div className="text-sm text-gray-400">
            Balance:{" "}
            <span className="font-medium">{getTokenBalance(tokenA)}</span>
          </div>
        </div>
        <AmountInput
          value={amountA}
          onChange={handleAmountAChange}
          max={getTokenBalance(tokenA)}
          showMaxButton
          onMaxClick={() => handleAmountAChange(getTokenBalance(tokenA))}
          disabled={isLoading}
        />
        <div className="mt-2">
          <TokenSelector
            selectedToken={tokenA}
            onTokenSelect={(token) => {
              setTokenA(token);
              if (token.address === tokenB.address) {
                // Swap tokens if the same one is selected
                setTokenB(tokenA);
              }
            }}
            tokens={TOKENS}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Plus sign */}
      <div className="flex justify-center my-4">
        <div className="p-2 bg-gray-800 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      </div>

      {/* Second token input */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm text-gray-400">Input</label>
          <div className="text-sm text-gray-400">
            Balance:{" "}
            <span className="font-medium">{getTokenBalance(tokenB)}</span>
          </div>
        </div>
        <AmountInput
          value={amountB}
          onChange={handleAmountBChange}
          max={getTokenBalance(tokenB)}
          showMaxButton
          onMaxClick={() => handleAmountBChange(getTokenBalance(tokenB))}
          disabled={isLoading || (poolExists && poolRatio !== null)}
        />
        <div className="mt-2">
          <TokenSelector
            selectedToken={tokenB}
            onTokenSelect={(token) => {
              setTokenB(token);
              if (token.address === tokenA.address) {
                // Swap tokens if the same one is selected
                setTokenA(tokenB);
              }
            }}
            tokens={TOKENS.filter((t) => t.address !== tokenA.address)}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Slippage settings */}
      <div className="mb-6 p-3 bg-gray-800 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Slippage tolerance</span>
          <div className="flex items-center">
            <input
              type="text"
              value={slippageTolerance}
              onChange={(e) => handleSlippageChange(e.target.value)}
              className="w-12 px-2 py-1 text-right bg-gray-700 border border-gray-600 rounded-md text-white text-sm"
            />
            <span className="ml-1 text-sm text-gray-300">%</span>
          </div>
        </div>
      </div>

      {/* Add liquidity button */}
      <PrimaryButton
        onClick={handleAddLiquidity}
        disabled={!user || isLoading || !amountA || !amountB}
        isLoading={isLoading}
        fullWidth
      >
        {!user
          ? "Connect Wallet"
          : !amountA || !amountB
          ? "Enter amounts"
          : "Add Liquidity"}
      </PrimaryButton>

      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-900/30 text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Information card */}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Information</h3>
        {poolExists ? (
          <>
            <p className="text-xs text-gray-400 mb-2">
              • Adding liquidity to an existing pool must follow the current
              price ratio
            </p>
            <p className="text-xs text-gray-400 mb-2">
              • The second token amount is automatically calculated
            </p>
            <p className="text-xs text-gray-400">
              • LP tokens represent your position and allow you to reclaim your
              assets
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2">
              • Adding liquidity to this empty pool will set the initial
              exchange rate
            </p>
            <p className="text-xs text-gray-400 mb-2">
              • Empty pools allow you to set any price ratio you want
            </p>
            <p className="text-xs text-gray-400 mb-2">
              • LP tokens represent your position and allow you to reclaim your
              assets
            </p>
            <p className="text-xs text-gray-400">
              • You can add equal values of both tokens for the best results
            </p>
          </>
        )}
      </div>
    </div>
  );
}
