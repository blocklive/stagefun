"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  FaArrowLeft,
  FaCheck,
  FaMapMarkerAlt,
  FaChevronRight,
  FaChevronUp,
} from "react-icons/fa";
import Image from "next/image";
import BottomNavbar from "../../components/BottomNavbar";
import { useSupabase } from "../../../contexts/SupabaseContext";
import { useContractInteraction } from "../../../contexts/ContractInteractionContext";
import { getPoolById } from "../../../lib/services/pool-service";
import {
  commitToPool,
  getPatronsByPoolId,
} from "../../../lib/services/patron-service";
import { getUserById } from "../../../lib/services/user-service";
import {
  getUSDCBalance,
  activatePoolOnChain,
} from "../../../lib/services/contract-service";
import { Pool, User } from "../../../lib/supabase";
import { toast } from "react-hot-toast";
import { useUSDCBalance } from "../../../hooks/useUSDCBalance";
import { usePoolDetails } from "../../../hooks/usePoolDetails";
import { usePoolCommitments } from "../../../hooks/usePoolCommitments";
import { usePoolTimeLeft } from "../../../hooks/usePoolTimeLeft";
import { usePool } from "../../../hooks/usePool";
import { useBiconomyContractInteraction } from "../../../hooks/useBiconomyContractInteraction";

