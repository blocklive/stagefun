"use client";

import { Pool } from "../../../../lib/supabase";
import { formatCurrency } from "../../../../lib/utils";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "react-hot-toast";
import { ethers } from "ethers";
import { useSendTransaction, useWallets } from "@privy-io/react-auth";
import {
  StageDotFunPoolABI,
  getUSDCContract,
} from "../../../../lib/contracts/StageDotFunPool";
import {
  FaArrowUp,
  FaPlus,
  FaChevronLeft,
  FaSync,
  FaDollarSign,
} from "react-icons/fa";
import useSWR from "swr";
import { usePoolPatrons } from "../../../../hooks/usePoolPatrons";

interface PoolFundsSectionProps {
  pool: Pool & {
    revenue_accumulated?: number;
    patron_count?: number;
  };
  isCreator: boolean;
}

// SWR fetcher function for on-chain data
const fetcher = async (url: string, contractAddress: string) => {
  // Get the provider based on the network
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);

  // Get the pool contract
  const poolContract = new ethers.Contract(
    contractAddress,
    StageDotFunPoolABI,
    provider
  );

  // Get the pool details
  const poolDetails = await poolContract.getPoolDetails();

  // Get the USDC token address from the pool
  const usdcAddress = await poolContract.depositToken();

  // Create a contract instance for USDC
  const usdcContract = new ethers.Contract(
    usdcAddress,
    ["function balanceOf(address owner) view returns (uint256)"],
    provider
  );

  // Get the current USDC balance of the pool contract
  const balance = await usdcContract.balanceOf(contractAddress);

  return {
    totalDeposits: poolDetails._totalDeposits,
    revenueAccumulated: poolDetails._revenueAccumulated,
    contractBalance: balance,
  };
};

