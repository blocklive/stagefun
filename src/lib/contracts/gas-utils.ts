import { ethers } from "ethers";

/**
 * Returns the recommended gas parameters for transactions
 * @returns Gas parameters object with maxFeePerGas and maxPriorityFeePerGas
 */
export function getRecommendedGasParams() {
  return {
    maxFeePerGas: ethers.parseUnits("52", "gwei"), // 50 (base) + 2 (priority)
    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
  };
}

/**
 * Returns the recommended gas parameters for transactions as string values
 * (for use with Privy's sendTransaction)
 * @returns Gas parameters object with string values for maxFeePerGas and maxPriorityFeePerGas
 */
export function getRecommendedGasParamsAsStrings() {
  return {
    maxFeePerGas: ethers.parseUnits("52", "gwei").toString(), // 50 (base) + 2 (priority)
    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei").toString(),
  };
}
