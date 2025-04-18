"use client";

import { Pool } from "../../../../lib/supabase";
import { formatCurrency, formatContractBalance } from "../../../../lib/utils";
import { useState, useEffect, useRef, useMemo } from "react";
import { ethers } from "ethers";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import {
  StageDotFunPoolABI,
  getUSDCContract,
  getContractAddresses,
} from "../../../../lib/contracts/StageDotFunPool";
import {
  FaArrowUp,
  FaPlus,
  FaChevronLeft,
  FaSync,
  FaDollarSign,
  FaPlay,
  FaInfoCircle,
} from "react-icons/fa";
import useSWR from "swr";
import { usePoolPatrons } from "../../../../hooks/usePoolPatrons";
import { useContractInteraction } from "../../../../contexts/ContractInteractionContext";
import CreatorActions from "./CreatorActions";
import NumberInput from "../../../components/NumberInput";
import { useSmartWallet } from "../../../../hooks/useSmartWallet";
import { useSmartWalletBalance } from "../../../../hooks/useSmartWalletBalance";
import { useRevenueDeposit } from "../../../../hooks/useRevenueDeposit";
import WithdrawModal from "./WithdrawModal";
import showToast from "@/utils/toast";
import Tooltip from "../../../../components/Tooltip";
import BeginExecutionButton from "./BeginExecutionButton";
import { getPoolEffectiveStatus } from "../../../../lib/contracts/types";

interface PoolFundsSectionProps {
  pool: Pool & {
    revenue_accumulated?: number;
    patron_count?: number;
    raised_amount?: number;
    target_amount?: number;
    cap_amount?: number;
    contract_address?: string;
    ends_at?: string;
    status: string;
  };
  isCreator: boolean;
}

// SWR fetcher function for on-chain data
const fetcher = async (url: string, contractAddress: string) => {
  try {
    // Get the provider based on the network
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL
    );

    // Get the pool contract
    const poolContract = new ethers.Contract(
      contractAddress,
      StageDotFunPoolABI,
      provider
    );

    // Use multicall to batch the requests
    const [poolDetails, depositTokenAddress] = await Promise.all([
      poolContract.getPoolDetails(),
      poolContract.depositToken(),
    ]);

    // Log the deposit token address for debugging
    console.log("Pool deposit token details:", {
      poolAddress: contractAddress,
      depositTokenAddress,
      network: process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK || "unknown",
    });

    let balance = BigInt(0);
    try {
      // Create USDC contract instance
      const usdcContract = new ethers.Contract(
        depositTokenAddress,
        ["function balanceOf(address owner) view returns (uint256)"],
        provider
      );

      // Get balance in the same batch
      balance = await usdcContract.balanceOf(contractAddress);

      // Log successful balance fetch
      console.log("Successfully fetched USDC balance:", {
        balance: ethers.formatUnits(balance, 6),
        poolAddress: contractAddress,
        usdcAddress: depositTokenAddress,
      });
    } catch (error) {
      // Log the error but don't throw - we'll return 0 balance instead
      console.warn("Error fetching USDC balance:", {
        error,
        depositTokenAddress,
        poolAddress: contractAddress,
        network: process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK || "unknown",
      });
      // Continue with zero balance rather than failing the whole request
    }

    return {
      totalDeposits: poolDetails._totalDeposits,
      revenueAccumulated: poolDetails._revenueAccumulated,
      contractBalance: balance,
    };
  } catch (error) {
    console.error("Error fetching pool data:", {
      error,
      contractAddress,
      rpcUrl: process.env.NEXT_PUBLIC_RPC_URL?.substring(0, 20) + "...",
      network: process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK || "unknown",
    });
    throw error;
  }
};

// Function to check on-chain pool status
const checkOnChainPoolStatus = async (
  contractAddress: string
): Promise<number> => {
  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.NEXT_PUBLIC_RPC_URL
    );
    const poolContract = new ethers.Contract(
      contractAddress,
      StageDotFunPoolABI,
      provider
    );

    // Call the status() function on the contract
    const status = await poolContract.status();
    return Number(status);
  } catch (error) {
    console.error("Error checking on-chain pool status:", error);
    throw error;
  }
};

