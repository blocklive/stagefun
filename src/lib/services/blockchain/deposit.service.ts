import { ethers } from "ethers";
import {
  getUSDCContract,
  getPoolContract,
  getContractAddresses,
} from "../../contracts/StageDotFunPool";
import { StageDotFunPoolABI } from "../../contracts/StageDotFunPool";
import { getRecommendedGasParams } from "../../contracts/gas-utils";

export interface DepositRequirements {
  tierIdValid: boolean;
  tierActive: boolean;
  poolActive: boolean;
  notFunded: boolean;
  notEnded: boolean;
  withinCap: boolean;
  patronsCheck: boolean;
}

export interface DepositResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class DepositService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;

  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  async checkDepositRequirements(
    poolAddress: string,
    tierId: number,
    tierPrice: bigint
  ): Promise<{ requirements: DepositRequirements; error?: string }> {
    try {
      // Use the pre-defined ABI instead of custom one
      const poolContract = getPoolContract(this.provider, poolAddress);
      const poolDetails = await poolContract.getPoolDetails();
      const targetTier = await poolContract.getTier(tierId);
      const now = Math.floor(Date.now() / 1000);

      const requirements: DepositRequirements = {
        tierIdValid: tierId < poolDetails._tierCount,
        tierActive: targetTier.isActive, // Using named property instead of array index
        poolActive: Number(poolDetails._status) === 1,
        notFunded: poolDetails._totalDeposits < poolDetails._targetAmount,
        notEnded: now <= poolDetails._endTime,
        withinCap:
          poolDetails._totalDeposits + tierPrice <= poolDetails._capAmount,
        patronsCheck:
          targetTier.maxPatrons === BigInt(0) ||
          targetTier.currentPatrons < targetTier.maxPatrons,
      };

      return { requirements };
    } catch (error) {
      return {
        requirements: {
          tierIdValid: false,
          tierActive: false,
          poolActive: false,
          notFunded: false,
          notEnded: false,
          withinCap: false,
          patronsCheck: false,
        },
        error:
          error instanceof Error
            ? error.message
            : "Failed to check requirements",
      };
    }
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

  async approveUSDC(
    poolAddress: string,
    amount: bigint
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.signer) {
      return {
        success: false,
        error: "Signer not available. Use smart wallet methods instead.",
      };
    }

    try {
      const usdcContract = getUSDCContract(this.provider);
      const usdcInterface = new ethers.Interface([
        "function approve(address spender, uint256 value) returns (bool)",
      ]);

      const approvalData = usdcInterface.encodeFunctionData("approve", [
        poolAddress,
        amount,
      ]);

      const signerAddress = await this.signer.getAddress();
      const tx = await this.signer.sendTransaction({
        to: getContractAddresses().usdc,
        data: approvalData,
        value: "0",
        from: signerAddress,
        chainId: 10143, // Monad Testnet
        ...getRecommendedGasParams(),
      });

      const receipt = await tx.wait();
      if (!receipt?.status) {
        throw new Error("USDC approval failed");
      }

      return { success: true, txHash: tx.hash };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to approve USDC",
      };
    }
  }

  async commitToTier(
    poolAddress: string,
    tierId: number,
    tierPrice: bigint
  ): Promise<DepositResult> {
    if (!this.signer) {
      return {
        success: false,
        error: "Signer not available. Use smart wallet methods instead.",
      };
    }

    try {
      const poolContract = getPoolContract(this.provider, poolAddress);
      const poolInterface = new ethers.Interface(StageDotFunPoolABI);
      const commitData = poolInterface.encodeFunctionData("commitToTier", [
        BigInt(tierId),
        tierPrice,
      ]);

      const signerAddress = await this.signer.getAddress();
      const tx = await this.signer.sendTransaction({
        to: poolAddress,
        data: commitData,
        value: "0",
        from: signerAddress,
        chainId: 10143, // Monad Testnet
        ...getRecommendedGasParams(),
      });

      const receipt = await tx.wait();
      if (!receipt?.status) {
        throw new Error("Transaction failed on chain");
      }

      return { success: true, txHash: tx.hash };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to commit to tier",
      };
    }
  }

  async getTierDetails(
    poolAddress: string,
    tierId: number
  ): Promise<{
    success: boolean;
    tier?: any;
    error?: string;
  }> {
    try {
      // Use the pre-defined ABI instead of custom one
      const poolContract = getPoolContract(this.provider, poolAddress);
      const tier = await poolContract.getTier(tierId);
      return { success: true, tier };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get tier details",
      };
    }
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
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
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
        "Approve USDC for Pool Deposit"
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

  async commitToTierWithSmartWallet(
    callContractFunction: (
      contractAddress: `0x${string}`,
      abi: any,
      functionName: string,
      args: any[],
      description: string
    ) => Promise<{ success: boolean; error?: string; txHash?: string }>,
    poolAddress: string,
    tierId: number,
    tierPrice: bigint
  ): Promise<DepositResult> {
    try {
      // Call commitToTier function on pool contract using smart wallet
      const result = await callContractFunction(
        poolAddress as `0x${string}`,
        StageDotFunPoolABI,
        "commitToTier",
        [BigInt(tierId), tierPrice],
        "Commit to Pool Tier"
      );

      if (!result.success || !result.txHash) {
        throw new Error(result.error || "Failed to commit to tier");
      }

      return { success: true, txHash: result.txHash };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to commit to tier",
      };
    }
  }

  // Add a new method to check user tier commitments
  async getUserTierCommitments(
    poolAddress: string,
    userAddress: string
  ): Promise<{ success: boolean; commitments?: number[]; error?: string }> {
    try {
      const poolContract = getPoolContract(this.provider, poolAddress);

      // Call the getUserTierCommitments function from the smart contract
      const tierCommitments = await poolContract.getUserTierCommitments(
        userAddress
      );

      console.log("User tier commitments:", {
        user: userAddress,
        commitments: tierCommitments.map((tier: bigint) => tier.toString()),
      });

      return {
        success: true,
        commitments: tierCommitments.map((tier: bigint) => Number(tier)),
      };
    } catch (error) {
      console.error("Error getting user tier commitments:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get user tier commitments",
      };
    }
  }
}
