import { ethers } from "ethers";
import {
  getUSDCContract,
  getPoolContract,
  getContractAddresses,
  StageDotFunPoolABI,
} from "../../contracts/StageDotFunPool";

export interface RevenueResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class RevenueService {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  async checkUSDCAllowance(
    signerAddress: string,
    poolAddress: string,
    requiredAmount: bigint
  ): Promise<{ hasEnoughAllowance: boolean; currentAllowance: bigint }> {
    const usdcContract = getUSDCContract(this.provider);
    const currentAllowance = await usdcContract.allowance(
      signerAddress,
      poolAddress
    );
    return {
      hasEnoughAllowance: currentAllowance >= requiredAmount,
      currentAllowance,
    };
  }

  async approveUSDCWithSmartWallet(
    callContractFunction: (
      contractAddress: `0x${string}`,
      abi: any,
      functionName: string,
      args: any[],
      description: string
    ) => Promise<{ success: boolean; error?: string; txHash?: string }>,
    poolAddress: string,
    amount: bigint
  ): Promise<RevenueResult> {
    try {
      const usdcAddress = getContractAddresses().usdc as `0x${string}`;
      const usdcABI = [
        "function approve(address spender, uint256 value) returns (bool)",
      ];

      // Call approve function on USDC contract using smart wallet
      const result = await callContractFunction(
        usdcAddress,
        usdcABI,
        "approve",
        [poolAddress, amount],
        "Approve USDC for Revenue Deposit"
      );

      if (!result.success || !result.txHash) {
        throw new Error(result.error || "Failed to approve USDC");
      }

      return { success: true, txHash: result.txHash };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to approve USDC",
      };
    }
  }

  async depositRevenueWithSmartWallet(
    callContractFunction: (
      contractAddress: `0x${string}`,
      abi: any,
      functionName: string,
      args: any[],
      description: string
    ) => Promise<{ success: boolean; error?: string; txHash?: string }>,
    poolAddress: string,
    amount: bigint
  ): Promise<RevenueResult> {
    try {
      // Call receiveRevenue function on pool contract using smart wallet
      const result = await callContractFunction(
        poolAddress as `0x${string}`,
        StageDotFunPoolABI,
        "receiveRevenue",
        [amount],
        `Depositing USDC as revenue to pool`
      );

      if (!result.success || !result.txHash) {
        throw new Error(result.error || "Failed to deposit revenue");
      }

      return { success: true, txHash: result.txHash };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to deposit revenue",
      };
    }
  }

  // Utility method to check if address has enough USDC balance
  async checkUSDCBalance(
    address: string,
    requiredAmount: bigint
  ): Promise<{ hasEnoughBalance: boolean; balance: bigint }> {
    try {
      const usdcContract = getUSDCContract(this.provider);
      const balance = await usdcContract.balanceOf(address);

      return {
        hasEnoughBalance: balance >= requiredAmount,
        balance,
      };
    } catch (error) {
      console.error("Error checking USDC balance:", error);
      throw error;
    }
  }
}
