import { ethers } from "ethers";
import {
  getUSDCContract,
  getPoolContract,
  getContractAddresses,
  getDetailedPoolStatus,
  PoolStatus,
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
    tierPrice: bigint,
    isZeroAmountVariableTier: boolean = false
  ): Promise<{ requirements: DepositRequirements; error?: string }> {
    try {
      // Use the pre-defined ABI instead of custom one
      const poolContract = getPoolContract(this.provider, poolAddress);
      const poolDetails = await poolContract.getPoolDetails();
      const targetTier = await poolContract.getTier(tierId);
      const now = Math.floor(Date.now() / 1000);

      // Get detailed status analysis
      const poolStatus = getDetailedPoolStatus(
        Number(poolDetails._status),
        poolDetails._totalDeposits,
        poolDetails._targetAmount,
        poolDetails._capAmount,
        poolDetails._endTime
      );

      // Additional debugging for the fund status
      console.log("Pool status analysis:", {
        ...poolStatus,
        totalDeposits: poolDetails._totalDeposits.toString(),
        targetAmount: poolDetails._targetAmount.toString(),
        capAmount: poolDetails._capAmount.toString(),
        endTime: Number(poolDetails._endTime),
        currentTime: now,
        isZeroAmountVariableTier,
        isNoCap: poolDetails._capAmount === BigInt(0),
      });

      // Special rule: Allow variable price tiers with 0 amount to commit to funded but not capped pools
      const notFundedRequirement = isZeroAmountVariableTier
        ? !poolStatus.isCapped // For 0 amount variable price tiers, only check if it's not capped
        : poolDetails._capAmount === BigInt(0)
        ? !poolStatus.isCapped // For no cap pools, allow deposits as long as not capped
        : !poolStatus.isFunded; // For capped pools, check if it's not funded

      const requirements: DepositRequirements = {
        tierIdValid: tierId < poolDetails._tierCount,
        tierActive: targetTier.isActive, // Using named property instead of array index
        poolActive:
          Number(poolDetails._status) === PoolStatus.ACTIVE ||
          Number(poolDetails._status) === PoolStatus.FUNDED,
        notFunded: notFundedRequirement,
        notEnded: now <= Number(poolDetails._endTime),
        withinCap:
          // If capAmount is 0, it means "no cap", so always pass this check
          poolDetails._capAmount === BigInt(0) ||
          poolDetails._totalDeposits + tierPrice <= poolDetails._capAmount,
        patronsCheck:
          targetTier.maxPatrons === BigInt(0) ||
          targetTier.currentPatrons < targetTier.maxPatrons,
      };

      // Log cap amount-specific details
      console.log("Cap amount check details:", {
        capAmount: poolDetails._capAmount.toString(),
        isNoCap: poolDetails._capAmount === BigInt(0),
        totalDeposits: poolDetails._totalDeposits.toString(),
        tierPrice: tierPrice.toString(),
        sum: (poolDetails._totalDeposits + tierPrice).toString(),
        withinCapCheck:
          poolDetails._totalDeposits + tierPrice <= poolDetails._capAmount,
        finalCheck: requirements.withinCap,
      });

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
    tier?: {
      name: string;
      price: bigint;
      isActive: boolean;
      nftMetadata: string;
      is_variable_price: boolean;
      minPrice: bigint;
      maxPrice: bigint;
      maxPatrons: bigint;
      currentPatrons: bigint;
    };
    error?: string;
  }> {
    try {
      const poolContract = new ethers.Contract(
        poolAddress,
        StageDotFunPoolABI,
        this.provider
      );

      console.log(`Getting tier details for tierId: ${tierId}`);

      // Call the getTier function
      const tierResponse = await poolContract.getTier(tierId);

      console.log("Raw tier response from contract:", tierResponse);

      if (!tierResponse) {
        return { success: false, error: "Failed to get tier details" };
      }

      // Make sure to correctly extract the isVariablePrice flag
      // The contract returns values in the order they're defined in the struct
      return {
        success: true,
        tier: {
          name: tierResponse[0],
          price: tierResponse[1],
          isActive: tierResponse[2],
          nftMetadata: tierResponse[3],
          is_variable_price: tierResponse[4], // Make sure this matches the contract struct order
          minPrice: tierResponse[5],
          maxPrice: tierResponse[6],
          maxPatrons: tierResponse[7],
          currentPatrons: tierResponse[8],
        },
      };
    } catch (error: any) {
      console.error("Error getting tier details:", error);
      return {
        success: false,
        error: `Failed to get tier details: ${error.message}`,
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
    amount: bigint
  ): Promise<{
    success: boolean;
    error?: string;
    txHash?: string;
  }> {
    try {
      // Additional logging details for variable price tier transactions
      console.log("Committing to tier with smart wallet:", {
        poolAddress,
        tierId,
        amount: amount.toString(),
        isZeroAmount: amount === BigInt(0),
      });

      // Check that we're dealing with a valid pool contract address
      if (!ethers.isAddress(poolAddress)) {
        return { success: false, error: "Invalid pool address" };
      }

      // Special handling for zero amounts - they are allowed for any tier type and any pool state
      console.log(
        `Amount is ${amount.toString()}, which is ${
          amount === BigInt(0)
            ? "0 - bypassing some validations"
            : "non-zero - normal validation applies"
        }`
      );

      // Call the commitToTier function on the pool contract
      console.log(
        `Calling contract function commitToTier(${tierId}, ${amount})`
      );
      const result = await callContractFunction(
        poolAddress as `0x${string}`,
        StageDotFunPoolABI,
        "commitToTier",
        [tierId, amount],
        "Commit to Tier"
      );

      console.log(`Contract commitToTier result:`, result);
      return result;
    } catch (error: any) {
      console.error("Error committing to tier:", error);
      return {
        success: false,
        error: `Failed to commit to tier: ${error.message}`,
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

      // Create a promise with timeout to prevent hanging requests
      const fetchCommitments = async () => {
        // Call the getUserTierCommitments function from the smart contract
        const tierCommitments = await poolContract.getUserTierCommitments(
          userAddress
        );

        console.log("User tier commitments:", {
          user: userAddress,
          commitments: tierCommitments.map((tier: bigint) => tier.toString()),
        });

        return tierCommitments.map((tier: bigint) => Number(tier));
      };

      // Create a timeout promise
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Commitment check timed out")), 8000);
      });

      // Race the commitments fetch against the timeout
      const commitments = await Promise.race([fetchCommitments(), timeout]);

      return {
        success: true,
        commitments,
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
