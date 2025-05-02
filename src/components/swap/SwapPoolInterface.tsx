import React, { useState, useCallback } from "react";
import { ethers } from "ethers";
import { usePrivy } from "@privy-io/react-auth";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Import all the new components
import { PoolStatusCard } from "./PoolStatusCard";
import { FeeDisplay } from "./FeeDisplay";
import { PoolRatioDisplay } from "./PoolRatioDisplay";
import { TokenInputSection } from "./TokenInputSection";
import { SlippageSettings } from "./SlippageSettings";
import { LiquidityActions } from "./LiquidityActions";
import { InfoCard } from "./InfoCard";

// Import custom hook for pool management
import { usePoolManager } from "@/hooks/usePoolManager";

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

  // Token state
  const [tokenA, setTokenA] = useState(TOKENS[0]); // USDC
  const [tokenB, setTokenB] = useState(TOKENS[1]); // MON

  // Amounts state
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  // Slippage tolerance
  const [slippageTolerance, setSlippageTolerance] = useState("0.5");

  // Loading state
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(false);

  // Use custom hook for pool-related logic
  const {
    poolExists,
    poolRatio,
    pairAddress,
    checkPoolExists,
    calculatePairedAmount,
    getDisplayRatio,
  } = usePoolManager(tokenA, tokenB);

  // Get token balances
  const {
    balances,
    isLoading: isBalanceLoading,
    refresh: refreshBalances,
  } = useTokenBalances();

  // Combined loading state
  const isLoading = isAddingLiquidity || isBalanceLoading;

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

  return (
    <div className="w-full max-w-md mx-auto bg-[#1e1e2a] rounded-2xl shadow-md p-6 text-white">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Add Liquidity</h2>
        <p className="text-sm text-gray-400 mt-1">
          Add liquidity to receive LP tokens
        </p>
      </div>

      {/* Pool exists indicator */}
      <PoolStatusCard poolExists={poolExists} />

      {/* Fee - Just show the fixed fee */}
      <FeeDisplay fee={FIXED_FEE} />

      {/* If it's an existing pool, show the ratio */}
      <PoolRatioDisplay
        poolExists={poolExists}
        tokenASymbol={tokenA.symbol}
        tokenBSymbol={tokenB.symbol}
        displayRatio={getDisplayRatio()}
      />

      {/* First token input */}
      <TokenInputSection
        label="Input"
        value={amountA}
        onChange={handleAmountAChange}
        token={tokenA}
        onTokenSelect={(token) => {
          setTokenA(token);
          if (token.address === tokenB.address) {
            // Swap tokens if the same one is selected
            setTokenB(tokenA);
          }
        }}
        tokens={TOKENS}
        balance={getTokenBalance(tokenA)}
        disabled={isLoading}
      />

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
        <TokenInputSection
          label="Input"
          value={amountB}
          onChange={handleAmountBChange}
          token={tokenB}
          onTokenSelect={(token) => {
            setTokenB(token);
            if (token.address === tokenA.address) {
              // Swap tokens if the same one is selected
              setTokenA(tokenB);
            }
          }}
          tokens={TOKENS.filter((t) => t.address !== tokenA.address)}
          balance={getTokenBalance(tokenB)}
          disabled={isLoading}
          secondaryDisabled={poolExists && poolRatio !== null}
        />
      </div>

      {/* Slippage settings */}
      <SlippageSettings
        slippageTolerance={slippageTolerance}
        onChange={setSlippageTolerance}
      />

      {/* Add liquidity button and error display */}
      <LiquidityActions
        user={user}
        tokenA={tokenA}
        tokenB={tokenB}
        amountA={amountA}
        amountB={amountB}
        slippageTolerance={slippageTolerance}
        poolExists={poolExists}
        poolRatio={poolRatio}
        pairAddress={pairAddress}
        isLoading={isLoading}
        checkPoolExists={checkPoolExists}
        setAmountA={setAmountA}
        setAmountB={setAmountB}
        getTokenBalance={getTokenBalance}
        calculateMinAmount={calculateMinAmount}
      />

      {/* Information card */}
      <InfoCard poolExists={poolExists} />
    </div>
  );
}