export default function PoolFundsSection({
  pool,
  isCreator,
}: PoolFundsSectionProps) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
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
  const modalRef = useRef<HTMLDivElement>(null);
  const receiveModalRef = useRef<HTMLDivElement>(null);
  const distributeModalRef = useRef<HTMLDivElement>(null);

  // Fetch on-chain data using SWR
  const {
    data: onChainData,
    error: onChainError,
    mutate: refreshOnChainData,
  } = useSWR(
    pool.contract_address ? [`/api/pool-balance`, pool.contract_address] : null,
    ([url, address]) => fetcher(url, address),
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  // Get pool patrons using the usePoolPatrons hook
  const { patrons, loading: loadingPatrons } = usePoolPatrons(
    pool.contract_address || null
  );

  // Get the actual patron count
  const patronCount = useMemo(() => patrons.length, [patrons]);

  // Raw values for calculations - use on-chain data if available
  const rawTotalFunds = useMemo(() => {
    if (onChainData) {
      const totalDeposits = parseFloat(
        ethers.formatUnits(onChainData.totalDeposits, 6)
      );
      const revenueAccumulated = parseFloat(
        ethers.formatUnits(onChainData.revenueAccumulated, 6)
      );
      return totalDeposits + revenueAccumulated;
    }
    return (pool.raised_amount || 0) + (pool.revenue_accumulated || 0);
  }, [onChainData, pool.raised_amount, pool.revenue_accumulated]);

  // Format the values for display - memoized to prevent unnecessary recalculations
  const totalDeposits = useMemo(() => {
    if (onChainData) {
      return formatCurrency(
        parseFloat(ethers.formatUnits(onChainData.totalDeposits, 6))
      );
    }
    return formatCurrency(pool.raised_amount || 0);
  }, [onChainData, pool.raised_amount]);

  const revenueAccumulated = useMemo(() => {
    if (onChainData) {
      return formatCurrency(
        parseFloat(ethers.formatUnits(onChainData.revenueAccumulated, 6))
      );
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
      return formatCurrency(
        parseFloat(ethers.formatUnits(onChainData.contractBalance, 6))
      );
    }
    return "Loading...";
  }, [onChainData]);

  // Set default withdraw address to user's wallet if available
  useEffect(() => {
    if (wallets && wallets.length > 0 && wallets[0].address) {
      setWithdrawAddress(wallets[0].address);
    }
  }, [wallets]);

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

  // Open receive revenue modal
  const openReceiveModal = () => {
    setReceiveAmount("");
    setShowReceiveModal(true);
  };

  // Handle receive revenue
  const handleReceiveRevenue = async () => {
    if (!pool.contract_address) {
      toast.error("Pool contract address not found");
      return;
    }

    const amount = parseFloat(receiveAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsReceiving(true);
    try {
      // Get the embedded wallet
      const embeddedWallet = wallets.find(
        (wallet) => wallet.walletClientType === "privy"
      );

      if (!embeddedWallet) {
        toast.error(
          "No embedded wallet found. Please try logging out and logging in again."
        );
        return;
      }

      // Get the provider and create contract instances
      const provider = await embeddedWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const signerAddress = await signer.getAddress();

      // Get USDC contract using the helper function
      const usdcContract = getUSDCContract(ethersProvider);

      // Get USDC details
      const usdcDecimals = 6; // USDC always has 6 decimals
      const usdcSymbol = await usdcContract.symbol();
      const amountBigInt = ethers.parseUnits(receiveAmount, usdcDecimals);
      const amountFormatted = ethers.formatUnits(amountBigInt, usdcDecimals);

      // Check USDC balance
      const usdcBalance = await usdcContract.balanceOf(signerAddress);
      console.log("USDC Balance check:", {
        balance: ethers.formatUnits(usdcBalance, usdcDecimals),
        required: amountFormatted,
        hasEnough: usdcBalance >= amountBigInt,
      });

      if (usdcBalance < amountBigInt) {
        toast.error(
          `Insufficient USDC balance. You have ${ethers.formatUnits(
            usdcBalance,
            usdcDecimals
          )} USDC but trying to deposit ${amountFormatted} USDC`
        );
        return;
      }

      // Check allowance
      const currentAllowance = await usdcContract.allowance(
        signerAddress,
        pool.contract_address
      );

      console.log("Current allowance:", {
        allowance: currentAllowance.toString(),
        required: amountBigInt.toString(),
        needsApproval: currentAllowance < amountBigInt,
      });

      // Handle approval if needed
      if (currentAllowance < amountBigInt) {
        // Create contract interface for USDC
        const usdcInterface = new ethers.Interface([
          "function approve(address spender, uint256 value) returns (bool)",
        ]);

        const approvalData = usdcInterface.encodeFunctionData("approve", [
          pool.contract_address,
          amountBigInt,
        ]);

        // Get the USDC contract address from the helper function
        const usdcAddress = String(usdcContract.target);

        // Prepare the approval transaction request
        const approvalRequest = {
          to: usdcAddress,
          data: approvalData,
          value: "0",
        };

        // Set UI options for the approval transaction
        const approvalUiOptions = {
          description: `Approving ${amountFormatted} ${usdcSymbol} for deposit`,
          buttonText: "Approve USDC",
          transactionInfo: {
            title: "USDC Approval",
            action: "Approve USDC",
            contractInfo: {
              name: "USDC Token",
            },
          },
        };

        console.log("Sending approval transaction", approvalRequest);
        const approvalTxHash = await sendTransaction(approvalRequest, {
          uiOptions: approvalUiOptions,
        });
        console.log("Approval transaction sent:", approvalTxHash);

        // Wait for approval to be mined
        toast.success(
          "USDC approval initiated. Please wait for confirmation..."
        );
        const approvalReceipt = await ethersProvider.waitForTransaction(
          approvalTxHash.hash
        );
        console.log("Approval confirmed:", approvalReceipt);

        if (!approvalReceipt?.status) {
          throw new Error("USDC approval failed");
        }
        toast.success("USDC approval confirmed!");
      }

      // Create contract interface for pool
      const poolInterface = new ethers.Interface(StageDotFunPoolABI);
      const depositData = poolInterface.encodeFunctionData("receiveRevenue", [
        amountBigInt,
      ]);

      // Prepare the transaction request
      const depositRequest = {
        to: pool.contract_address,
        data: depositData,
        value: "0",
      };

      // Set UI options for the transaction
      const uiOptions = {
        description: `Depositing ${receiveAmount} USDC as revenue to the pool`,
        buttonText: "Deposit Revenue",
        transactionInfo: {
          title: "Deposit Revenue",
          action: "Deposit Revenue to Pool",
          contractInfo: {
            name: "StageDotFun Pool",
          },
        },
      };

      // Send the transaction
      console.log("Sending deposit transaction", depositRequest);
      const txHash = await sendTransaction(depositRequest, {
        uiOptions,
      });

      toast.success("Revenue deposit initiated");
      console.log("Transaction hash:", txHash);

      // Wait for transaction to be mined
      const receipt = await ethersProvider.waitForTransaction(txHash.hash);
      console.log("Transaction receipt:", receipt);

      if (!receipt?.status) {
        throw new Error("Transaction failed on chain");
      }

      setStatusMessage("Revenue deposit successful!");
      setReceiveAmount("");
      setShowReceiveModal(false);

      // Refresh on-chain data after transaction
      setTimeout(() => refreshOnChainData(), 5000);
    } catch (error) {
      console.error("Error depositing revenue:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to deposit revenue"
      );
    } finally {
      setIsReceiving(false);
    }
  };

  // Open withdraw modal
  const openWithdrawModal = () => {
    setWithdrawAmount("");
    setShowWithdrawModal(true);
  };

  // Set withdraw amount to percentage of total
  const setWithdrawPercentage = (percentage: number) => {
    const amount = ((rawTotalFunds * percentage) / 100).toFixed(2);
    setWithdrawAmount(amount);
  };

  // Set withdraw amount to max
  const setWithdrawMax = () => {
    setWithdrawAmount(rawTotalFunds.toFixed(2));
  };

  // Handle withdraw funds
  const handleWithdrawFunds = async () => {
    if (!pool.contract_address) {
      toast.error("Pool contract address not found");
      return;
    }

    if (!ethers.isAddress(withdrawAddress)) {
      toast.error("Please enter a valid wallet address");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > rawTotalFunds) {
      toast.error("Withdrawal amount cannot exceed total funds");
      return;
    }

    setIsWithdrawing(true);
    try {
      // For now, we'll just make a direct API call to a backend endpoint
      // that will handle the withdrawal for us
      const response = await fetch("/api/pools/withdraw-funds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poolAddress: pool.contract_address,
          amount: amount,
          destinationAddress: withdrawAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to withdraw funds");
      }

      const result = await response.json();
      toast.success("Funds withdrawal initiated");
      setStatusMessage("Withdrawal request submitted successfully!");
      console.log("Withdrawal result:", result);
      setShowWithdrawModal(false);

      // Refresh on-chain data after transaction
      setTimeout(() => refreshOnChainData(), 5000);
    } catch (error) {
      console.error("Error withdrawing funds:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to withdraw funds"
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Open distribute revenue modal
  const openDistributeModal = () => {
    // Set initial distribute amount to the total revenue accumulated
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
      toast.error("Pool contract address not found");
      return;
    }

    const amount = parseFloat(distributeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Check if there's enough revenue to distribute
    const availableRevenue = onChainData
      ? parseFloat(ethers.formatUnits(onChainData.revenueAccumulated, 6))
      : pool.revenue_accumulated || 0;

    if (amount > availableRevenue) {
      toast.error("Distribution amount cannot exceed available revenue");
      return;
    }

    setIsDistributing(true);
    try {
      // Call the backend API to distribute revenue
      const response = await fetch("/api/pools/distribute-revenue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poolAddress: pool.contract_address,
          amount: amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to distribute revenue");
      }

      const result = await response.json();
      toast.success("Revenue distribution initiated");
      setStatusMessage("Distribution request submitted successfully!");
      console.log("Distribution result:", result);
      setShowDistributeModal(false);

      // Refresh on-chain data after transaction
      setTimeout(() => refreshOnChainData(), 5000);
    } catch (error) {
      console.error("Error distributing revenue:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to distribute revenue"
      );
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <>
      <div className="mt-6 p-4 bg-[#FFFFFF0A] rounded-[16px]">
        <h3 className="text-xl font-semibold mb-4">Pool Funds</h3>

        <div className="mb-6">
          <div className="text-5xl font-bold mb-2">{contractBalance}</div>
        </div>

        {/* Action Buttons */}
        <div className="flex mb-6 w-full max-w-xs">
          <div className="flex flex-col items-center w-20">
            <button
              className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center mb-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={openReceiveModal}
              disabled={isReceiving}
              title="Deposit"
            >
              {isReceiving ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
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
              ) : (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  ></path>
                </svg>
              )}
            </button>
            <span className="text-gray-400 text-sm">Deposit</span>
          </div>

          <div className="flex flex-col items-center w-20">
            <button
              className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center mb-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={openWithdrawModal}
              disabled={isWithdrawing || rawTotalFunds <= 0}
              title="Withdraw"
            >
              {isWithdrawing ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
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
              ) : (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  ></path>
                </svg>
              )}
            </button>
            <span className="text-gray-400 text-sm">Withdraw</span>
          </div>

          <div className="flex flex-col items-center w-20">
            <button
              className="w-10 h-10 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full flex items-center justify-center mb-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={openDistributeModal}
              disabled={
                isDistributing ||
                (onChainData
                  ? parseFloat(
                      ethers.formatUnits(onChainData.revenueAccumulated, 6)
                    ) <= 0
                  : (pool.revenue_accumulated || 0) <= 0)
              }
              title="Distribute"
            >
              {isDistributing && !showDistributeModal ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
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
              ) : (
                <FaDollarSign className="w-5 h-5 text-white" size={20} />
              )}
            </button>
            <span className="text-gray-400 text-sm">Distribute</span>
          </div>
        </div>

        {/* Assets Section */}
        <h3 className="text-2xl font-semibold mb-4">Assets</h3>
        <div className="p-4 rounded-[12px] bg-[#FFFFFF14] flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-[#FFFFFF14] rounded-full flex items-center justify-center mr-3">
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
              </svg>
            </div>
            <div>
              <div className="text-gray-400">Testnet USDC</div>
              <div className="text-xl font-bold">
                {onChainData
                  ? parseFloat(
                      ethers.formatUnits(onChainData.contractBalance, 6)
                    ).toFixed(2) + " USDC"
                  : "Loading..."}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-xl font-bold">{contractBalance}</div>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-3 p-2 bg-green-600 text-white rounded-md text-center">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div
            ref={modalRef}
            className="bg-[#000000] rounded-[16px] w-full max-w-md overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-4 flex items-center">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-2 rounded-full bg-[#FFFFFF14] mr-4"
              >
                <FaChevronLeft className="text-white" />
              </button>
              <h2 className="text-xl font-bold text-white text-center flex-grow">
                Withdraw
              </h2>
              <div className="w-10"></div> {/* Spacer for centering */}
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Pool Icon and Amount */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center">
                  <div className="bg-[#FFFFFF14] rounded-full p-2 mr-2">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
                      <path d="M10 4a1 1 0 100 2 1 1 0 000-2zm0 10a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {withdrawAmount
                      ? parseFloat(withdrawAmount).toFixed(2)
                      : "0.00"}
                  </div>
                </div>
              </div>

              {/* Percentage Buttons */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setWithdrawPercentage(10)}
                  className="flex-1 bg-[#2A2A2A] text-white py-2 px-4 rounded-full"
                >
                  10%
                </button>
                <button
                  onClick={() => setWithdrawPercentage(50)}
                  className="flex-1 bg-[#2A2A2A] text-white py-2 px-4 rounded-full"
                >
                  50%
                </button>
                <button
                  onClick={setWithdrawMax}
                  className="flex-1 bg-[#2A2A2A] text-white py-2 px-4 rounded-full flex items-center justify-center"
                >
                  <span>Max</span>
                  <span className="ml-2 text-blue-400">
                    {rawTotalFunds.toFixed(2)}
                  </span>
                </button>
              </div>

              {/* Wallet Address Input */}
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-2">
                  Enter wallet address (on Monad)
                </label>
                <input
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) => setWithdrawAddress(e.target.value)}
                  className="w-full bg-[#2A2A2A] text-white p-3 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="0x..."
                />
              </div>

              {/* Withdraw Button */}
              <button
                onClick={handleWithdrawFunds}
                disabled={
                  isWithdrawing ||
                  !withdrawAmount ||
                  parseFloat(withdrawAmount) <= 0 ||
                  !ethers.isAddress(withdrawAddress)
                }
                className="w-full bg-white text-black py-3 px-4 rounded-full font-semibold transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {isWithdrawing ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
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
                  "Withdraw"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
                      ? parseFloat(receiveAmount).toFixed(2)
                      : "0.00"}
                  </div>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-2">
                  Enter USDC amount to deposit as revenue
                </label>
                <input
                  type="number"
                  value={receiveAmount}
                  onChange={(e) => setReceiveAmount(e.target.value)}
                  className="w-full bg-[#2A2A2A] text-white p-3 rounded-[12px] border border-gray-700 focus:outline-none focus:border-green-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setReceiveAmount("10")}
                  className="flex-1 bg-[#FFFFFF14] text-white py-2 px-4 rounded-full"
                >
                  10 USDC
                </button>
                <button
                  onClick={() => setReceiveAmount("50")}
                  className="flex-1 bg-[#FFFFFF14] text-white py-2 px-4 rounded-full"
                >
                  50 USDC
                </button>
                <button
                  onClick={() => setReceiveAmount("100")}
                  className="flex-1 bg-[#FFFFFF14] text-white py-2 px-4 rounded-full"
                >
                  100 USDC
                </button>
              </div>

              {/* Info Text */}
              <div className="mb-6 text-gray-400 text-sm">
                <p>
                  This will deposit USDC from your wallet to the pool as
                  revenue. Make sure you have sufficient USDC in your wallet.
                </p>
              </div>

              {/* Deposit Button */}
              <button
                onClick={handleReceiveRevenue}
                disabled={
                  isReceiving ||
                  !receiveAmount ||
                  parseFloat(receiveAmount) <= 0
                }
                className="w-full bg-[#FFFFFF14] hover:bg-[#FFFFFF30] text-white py-3 px-4 rounded-full font-semibold transition-colors disabled:bg-[#FFFFFF08] disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {isReceiving ? (
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
              <div className="w-10"></div> {/* Spacer for centering */}
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
                    {loadingPatrons
                      ? "Loading..."
                      : `${patronCount} ${
                          patronCount === 1 ? "patron" : "patrons"
                        }`}
                  </div>
                </div>
              </div>

              {/* Distribute Button */}
              <button
                onClick={handleDistributeRevenue}
                disabled={
                  isDistributing ||
                  !distributeAmount ||
                  parseFloat(distributeAmount) <= 0 ||
                  patronCount === 0
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