export default function PoolFundsSection({
  pool,
  isCreator,
}: PoolFundsSectionProps) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [showDepositInput, setShowDepositInput] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [distributeAmount, setDistributeAmount] = useState("");
  const { sendTransaction } = useSendTransaction();
  const { wallets } = useWallets();
  const { smartWalletAddress, callContractFunction } = useSmartWallet();
  const { balance: smartWalletBalance, refresh: refreshSmartWalletBalance } =
    useSmartWalletBalance();
  const { isLoading: isRevenueDepositLoading, depositRevenue } =
    useRevenueDeposit();
  const modalRef = useRef<HTMLDivElement>(null);
  const receiveModalRef = useRef<HTMLDivElement>(null);
  const distributeModalRef = useRef<HTMLDivElement>(null);

  // Determine if pool is uncapped (cap_amount is exactly 0)
  const isUncapped = useMemo(() => {
    return pool.cap_amount === 0;
  }, [pool.cap_amount]);

  // Determine if pool is below cap (which includes uncapped pools)
  const isBelowCap = useMemo(() => {
    if (isUncapped) return true;
    return (
      pool.cap_amount !== undefined &&
      pool.cap_amount !== null &&
      pool.cap_amount > 0 &&
      (pool.raised_amount || 0) < pool.cap_amount
    );
  }, [isUncapped, pool.cap_amount, pool.raised_amount]);

  // Check if target is met
  const targetMet = useMemo(() => {
    // If the pool is already FUNDED, we should consider the target as met
    if (pool.status === "FUNDED") {
      return true;
    }
    return (pool.raised_amount || 0) >= (pool.target_amount || 0);
  }, [pool.raised_amount, pool.target_amount, pool.status]);

  // Check if we're before the end time
  const isBeforeEndTime = useMemo(() => {
    return new Date() <= new Date(pool.ends_at || "");
  }, [pool.ends_at]);

  // Determine if we should show the Begin Execution button
  const canBeginExecution = useMemo(() => {
    // Use getPoolEffectiveStatus to get the true status accounting for funding and time
    const effectiveStatus = getPoolEffectiveStatus(pool);

    console.log("Begin Execution conditions:", {
      isCreator,
      poolStatus: pool.status,
      effectiveStatus,
      targetMet,
    });

    // Check against the effective status, not just the database status
    return isCreator && effectiveStatus === "FUNDED" && targetMet;
  }, [isCreator, pool, targetMet, isBelowCap]);

  // Fetch on-chain data using SWR
  const {
    data: onChainData,
    error: onChainError,
    mutate: refreshOnChainData,
  } = useSWR(
    pool.contract_address ? [`/api/pool-balance`, pool.contract_address] : null,
    ([url, address]) => fetcher(url, address),
    {
      refreshInterval: 60000, // Increase to 1 minute
      revalidateOnFocus: false, // Disable revalidation on focus
      dedupingInterval: 30000, // Increase deduping interval
      refreshWhenHidden: false, // Don't refresh when tab is hidden
      // Use pool data as initial data if available
      fallbackData: pool.contract_address
        ? {
            totalDeposits: ethers.parseUnits(
              String(pool.raised_amount || 0),
              6
            ),
            revenueAccumulated: ethers.parseUnits(
              String(pool.revenue_accumulated || 0),
              6
            ),
            contractBalance: ethers.parseUnits(
              String(pool.raised_amount || 0),
              6
            ),
          }
        : undefined,
    }
  );

  // Get pool patrons using the usePoolPatrons hook - only when distribute modal is open
  const { patrons, loading: loadingPatrons } = usePoolPatrons(
    // Only load patrons when distribute modal is open and onChainData is available
    showDistributeModal && onChainData ? pool.contract_address || null : null
  );

  // Get the actual patron count
  const patronCount = useMemo(() => patrons.length, [patrons]);

  // Raw values for calculations - use on-chain data if available
  const rawTotalFunds = useMemo(() => {
    if (onChainData) {
      const totalDeposits = Number(
        ethers.formatUnits(onChainData.totalDeposits, 6)
      );
      const revenueAccumulated = Number(
        ethers.formatUnits(onChainData.revenueAccumulated, 6)
      );
      return totalDeposits + revenueAccumulated;
    }
    return (pool.raised_amount || 0) + (pool.revenue_accumulated || 0);
  }, [onChainData, pool.raised_amount, pool.revenue_accumulated]);

  // Format the values for display - memoized to prevent unnecessary recalculations
  const totalDeposits = useMemo(() => {
    if (onChainData) {
      const rawDeposits = ethers.formatUnits(onChainData.totalDeposits, 6);
      return formatCurrency(Number(rawDeposits));
    }
    return formatCurrency(pool.raised_amount || 0);
  }, [onChainData, pool.raised_amount]);

  const revenueAccumulated = useMemo(() => {
    if (onChainData) {
      const rawRevenue = ethers.formatUnits(onChainData.revenueAccumulated, 6);
      return formatCurrency(Number(rawRevenue));
    }
    return formatCurrency(pool.revenue_accumulated || 0);
  }, [onChainData, pool.revenue_accumulated]);

  const totalFunds = useMemo(
    () => formatCurrency(rawTotalFunds),
    [rawTotalFunds]
  );

  // Format the on-chain contract balance
  const contractBalance = useMemo(() => {
    if (onChainData) {
      // Use ethers.formatUnits directly without parseFloat to preserve precision
      const rawBalance = ethers.formatUnits(onChainData.contractBalance, 6);
      return formatContractBalance(rawBalance);
    }
    return "Loading...";
  }, [onChainData]);

  // Set default withdraw address to smart wallet if available, otherwise user's wallet
  useEffect(() => {
    if (smartWalletAddress) {
      setWithdrawAddress(smartWalletAddress);
    } else if (wallets && wallets.length > 0 && wallets[0].address) {
      setWithdrawAddress(wallets[0].address);
    }
  }, [wallets, smartWalletAddress]);

  // Handle click outside modal to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setShowWithdrawModal(false);
      }
      if (
        receiveModalRef.current &&
        !receiveModalRef.current.contains(event.target as Node)
      ) {
        setShowReceiveModal(false);
      }
      if (
        distributeModalRef.current &&
        !distributeModalRef.current.contains(event.target as Node)
      ) {
        setShowDistributeModal(false);
      }
    }

    if (showWithdrawModal || showReceiveModal || showDistributeModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showWithdrawModal, showReceiveModal, showDistributeModal]);

  // Clear status message after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Open receive modal
  const openReceiveModal = async () => {
    if (!pool.contract_address) {
      showToast.error("Pool contract address not found");
      return;
    }

    // Check if pool is in EXECUTING status
    if (pool.status !== "EXECUTING") {
      showToast.error("Pool must be in EXECUTING status to deposit revenue");
      return;
    }

    setReceiveAmount("");
    setShowReceiveModal(true);
  };

  // Handle receive revenue
  const handleReceiveRevenue = async () => {
    if (!pool.contract_address) {
      showToast.error("Pool contract address not found");
      return;
    }

    const amount = parseFloat(receiveAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast.error("Please enter a valid amount");
      return;
    }

    try {
      // Use the new depositRevenue function from the hook
      const result = await depositRevenue(pool.contract_address, amount);

      if (result.success) {
        setStatusMessage("Revenue deposit successful!");
        setReceiveAmount("");
        setShowReceiveModal(false);

        // Refresh on-chain data after transaction
        setTimeout(() => refreshOnChainData(), 5000);
      } else {
        console.error("Error depositing revenue:", result.error);
      }
    } catch (error) {
      console.error("Unexpected error depositing revenue:", error);
    }
  };

  // Open withdraw modal
  const openWithdrawModal = async () => {
    if (!pool.contract_address) {
      showToast.error("Pool contract address not found");
      return;
    }

    // Check if pool is in EXECUTING status
    if (pool.status !== "EXECUTING") {
      showToast.error("Pool must be in EXECUTING status to withdraw funds");
      return;
    }

    // Set the withdrawal amount to the actual contract balance instead of total available funds
    if (onChainData) {
      // Use actual contract balance which represents what can actually be withdrawn
      const actualBalance = parseFloat(
        ethers.formatUnits(onChainData.contractBalance, 6)
      );

      // Format to 6 decimal places to avoid floating-point precision issues
      const formattedBalance = Number(actualBalance.toFixed(6));

      console.log("Setting withdraw amount to actual contract balance:", {
        actualBalance,
        formattedBalance,
      });

      setWithdrawAmount(formattedBalance.toString());

      // If contract balance is zero, show a message and don't open the modal
      if (formattedBalance <= 0) {
        showToast.error("No funds available to withdraw");
        return;
      }
    } else {
      // Try to fetch fresh on-chain data before proceeding
      try {
        const provider = new ethers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL
        );
        const usdcContract = getUSDCContract(provider);
        const balance = await usdcContract.balanceOf(pool.contract_address);
        const actualBalance = parseFloat(ethers.formatUnits(balance, 6));
        const formattedBalance = Number(actualBalance.toFixed(6));

        setWithdrawAmount(formattedBalance.toString());

        // If contract balance is zero, show a message and don't open the modal
        if (formattedBalance <= 0) {
          showToast.error("No funds available to withdraw");
          return;
        }
      } catch (error) {
        console.error("Error fetching fresh balance:", error);

        // If on-chain data isn't available, use pool data from database as fallback
        // This is just a fallback and might not be accurate
        const totalAvailable =
          (pool.raised_amount || 0) + (pool.revenue_accumulated || 0);
        // Also format database values to be safe
        const formattedTotalAvailable = Number(totalAvailable.toFixed(6));
        setWithdrawAmount(formattedTotalAvailable.toString());
      }
    }
    setShowWithdrawModal(true);
  };

  // Add the contract interaction hook
  const { withdrawFromPool, distributeRevenue } = useContractInteraction();

  // Handle withdraw funds
  const handleWithdrawFunds = async () => {
    if (!pool.contract_address) {
      showToast.error("Pool contract address not found");
      return;
    }

    // Check if the pool is in EXECUTING status
    if (pool.status !== "EXECUTING") {
      showToast.error("Pool must be in EXECUTING status to withdraw funds");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast.error("Please enter a valid amount");
      return;
    }

    // Validate that the amount doesn't exceed the total available
    const totalAvailable = onChainData
      ? parseFloat(ethers.formatUnits(onChainData.contractBalance, 6))
      : (pool.raised_amount || 0) + (pool.revenue_accumulated || 0);

    if (amount > totalAvailable) {
      showToast.error(
        `Withdrawal amount (${amount.toFixed(
          2
        )}) exceeds available funds (${totalAvailable.toFixed(2)})`
      );
      return;
    }

    setIsWithdrawing(true);
    const loadingToast = showToast.loading("Preparing withdrawal...");

    try {
      // Fix precision issues by rounding to 6 decimals (USDC standard)
      // This avoids the "too many decimals for format" error
      const formattedAmount = Number(amount.toFixed(6));

      console.log("Withdrawing formatted amount:", {
        originalAmount: amount,
        formattedAmount: formattedAmount,
      });

      // Use the new withdrawFromPool function from the hook
      const result = await withdrawFromPool(
        pool.contract_address,
        formattedAmount,
        withdrawAddress
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to withdraw funds");
      }

      showToast.success("Funds withdrawn successfully!", { id: loadingToast });
      setStatusMessage("Withdrawal completed successfully!");
      console.log("Withdrawal result:", result);
      setShowWithdrawModal(false);

      // Refresh on-chain data after transaction
      setTimeout(() => refreshOnChainData(), 5000);
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to withdraw funds",
        { id: loadingToast }
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Open distribute revenue modal
  const openDistributeModal = () => {
    // Set initial distribute amount to the total revenue accumulated (for display only)
    if (onChainData) {
      const revenueAccumulated = parseFloat(
        ethers.formatUnits(onChainData.revenueAccumulated, 6)
      );
      setDistributeAmount(revenueAccumulated.toFixed(2));
    } else if (pool.revenue_accumulated) {
      setDistributeAmount(pool.revenue_accumulated.toFixed(2));
    } else {
      setDistributeAmount("");
    }
    setShowDistributeModal(true);
  };

  // Handle distribute revenue
  const handleDistributeRevenue = async () => {
    if (!pool.contract_address) {
      showToast.error("Pool contract address not found");
      return;
    }

    // Check if pool is in EXECUTING status
    if (pool.status !== "EXECUTING") {
      showToast.error("Pool must be in EXECUTING status to distribute revenue");
      return;
    }

    // Check if there's any revenue to distribute - use actual contract balance
    const availableRevenue = onChainData
      ? parseFloat(ethers.formatUnits(onChainData.contractBalance, 6))
      : 0;

    if (availableRevenue <= 0) {
      showToast.error("No revenue available to distribute");
      return;
    }

    const loadingToast = showToast.loading("Preparing distribution...");

    try {
      // Log distribution details
      console.log("Distribution parameters:", {
        poolAddress: pool.contract_address,
        contractBalance: availableRevenue,
        revenueAccumulated: onChainData
          ? parseFloat(ethers.formatUnits(onChainData.revenueAccumulated, 6))
          : 0,
      });

      // Use the distributeRevenue function from the hook
      const result = await distributeRevenue(pool.contract_address, 0); // Amount is ignored by the contract

      if (!result.success) {
        throw new Error(result.error || "Failed to distribute revenue");
      }

      showToast.success("Revenue distribution initiated successfully!", {
        id: loadingToast,
      });
      setStatusMessage("Distribution completed successfully!");
      console.log("Distribution result:", result);
      setShowDistributeModal(false);

      // Refresh on-chain data after transaction
      setTimeout(() => refreshOnChainData(), 5000);
    } catch (error) {
      console.error("Error distributing revenue:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to distribute revenue",
        { id: loadingToast }
      );
    } finally {
      setIsDistributing(false);
    }
  };

  // Add refreshPoolData function that utilizes both refresh functions
  const refreshPoolData = async () => {
    if (pool.contract_address) {
      try {
        // Refresh on-chain data
        await refreshOnChainData();
      } catch (error) {
        console.error("Error refreshing pool data:", error);
      }
    }
  };

  return (
    <>
      <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-xl font-semibold">Pool Balance</h3>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-5xl font-bold mb-2">{contractBalance}</div>
        </div>

        {/* Only show action buttons for pool creator and either in EXECUTING or can begin execution */}
        {isCreator && (
          <>
            {/* Show Begin Execution button if conditions are met */}
            {canBeginExecution && (
              <BeginExecutionButton
                poolAddress={pool.contract_address || ""}
                isCreator={isCreator}
                refreshPoolData={refreshPoolData}
                currentStatus={pool.status}
                pool={pool}
              />
            )}

            {/* Show CreatorActions if in EXECUTING state */}
            {pool.status === "EXECUTING" && (
              <CreatorActions
                isDepositLoading={isRevenueDepositLoading}
                isWithdrawing={isWithdrawing}
                isDistributing={isDistributing}
                rawTotalFunds={
                  onChainData
                    ? Number(ethers.formatUnits(onChainData.contractBalance, 6))
                    : rawTotalFunds
                }
                onReceiveClick={openReceiveModal}
                onWithdrawClick={openWithdrawModal}
                onDistributeClick={openDistributeModal}
                revenueAccumulated={
                  onChainData
                    ? Number(
                        ethers.formatUnits(onChainData.revenueAccumulated, 6)
                      )
                    : pool.revenue_accumulated || 0
                }
                poolStatus={pool.status}
                targetMet={targetMet}
                isBeforeEndTime={isBeforeEndTime}
                belowCap={isBelowCap}
              />
            )}
          </>
        )}

        {/* Status message */}
        {statusMessage && (
          <div className="mt-4 p-4 bg-green-500 bg-opacity-10 text-green-500 rounded-lg">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        withdrawAmount={withdrawAmount}
        withdrawAddress={withdrawAddress}
        isWithdrawing={isWithdrawing}
        onWithdraw={handleWithdrawFunds}
        modalRef={modalRef as React.RefObject<HTMLDivElement>}
      />

      {/* Receive Revenue Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div
            ref={receiveModalRef}
            className="bg-[#000000] rounded-[16px] w-full max-w-md overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-4 flex items-center">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-2 rounded-full bg-[#FFFFFF14] mr-4"
              >
                <FaChevronLeft className="text-white" />
              </button>
              <h2 className="text-xl font-bold text-white text-center flex-grow">
                Receive Revenue
              </h2>
              <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Pool Icon and Amount */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center">
                  <div className="bg-[#FFFFFF14] rounded-full p-2 mr-2">
                    <FaPlus className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {receiveAmount
                      ? formatCurrency(Number(receiveAmount))
                      : formatCurrency(0)}
                  </div>
                </div>
              </div>

              {/* Smart Wallet Balance */}
              <div className="mb-6 p-4 bg-[#FFFFFF0A] rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="text-gray-400 text-sm">Your balance</div>
                  <div className="text-white font-semibold">
                    {parseFloat(smartWalletBalance || "0").toFixed(2)} USDC
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <NumberInput
                  value={receiveAmount}
                  onChange={setReceiveAmount}
                  label="Enter USDC amount to deposit as revenue"
                  placeholder="0.00"
                  step={0.1}
                  min={0}
                />
              </div>

              {/* Insufficient Balance Warning */}
              {receiveAmount &&
                parseFloat(receiveAmount) > 0 &&
                parseFloat(receiveAmount) >
                  parseFloat(smartWalletBalance || "0") && (
                  <div className="mb-6 p-3 bg-red-800 bg-opacity-30 text-red-500 rounded-lg text-sm">
                    Insufficient balance. Please add more USDC or enter a
                    smaller amount.
                  </div>
                )}

              {/* Info Text */}
              <div className="mb-6 text-gray-400 text-sm">
                <p>
                  This will deposit USDC from your wallet to the pool as
                  revenue.
                </p>
              </div>

              {/* Smart Wallet Required Warning */}
              {!smartWalletAddress && (
                <div className="mb-6 p-3 bg-yellow-800 bg-opacity-30 text-yellow-500 rounded-lg text-sm">
                  Wallet not configured. Please complete wallet setup to deposit
                  revenue.
                </div>
              )}

              {/* Deposit Button */}
              <button
                onClick={handleReceiveRevenue}
                disabled={
                  isRevenueDepositLoading ||
                  !receiveAmount ||
                  parseFloat(receiveAmount) <= 0 ||
                  !smartWalletAddress ||
                  (!!receiveAmount &&
                    parseFloat(receiveAmount) >
                      parseFloat(smartWalletBalance || "0"))
                }
                className="w-full bg-[#FFFFFF14] hover:bg-[#FFFFFF30] text-white py-3 px-4 rounded-full font-semibold transition-colors disabled:bg-[#FFFFFF08] disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {isRevenueDepositLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Deposit Revenue"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distribute Revenue Modal */}
      {showDistributeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div
            ref={distributeModalRef}
            className="bg-[#000000] rounded-[16px] w-full max-w-md overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-4 flex items-center">
              <button
                onClick={() => setShowDistributeModal(false)}
                className="p-2 rounded-full bg-[#FFFFFF14] mr-4"
              >
                <FaChevronLeft className="text-white" />
              </button>
              <h2 className="text-xl font-bold text-white text-center flex-grow">
                Confirm payback
              </h2>
              <div className="w-10"></div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Pool Icon and Amount */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center">
                  <div className="bg-[#FFFFFF14] rounded-full p-2 mr-2">
                    <FaDollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {distributeAmount
                      ? parseFloat(distributeAmount).toFixed(2)
                      : "0.00"}
                  </div>
                </div>
              </div>

              {/* Distribution Info */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <div className="text-gray-400">Distribution among</div>
                  <div className="text-white font-semibold">
                    {!onChainData
                      ? "Loading pool data..."
                      : loadingPatrons
                      ? "Loading patrons..."
                      : `${patronCount} ${
                          patronCount === 1 ? "patron" : "patrons"
                        }`}
                  </div>
                </div>
                <div className="text-gray-400 text-sm">
                  <p>
                    This will distribute all available revenue (
                    {distributeAmount} USDC) to pool patrons based on their LP
                    token holdings.
                  </p>
                </div>
              </div>

              {/* Distribute Button */}
              <button
                onClick={handleDistributeRevenue}
                disabled={
                  isDistributing ||
                  parseFloat(distributeAmount) <= 0 ||
                  patronCount === 0 ||
                  !onChainData ||
                  loadingPatrons
                }
                className="w-full bg-[#FFFFFF14] hover:bg-[#FFFFFF30] text-white py-4 px-4 rounded-full font-semibold transition-colors disabled:bg-[#FFFFFF08] disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {isDistributing ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : !onChainData ? (
                  "Loading pool data..."
                ) : loadingPatrons ? (
                  "Loading patrons..."
                ) : (
                  "Payback"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