export default function PoolDetailsPage() {
  const { user: privyUser } = usePrivy();
  const { wallets, ready } = useWallets();
  const { dbUser } = useSupabase();
  const router = useRouter();
  const params = useParams();
  const poolId = params.id as string;

  const {
    pool,
    targetAmount,
    raisedAmount,
    percentage,
    isLoading,
    refresh: refreshPool,
  } = usePool(poolId);

  const { creator, patrons, isLoading: isPoolLoading } = usePoolDetails(poolId);

  const {
    depositToPool: commitToBlockchain,
    isLoading: isBlockchainLoading,
    walletsReady,
    privyReady,
  } = useContractInteraction();

  const { balance: usdcBalance, refresh: refreshBalance } = useUSDCBalance();

  const {
    commitments,
    loading: isCommitmentsLoading,
    error: commitmentsError,
    refresh: refreshCommitments,
  } = usePoolCommitments(pool?.contract_address || null);

  const {
    days,
    hours,
    minutes,
    seconds,
    hasEnded,
    isLoading: isTimeLoading,
  } = usePoolTimeLeft(pool);

  // Add Biconomy contract interaction
  const {
    depositToPool: commitToBiconomy,
    isLoading: isBiconomyLoading,
    error: biconomyError,
    walletAddress: biconomyWalletAddress,
  } = useBiconomyContractInteraction();

  // Calculate total committed and target amount from commitments
  const totalCommitted =
    commitments?.reduce(
      (sum, commitment) => sum + Number(commitment.amount),
      0
    ) || 0;

  // Viewport height effect
  useEffect(() => {
    const updateHeight = () => setViewportHeight(`${window.innerHeight}px`);
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Basic states
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("commit");
  const [commitAmount, setCommitAmount] = useState("1");
  const [showPatrons, setShowPatrons] = useState(true);

  // Add state for activation and approving
  const [isActivating, setIsActivating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Handle max click
  const handleMaxClick = useCallback(() => {
    setCommitAmount(usdcBalance);
  }, [usdcBalance]);

  // Handle toggle pool status
  const handleTogglePoolStatus = async () => {
    if (!pool || !dbUser) return;

    setIsActivating(true);
    try {
      const newStatus =
        pool.blockchain_status === "active" ||
        pool.blockchain_status === "confirmed"
          ? "inactive"
          : "active";
      const response = await fetch("/api/blockchain/update-pool-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poolId: pool.id,
          userId: dbUser.id,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error ||
            `Failed to ${
              newStatus === "active" ? "activate" : "deactivate"
            } pool`
        );
      }

      const result = await response.json();
      console.log("Pool status updated:", result);

      // Show success message
      toast.success(
        `Pool ${
          newStatus === "active" ? "activated" : "deactivated"
        } successfully!`
      );

      // Refresh pool data
      await refreshPool();
    } catch (error) {
      console.error("Error updating pool status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update pool status"
      );
    } finally {
      setIsActivating(false);
    }
  };

  const handleCommit = async () => {
    if (!pool || !dbUser) return;

    try {
      setIsApproving(true);
      const amount = parseFloat(commitAmount);

      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      console.log("Pool details in handleCommit:", {
        id: pool.id,
        name: pool.name,
        contractAddress: pool.contract_address,
      });

      // Convert to USDC base units (6 decimals)
      const amountInBaseUnits = Math.floor(amount * 1_000_000).toString();

      // We need to pass pool.id here, not pool.contract_address
      console.log("Calling commitToBlockchain with:", {
        firstArg: pool.id, // Changed to use pool.id
        amount,
      });

      await commitToBlockchain(pool.id, amount); // Using pool.id as expected by useContractInteraction.depositToPool

      // Refresh data
      refreshPool();
      refreshBalance();
      refreshCommitments();

      toast.success("Successfully committed to pool!");
      setCommitAmount("");
      setIsApproving(false);
    } catch (error) {
      console.error("Error committing to pool:", error);
      toast.error("Failed to commit to pool. Please try again.");
      setIsApproving(false);
    }
  };

  // Add a new function to handle commits via Biconomy
  const handleBiconomyCommit = async () => {
    if (!pool || !dbUser) return;

    try {
      setIsApproving(true);
      const amount = parseFloat(commitAmount);

      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      // Make sure we have a contract address
      if (!pool.contract_address) {
        toast.error("Pool contract address not found");
        return;
      }

      console.log("Pool details in handleBiconomyCommit:", {
        id: pool.id,
        name: pool.name,
        contractAddress: pool.contract_address,
        status: pool.status,
      });

      console.log("Calling commitToBiconomy with:", {
        firstArg: pool.contract_address,
        amount,
      });

      // Use Biconomy to commit to the pool (gasless transaction)
      // Pass the contract address directly to ensure we're using the right identifier
      await commitToBiconomy(pool.contract_address, amount);

      // Refresh data
      refreshPool();
      refreshBalance();
      refreshCommitments();

      toast.success("Successfully committed to pool with Biconomy (gasless)!");
      setCommitAmount("");
      setIsApproving(false);
    } catch (error) {
      console.error("Error committing to pool with Biconomy:", error);
      toast.error("Failed to commit to pool. Please try again.");
      setIsApproving(false);
    }
  };

  // Find the user's commitment to this pool
  const getUserCommitment = () => {
    if (!dbUser || !commitments) return null;

    // Only check for on-chain commitments - this is the source of truth
    const walletAddress = privyUser?.wallet?.address;
    if (!walletAddress) return null;

    try {
      // Find the user's commitment in the on-chain data
      const userCommitment = commitments.find(
        (commitment) =>
          commitment.user.toLowerCase() === walletAddress.toLowerCase()
      );

      if (!userCommitment) return null;

      // Return the on-chain commitment data
      return {
        user_id: dbUser.id,
        pool_id: poolId,
        amount: Number(userCommitment.amount) / 1_000_000, // Convert from USDC base units (6 decimals)
        created_at: new Date().toISOString(),
        user: dbUser,
        onChain: true,
      };
    } catch (error) {
      console.error("Error getting user commitment:", error);
      return null;
    }
  };

  // Render user's commitment section
  const renderUserCommitment = () => {
    if (!pool || !dbUser) return null;

    // Check if there was an error fetching commitments
    if (commitmentsError) {
      return (
        <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Your Total Commitment</h3>
          <div className="p-3 rounded-lg bg-[#1A1625] text-center">
            <p className="text-red-400">
              Unable to fetch your token balance. Please try again later.
            </p>
          </div>
        </div>
      );
    }

    // Show loading state while commitments are being fetched
    if (isCommitmentsLoading) {
      return (
        <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Your Total Commitment</h3>
          <div className="p-3 rounded-lg bg-[#1A1625] flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        </div>
      );
    }

    const userPatron = getUserCommitment();

    // If user hasn't committed to this pool, don't show the section
    if (!userPatron) return null;

    return (
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-xl font-semibold mb-4">Your Commitment</h3>
        {userPatron ? (
          <div className="p-4 rounded-lg bg-[#1A1625]">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Amount:</span>
              <div className="flex items-center">
                <span className="text-xl font-bold mr-2">
                  {userPatron.amount}
                </span>
                <span className="text-sm font-medium text-purple-400">
                  {pool.currency}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-gray-400 mb-4">
              You haven&apos;t committed to this pool yet. Enter an amount to
              commit:
            </p>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={commitAmount}
                  onChange={(e) => setCommitAmount(e.target.value)}
                  placeholder="Amount in USDC"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg flex-grow"
                  disabled={isApproving}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleCommit}
                    disabled={
                      isApproving ||
                      !commitAmount ||
                      parseFloat(commitAmount) <= 0 ||
                      !walletsReady
                    }
                    className={`px-4 py-2 rounded-lg ${
                      isApproving
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    } transition-colors duration-200`}
                    title="Standard commit (requires gas)"
                  >
                    {isApproving ? (
                      <div className="flex items-center space-x-2">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
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
                        <span>Processing...</span>
                      </div>
                    ) : (
                      "Commit"
                    )}
                  </button>

                  <button
                    onClick={handleBiconomyCommit}
                    disabled={
                      isApproving ||
                      !commitAmount ||
                      parseFloat(commitAmount) <= 0 ||
                      !biconomyWalletAddress
                    }
                    className={`px-4 py-2 rounded-lg ${
                      isApproving
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700"
                    } transition-colors duration-200`}
                    title="Gasless commit (no confirmation dialogs)"
                  >
                    {isApproving ? (
                      <div className="flex items-center space-x-2">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
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
                        <span>Processing...</span>
                      </div>
                    ) : (
                      "Commit Gasless"
                    )}
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Available: {usdcBalance ? `${usdcBalance} USDC` : "Loading..."}
              </p>
              {!walletsReady && (
                <p className="text-sm text-yellow-500">
                  Wallet not ready. Please wait...
                </p>
              )}
              {biconomyWalletAddress && (
                <p className="text-sm text-green-500">
                  Biconomy Smart Account: {biconomyWalletAddress.slice(0, 6)}...
                  {biconomyWalletAddress.slice(-4)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render blockchain information section
  const renderBlockchainInfo = () => {
    if (!pool) return null;

    const {
      blockchain_tx_hash,
      blockchain_status,
      blockchain_network,
      blockchain_explorer_url,
      contract_address,
    } = pool;

    return (
      <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Blockchain Information</h3>

        {blockchain_tx_hash && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Status:</span>
              <span
                className={`font-medium ${
                  blockchain_status === "active" ||
                  blockchain_status === "confirmed"
                    ? "text-green-400"
                    : blockchain_status === "pending"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {blockchain_status === "confirmed" ||
                blockchain_status === "active"
                  ? "Active"
                  : blockchain_status || "Inactive"}
              </span>
            </div>

            {blockchain_network && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Network:</span>
                <span className="font-medium capitalize">
                  {blockchain_network}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Transaction:</span>
              <a
                href={
                  blockchain_explorer_url
                    ? blockchain_explorer_url
                    : blockchain_network === "monad"
                    ? `https://testnet.monadexplorer.com/tx/${blockchain_tx_hash}`
                    : `https://sepolia.basescan.org/tx/${blockchain_tx_hash}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                View on Explorer
              </a>
            </div>

            {contract_address && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Contract Address</span>
                <a
                  href={
                    blockchain_network === "monad"
                      ? `https://testnet.monadexplorer.com/address/${contract_address}`
                      : `https://sepolia.basescan.org/address/${contract_address}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  View Contract
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper function to get the explorer URL based on the network
  const getExplorerUrl = (pool: Pool) => {
    if (pool.blockchain_explorer_url) {
      return pool.blockchain_explorer_url;
    }

    const network = pool.blockchain_network || "monad";
    const txHash = pool.blockchain_tx_hash;

    if (!txHash) return "#";

    if (network === "monad") {
      return `${
        process.env.NEXT_PUBLIC_BLOCKCHAIN_EXPLORER ||
        "https://testnet.monadexplorer.com"
      }/tx/${txHash}`;
    } else if (network === "base") {
      return `https://sepolia.basescan.org/tx/${txHash}`;
    } else {
      return `https://sepolia.etherscan.io/tx/${txHash}`;
    }
  };

  // Render pool actions section
  const renderPoolActions = () => {
    if (!pool || !dbUser) return null;

    const { status, creator_id, min_commitment, currency } = pool;
    const isCreator = dbUser.id === creator_id;

    return (
      <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Actions</h3>

        {isCreator && (
          <button
            onClick={handleTogglePoolStatus}
            disabled={isActivating}
            className={`w-full py-2 px-4 rounded-lg font-medium ${
              isActivating
                ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                : pool.blockchain_status === "active" ||
                  pool.blockchain_status === "confirmed" ||
                  pool.status === "active"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
          >
            {isActivating
              ? "Updating..."
              : pool.blockchain_status === "active" ||
                pool.blockchain_status === "confirmed" ||
                pool.status === "active"
              ? "Deactivate Pool"
              : "Activate Pool"}
          </button>
        )}

        {!isCreator && status === "active" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Your Balance:</span>
              <span className="font-medium">
                {usdcBalance} {currency}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={commitAmount}
                onChange={(e) => setCommitAmount(e.target.value)}
                min={min_commitment || 1}
                step="1"
                className="flex-1 py-2 px-4 rounded-lg bg-[#1A1625] text-white border border-gray-700 focus:outline-none focus:border-blue-500"
                placeholder={`Min: ${min_commitment || 1}`}
              />
              <button
                onClick={handleMaxClick}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Max
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render organizer section
  const renderOrganizer = () => {
    if (!pool || !creator) return null;

    return (
      <div
        className="mt-6 p-4 bg-[#2A2640] rounded-lg cursor-pointer hover:bg-[#352f54] transition-colors"
        onClick={() => router.push(`/profile/${creator.id}`)}
      >
        <h3 className="text-lg font-semibold mb-4">Organizer</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {creator.avatar_url ? (
              <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
                <Image
                  src={creator.avatar_url}
                  alt={creator.name || "Organizer"}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center mr-3">
                <span className="text-white text-lg font-bold">
                  {creator.name?.charAt(0) || "?"}
                </span>
              </div>
            )}
            <div>
              <div className="font-semibold text-white">
                {creator.name || "Anonymous"}
                {dbUser?.id === creator.id && (
                  <span className="ml-2 text-purple-400 text-sm">You</span>
                )}
              </div>
              <div className="text-sm text-gray-400">Eth Denver</div>
            </div>
          </div>
          <div className="text-gray-400">
            <FaChevronRight />
          </div>
        </div>
      </div>
    );
  };

  // Render pool patrons section
  const renderPoolPatrons = () => {
    if (!pool || !patrons) return null;

    const { currency } = pool;

    return (
      <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Patrons</h3>
          <button
            onClick={() => setShowPatrons(!showPatrons)}
            className="text-gray-400 hover:text-white"
          >
            {showPatrons ? <FaChevronUp /> : <FaChevronRight />}
          </button>
        </div>

        {showPatrons && (
          <div className="space-y-4">
            {patrons.map((patron) => (
              <div
                key={patron.id}
                className="flex items-center justify-between p-2 rounded-lg bg-[#1A1625]"
              >
                <div className="flex items-center">
                  {patron.user?.avatar_url && (
                    <Image
                      src={patron.user.avatar_url}
                      alt={patron.user.name || "Patron"}
                      width={32}
                      height={32}
                      className="rounded-full mr-2"
                    />
                  )}
                  <span className="text-gray-400">
                    {patron.user?.name || "Anonymous"}
                  </span>
                </div>
                <span className="font-medium">
                  {patron.amount} {currency}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render main content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!pool) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Pool Not Found</h1>
            <p className="text-gray-400">
              The pool you're looking for doesn't exist.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4">
        {/* Pool Status, Image and Title */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            {/* Pool Image */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
              {pool.image_url ? (
                <Image
                  src={pool.image_url}
                  alt={pool.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white">
                  <span className="text-xl font-bold">
                    {pool.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Pool Title and Status */}
            <div className="flex-1">
              <div className="flex flex-col">
                <div className="text-purple-400 text-sm font-medium mb-1">
                  {pool.blockchain_status === "active" ||
                  pool.blockchain_status === "confirmed"
                    ? "Accepting patrons"
                    : pool.blockchain_status === "pending"
                    ? "Pending"
                    : pool.status || "Inactive"}
                </div>
                <h1 className="text-3xl font-bold">{pool.name}</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Raising and Time Info */}
        <div className="mb-4">
          <div className="text-gray-400 mb-2">
            Raising • Ends in {days} days
          </div>
          <div className="flex items-center justify-between">
            <div className="text-5xl font-bold">
              ${targetAmount.toLocaleString()}
            </div>
            <div className="text-xl text-gray-400">
              {percentage.toFixed(1)}% • ${raisedAmount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative h-1 bg-gray-800 mb-8">
          <div
            className="absolute left-0 top-0 h-full bg-purple-500"
            style={{
              width: `${Math.min(percentage, 100)}%`,
            }}
          ></div>
        </div>

        {/* User's Commitment */}
        {renderUserCommitment()}

        {/* Time Left Block */}
        <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Time left</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#1A1625] p-4 rounded-lg text-center">
              <div className="text-3xl font-bold">{days}</div>
              <div className="text-sm text-gray-400">Days</div>
            </div>
            <div className="bg-[#1A1625] p-4 rounded-lg text-center">
              <div className="text-3xl font-bold">{hours}</div>
              <div className="text-sm text-gray-400">Hours</div>
            </div>
            <div className="bg-[#1A1625] p-4 rounded-lg text-center">
              <div className="text-3xl font-bold">{minutes}</div>
              <div className="text-sm text-gray-400">Minutes</div>
            </div>
            <div className="bg-[#1A1625] p-4 rounded-lg text-center">
              <div className="text-3xl font-bold">{seconds}</div>
              <div className="text-sm text-gray-400">Seconds</div>
            </div>
          </div>
        </div>

        {/* Token Section */}
        <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Token</h3>
          <div className="flex items-center gap-3 bg-[#1A1625] p-4 rounded-lg">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-2xl">🎭</span>
            </div>
            <div className="text-2xl font-bold">${pool.token_symbol}</div>
          </div>
        </div>

        {/* Pool Details */}
        <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Pool Details</h3>

          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Status:</span>
            <span
              className={`font-medium ${
                pool.blockchain_status === "active" ||
                pool.blockchain_status === "confirmed"
                  ? "text-green-400"
                  : pool.blockchain_status === "pending"
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {pool.blockchain_status === "active" ||
              pool.blockchain_status === "confirmed"
                ? "Active"
                : pool.blockchain_status === "pending"
                ? "Pending"
                : "Inactive"}
            </span>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Funding Stage:</span>
            <span className="font-medium capitalize">{pool.funding_stage}</span>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Target Amount:</span>
            <span className="font-medium">
              {pool.target_amount.toLocaleString()} {pool.currency}
            </span>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Minimum Commitment:</span>
            <span className="font-medium">
              {pool.min_commitment?.toLocaleString() || "0"} {pool.currency}
            </span>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Raised Amount:</span>
            <span className="font-medium">
              {pool.raised_amount.toLocaleString()} {pool.currency}
            </span>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Token Amount:</span>
            <span className="font-medium">
              {pool.token_amount} {pool.token_symbol}
            </span>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Ends At:</span>
            <span className="font-medium">
              {new Date(pool.ends_at).toLocaleDateString()}
            </span>
          </div>

          {pool.location && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Location:</span>
              <span className="font-medium">{pool.location}</span>
            </div>
          )}

          {pool.venue && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Venue:</span>
              <span className="font-medium">{pool.venue}</span>
            </div>
          )}
        </div>

        {/* Pool Actions */}
        <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
          <div className="space-y-4">
            {dbUser && dbUser.id === pool.creator_id && (
              <button
                onClick={handleTogglePoolStatus}
                disabled={isActivating}
                className={`w-full py-3 px-4 rounded-lg font-medium text-lg mb-4 ${
                  isActivating
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : pool.blockchain_status === "active" ||
                      pool.blockchain_status === "confirmed" ||
                      pool.status === "active"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                {isActivating
                  ? "Updating..."
                  : pool.blockchain_status === "active" ||
                    pool.blockchain_status === "confirmed" ||
                    pool.status === "active"
                  ? "Deactivate Pool"
                  : "Activate Pool"}
              </button>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Your Balance:</span>
              <span className="font-medium">
                {usdcBalance} {pool.currency}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={commitAmount}
                onChange={(e) => setCommitAmount(e.target.value)}
                min={pool.min_commitment || 1}
                step="1"
                className="flex-1 py-2 px-4 rounded-lg bg-[#1A1625] text-white border border-gray-700 focus:outline-none focus:border-blue-500"
                placeholder={`Min: ${pool.min_commitment || 1}`}
              />
              <button
                onClick={handleMaxClick}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Max
              </button>
            </div>
            <button
              onClick={handleCommit}
              disabled={isApproving}
              className={`w-full py-3 px-4 rounded-lg font-medium text-lg ${
                isApproving
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-[#4F46E5] text-white hover:bg-[#4338CA]"
              }`}
            >
              {isApproving ? "Processing..." : "Commit"}
            </button>
          </div>
        </div>

        {/* Organizer */}
        {renderOrganizer()}

        {/* Patrons */}
        {renderPoolPatrons()}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0F0D1B] text-white flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Back Button */}
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-white"
          >
            <FaArrowLeft className="mr-2" />
            Back
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : !pool ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-2">Pool Not Found</h1>
              <p className="text-gray-400">
                The pool you're looking for doesn't exist.
              </p>
            </div>
          </div>
        ) : (
          <div className="container mx-auto px-4">
            {/* Pool Status, Image and Title */}
            <div className="mb-6">
              <div className="flex items-center gap-4">
                {/* Pool Image */}
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                  {pool.image_url ? (
                    <Image
                      src={pool.image_url}
                      alt={pool.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-purple-500 text-white">
                      <span className="text-xl font-bold">
                        {pool.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pool Title and Status */}
                <div className="flex-1">
                  <div className="flex flex-col">
                    <div className="text-purple-400 text-sm font-medium mb-1">
                      {pool.blockchain_status === "active" ||
                      pool.blockchain_status === "confirmed"
                        ? "Accepting patrons"
                        : pool.blockchain_status === "pending"
                        ? "Pending"
                        : pool.status || "Inactive"}
                    </div>
                    <h1 className="text-3xl font-bold">{pool.name}</h1>
                  </div>
                </div>
              </div>
            </div>

            {/* Raising and Time Info */}
            <div className="mb-4">
              <div className="text-gray-400 mb-2">
                Raising • Ends in {days} days
              </div>
              <div className="flex items-center justify-between">
                <div className="text-5xl font-bold">
                  ${targetAmount.toLocaleString()}
                </div>
                <div className="text-xl text-gray-400">
                  {percentage.toFixed(1)}% • ${raisedAmount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-1 bg-gray-800 mb-8">
              <div
                className="absolute left-0 top-0 h-full bg-purple-500"
                style={{
                  width: `${Math.min(percentage, 100)}%`,
                }}
              ></div>
            </div>

            {/* User's Commitment */}
            {renderUserCommitment()}

            {/* Time Left Block */}
            <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Time left</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#1A1625] p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold">{days}</div>
                  <div className="text-sm text-gray-400">Days</div>
                </div>
                <div className="bg-[#1A1625] p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold">{hours}</div>
                  <div className="text-sm text-gray-400">Hours</div>
                </div>
                <div className="bg-[#1A1625] p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold">{minutes}</div>
                  <div className="text-sm text-gray-400">Minutes</div>
                </div>
                <div className="bg-[#1A1625] p-4 rounded-lg text-center">
                  <div className="text-3xl font-bold">{seconds}</div>
                  <div className="text-sm text-gray-400">Seconds</div>
                </div>
              </div>
            </div>

            {/* Token Section */}
            <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Token</h3>
              <div className="flex items-center gap-3 bg-[#1A1625] p-4 rounded-lg">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎭</span>
                </div>
                <div className="text-2xl font-bold">${pool.token_symbol}</div>
              </div>
            </div>

            {/* Pool Details */}
            <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Pool Details</h3>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Status:</span>
                <span
                  className={`font-medium ${
                    pool.blockchain_status === "active" ||
                    pool.blockchain_status === "confirmed"
                      ? "text-green-400"
                      : pool.blockchain_status === "pending"
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {pool.blockchain_status === "active" ||
                  pool.blockchain_status === "confirmed"
                    ? "Active"
                    : pool.blockchain_status === "pending"
                    ? "Pending"
                    : "Inactive"}
                </span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Funding Stage:</span>
                <span className="font-medium capitalize">
                  {pool.funding_stage}
                </span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Target Amount:</span>
                <span className="font-medium">
                  {pool.target_amount.toLocaleString()} {pool.currency}
                </span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Minimum Commitment:</span>
                <span className="font-medium">
                  {pool.min_commitment?.toLocaleString() || "0"} {pool.currency}
                </span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Raised Amount:</span>
                <span className="font-medium">
                  {pool.raised_amount.toLocaleString()} {pool.currency}
                </span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Token Amount:</span>
                <span className="font-medium">
                  {pool.token_amount} {pool.token_symbol}
                </span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Ends At:</span>
                <span className="font-medium">
                  {new Date(pool.ends_at).toLocaleDateString()}
                </span>
              </div>

              {pool.location && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Location:</span>
                  <span className="font-medium">{pool.location}</span>
                </div>
              )}

              {pool.venue && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Venue:</span>
                  <span className="font-medium">{pool.venue}</span>
                </div>
              )}
            </div>

            {/* Pool Actions */}
            <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
              <div className="space-y-4">
                {dbUser && dbUser.id === pool.creator_id && (
                  <button
                    onClick={handleTogglePoolStatus}
                    disabled={isActivating}
                    className={`w-full py-3 px-4 rounded-lg font-medium text-lg mb-4 ${
                      isActivating
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                        : pool.blockchain_status === "active" ||
                          pool.blockchain_status === "confirmed" ||
                          pool.status === "active"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {isActivating
                      ? "Updating..."
                      : pool.blockchain_status === "active" ||
                        pool.blockchain_status === "confirmed" ||
                        pool.status === "active"
                      ? "Deactivate Pool"
                      : "Activate Pool"}
                  </button>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Your Balance:</span>
                  <span className="font-medium">
                    {usdcBalance} {pool.currency}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={commitAmount}
                    onChange={(e) => setCommitAmount(e.target.value)}
                    min={pool.min_commitment || 1}
                    step="1"
                    className="flex-1 py-2 px-4 rounded-lg bg-[#1A1625] text-white border border-gray-700 focus:outline-none focus:border-blue-500"
                    placeholder={`Min: ${pool.min_commitment || 1}`}
                  />
                  <button
                    onClick={handleMaxClick}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Max
                  </button>
                </div>
                <button
                  onClick={handleCommit}
                  disabled={isApproving}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-lg ${
                    isApproving
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-[#4F46E5] text-white hover:bg-[#4338CA]"
                  }`}
                >
                  {isApproving ? "Processing..." : "Commit"}
                </button>
              </div>
            </div>

            {/* Organizer */}
            {renderOrganizer()}

            {/* Patrons */}
            {renderPoolPatrons()}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0D1B] border-t border-gray-800">
        <BottomNavbar activeTab="party" />
      </div>
      {/* Add padding at the bottom of the main content to prevent overlap */}
      <div className="pb-20"></div>
    </div>
  );
}
