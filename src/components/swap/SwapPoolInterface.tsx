"use client";

import React, { useState, useCallback, useEffect, Suspense } from "react";
import { ethers } from "ethers";
import { usePrivy } from "@privy-io/react-auth";
import { useWalletAssetsAdapter } from "@/hooks/useWalletAssetsAdapter";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { useTokenList } from "@/hooks/useTokenList";
import { useTokenResolver } from "@/hooks/useTokenResolver";
import { TokenInfo } from "@/types/tokens";
import { Token } from "@/types/token";
import { useSearchParams } from "next/navigation";

// Import all the new components
import { PoolStatusCard } from "./PoolStatusCard";
import { FeeDisplay } from "./FeeDisplay";
import { PoolRatioDisplay } from "./PoolRatioDisplay";
import { TokenInputSection } from "./TokenInputSection";
import { SlippageSettings } from "./SlippageSettings";
import { InfoCard } from "./InfoCard";
import { LiquidityActions } from "./LiquidityActions";

// Import custom hooks
import { usePoolManager } from "@/hooks/usePoolManager";
import { useSmartWallet } from "@/hooks/useSmartWallet";

// Define Token interface
interface SwapToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  isCustom?: boolean;
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
const CORE_TOKENS: SwapToken[] = [
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

// Adding formatTokenAmount function based on WalletAssets.tsx
const formatTokenAmount = (quantity: number, decimals: number = 4): string => {
  // For very small numbers, use scientific notation below a certain threshold
  if (quantity > 0 && quantity < 0.000001) {
    return quantity.toExponential(6);
  }

  // Otherwise use regular formatting with appropriate decimals
  const maxDecimals = Math.min(decimals, 6);

  return quantity.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
};

export function SwapPoolInterface() {
  const { user } = usePrivy();
  const { smartWalletAddress } = useSmartWallet();

  // Set a loading state for initial render
  const [initialLoading, setInitialLoading] = useState(true);

  // Get all tokens including custom ones
  const { customTokens } = useTokenList();
  const [allTokens, setAllTokens] = useState<SwapToken[]>(CORE_TOKENS);

  // Combine core tokens with custom tokens
  useEffect(() => {
    setAllTokens([...CORE_TOKENS, ...(customTokens as any)]);
  }, [customTokens]);

  // Token state
  const [tokenA, setTokenA] = useState<SwapToken>(CORE_TOKENS[0]); // USDC
  const [tokenB, setTokenB] = useState<SwapToken>(CORE_TOKENS[1]); // MON

  // Amounts state
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  // Create stable callback functions for token changes
  const handleTokenAChange = useCallback(
    (token: TokenInfo) => {
      // If the user selects the same token that's already in the second position,
      // swap the tokens to prevent having the same token in both positions
      if (token.address === tokenB.address) {
        setTokenA(tokenB);
        setTokenB(token as any);
      } else {
        setTokenA(token as any);
      }
    },
    [tokenB]
  );

  const handleTokenBChange = useCallback(
    (token: TokenInfo) => {
      // If the user selects the same token that's already in the first position,
      // swap the tokens to prevent having the same token in both positions
      if (token.address === tokenA.address) {
        setTokenB(tokenA);
        setTokenA(token as any);
      } else {
        setTokenB(token as any);
      }
    },
    [tokenA]
  );

  // Create stable amount change handlers
  const handleAmountAFromParams = useCallback((value: string) => {
    console.log(`Setting amountA from params: ${value}`);
    setAmountA(value);
  }, []);

  const handleAmountBFromParams = useCallback((value: string) => {
    console.log(`Setting amountB from params: ${value}`);
    setAmountB(value);
  }, []);

  // Use our new token resolver hook - it will handle query parameters
  const { source, isLoadingTokens } = useTokenResolver({
    initialTokens: allTokens as any,
    onTokenAChange: handleTokenAChange,
    onTokenBChange: handleTokenBChange,
    onAmountAChange: handleAmountAFromParams,
    onAmountBChange: handleAmountBFromParams,
  });

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
  } = usePoolManager(tokenA as any, tokenB as any);

  // Get token balances using the WalletAssetsAdapter hook for consistency with swap page
  const {
    assets,
    isLoading: assetsLoading,
    refresh: refreshBalances,
  } = useWalletAssetsAdapter(smartWalletAddress, "monad-test-v2", {
    useZerion: false, // Only use Alchemy
    combineData: false, // Don't use combined data
  });

  // When assets are loaded for the first time, set initialLoading to false
  useEffect(() => {
    if (assets && assets.length > 0 && initialLoading) {
      setInitialLoading(false);
    }
  }, [assets, initialLoading]);

  // Balance loading state - show loading when assets are loading OR during initial load
  const balanceLoading = assetsLoading || initialLoading;

  // Combined loading state
  const isLoading = isAddingLiquidity || isLoadingTokens;

  // Handle amount changes with auto calculation for existing pools
  const handleAmountAChange = (value: string) => {
    console.log("handleAmountAChange called with value:", value);
    console.log("Current poolExists state:", poolExists);

    // Ensure we accept the value unconditionally
    setAmountA(value);

    // Only auto-calculate if pool definitely exists (not undefined or false)
    if (poolExists === true && poolRatio) {
      console.log("Auto-calculating token B amount based on pool ratio");
      setAmountB(calculatePairedAmount(value, tokenA as any, tokenB as any));
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
      setAmountA(calculatePairedAmount(value, tokenB as any, tokenA as any));
    }
  };

  // Get the relevant balance for the selected token from Zerion assets
  const getTokenBalance = (token: SwapToken): string => {
    if (!assets) return "0";

    // Find the asset that matches the token
    const asset = assets.find((asset) => {
      const implementation =
        asset.attributes.fungible_info?.implementations?.[0];

      // Handle native MON
      if (
        token.address === "NATIVE" &&
        (asset.id === "base-monad-test-v2-asset-asset" ||
          (asset.attributes.fungible_info?.symbol === "MON" &&
            !implementation?.address))
      ) {
        return true;
      }

      // Handle regular tokens by checking address
      if (
        implementation?.address &&
        implementation.address.toLowerCase() === token.address.toLowerCase()
      ) {
        return true;
      }

      // Match by symbol as fallback
      return asset.attributes.fungible_info?.symbol === token.symbol;
    });

    // Format the balance using formatTokenAmount instead of formatAmount
    if (asset) {
      const quantity = asset.attributes.quantity.float;
      const tokenDecimals =
        asset.attributes.quantity.decimals ||
        asset.attributes.fungible_info?.implementations?.[0]?.decimals ||
        (token.symbol === "USDC" ? 6 : 18);
      return formatTokenAmount(quantity, tokenDecimals);
    }

    return "0";
  };

  // Calculate minimum amounts based on slippage tolerance
  const calculateMinAmount = (amount: string, decimals: number): string => {
    if (!amount || parseFloat(amount) === 0) return "0";

    console.log(
      `Calculating min amount for ${amount} with ${decimals} decimals`
    );
    const parsedAmount = ethers.parseUnits(amount, decimals);
    const slippageFactor = 1 - parseFloat(slippageTolerance) / 100;
    const minAmount =
      (parsedAmount * BigInt(Math.floor(slippageFactor * 10000))) /
      BigInt(10000);

    console.log(
      `Min amount result: ${minAmount.toString()} (${ethers.formatUnits(
        minAmount,
        decimals
      )})`
    );
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
      <PoolStatusCard
        poolExists={poolExists}
        tokenASymbol={tokenA.symbol}
        tokenBSymbol={tokenB.symbol}
        displayRatio={getDisplayRatio()}
      />

      {/* Fee - Just show the fixed fee */}
      <FeeDisplay fee={FIXED_FEE} />

      {/* First token input */}
      <TokenInputSection
        label="Input"
        value={amountA}
        onChange={handleAmountAChange}
        token={tokenA as any}
        onTokenSelect={(token) => handleTokenAChange(token as any)}
        tokens={allTokens as any}
        balance={getTokenBalance(tokenA)}
        disabled={isLoading}
        balanceLoading={balanceLoading}
      />

      {/* Second token input */}
      <div className="mb-6">
        <TokenInputSection
          label="Input"
          value={amountB}
          onChange={handleAmountBChange}
          token={tokenB as any}
          onTokenSelect={(token) => handleTokenBChange(token as any)}
          tokens={allTokens as any}
          balance={getTokenBalance(tokenB)}
          disabled={isLoading}
          secondaryDisabled={false}
          balanceLoading={balanceLoading}
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
        tokenA={tokenA as any}
        tokenB={tokenB as any}
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
