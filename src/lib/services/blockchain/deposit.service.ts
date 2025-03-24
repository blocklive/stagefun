import { ethers } from "ethers";
import {
  getUSDCContract,
  getPoolContract,
  getContractAddresses,
} from "../../contracts/StageDotFunPool";
import { StageDotFunPoolABI } from "../../contracts/StageDotFunPool";

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
  private signer: ethers.Signer;

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  async checkDepositRequirements(
    poolAddress: string,
    tierId: number,
    tierPrice: bigint
  ): Promise<{ requirements: DepositRequirements; error?: string }> {
    try {
      const poolContract = getPoolContract(this.provider, poolAddress);
      const poolDetails = await poolContract.getPoolDetails();
      const targetTier = await poolContract.getTier(tierId);
      const now = Math.floor(Date.now() / 1000);

      const requirements: DepositRequirements = {
        tierIdValid: tierId < poolDetails._tierCount,
        tierActive: targetTier[2], // isActive is the third element
        poolActive: Number(poolDetails._status) === 1,
        notFunded: poolDetails._totalDeposits < poolDetails._targetAmount,
        notEnded: now <= poolDetails._endTime,
        withinCap:
          poolDetails._totalDeposits + tierPrice <= poolDetails._capAmount,
        patronsCheck:
          targetTier[7] === BigInt(0) || targetTier[8] < targetTier[7],
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
        gasLimit: 5000000,
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
}
