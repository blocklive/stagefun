import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { getFactoryContract } from "@/lib/contracts/StageSwap";

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
}

interface PoolRatio {
  reserveA: bigint;
  reserveB: bigint;
}

export function usePoolManager(tokenA: Token, tokenB: Token) {
  const [poolExists, setPoolExists] = useState<boolean>(false);
  const [poolRatio, setPoolRatio] = useState<PoolRatio | null>(null);
  const [pairAddress, setPairAddress] = useState<string | null>(null);

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

  // Calculate paired amount based on pool ratio
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

  // Format display ratio between tokens
  const getDisplayRatio = useCallback(() => {
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
  }, [poolRatio, tokenA.decimals, tokenB.decimals]);

  // Call this when tokens change
  useEffect(() => {
    console.log("Token change effect triggered");
    checkPoolExists();
  }, [tokenA.address, tokenB.address, checkPoolExists]);

  return {
    poolExists,
    poolRatio,
    pairAddress,
    checkPoolExists,
    calculatePairedAmount,
    getDisplayRatio,
  };
}
