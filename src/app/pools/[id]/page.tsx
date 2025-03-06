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
  } = usePoolCommitments(pool?.contract_address || null);

  const {
    days,
    hours,
    minutes,
    seconds,
    hasEnded,
    isLoading: isTimeLoading,
  } = usePoolTimeLeft(pool);

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
    if (!dbUser || !pool) {
      alert("Please ensure you are logged in");
      return;
    }

    if (!privyUser?.wallet?.address) {
      alert("Please connect your wallet first");
      return;
    }

    const amount = parseFloat(commitAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setIsApproving(true);

    try {
      // Proceed with the blockchain transaction
      console.log("Proceeding with commit transaction");
      const receipt = await commitToBlockchain(poolId, amount);
      console.log("Transaction receipt:", receipt);

      // If blockchain transaction successful, update the database
      const result = await commitToPool(dbUser.id, poolId, amount);
      console.log("Database update result:", result);

      if (result) {
        // Refresh pool data and balance
        await Promise.all([refreshPool(), refreshBalance()]);
        alert(`Successfully committed ${amount} ${pool.currency} to the pool!`);
      }
    } catch (error: any) {
      console.error("Error during commit:", error);
      alert(`Transaction failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsApproving(false);
    }
  };

  // Render pool header section
  const renderPoolHeader = () => {
    if (!pool) return null;

    const {
      name,
      description,
      image_url,
      creator_name,
      creator_avatar_url,
      status,
      funding_stage,
    } = pool;

    return (
      <div className="relative">
        {image_url && (
          <div className="relative h-48 w-full">
            <Image
              src={image_url}
              alt={name}
              fill
              className="object-cover rounded-t-lg"
            />
          </div>
        )}
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-2">{name}</h1>
          <p className="text-gray-400 mb-4">{description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {creator_avatar_url && (
                <Image
                  src={creator_avatar_url}
                  alt={creator_name || "Creator"}
                  width={32}
                  height={32}
                  className="rounded-full mr-2"
                />
              )}
              <span className="text-gray-400">
                Created by {creator_name || "Anonymous"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  status === "active"
                    ? "bg-green-500/20 text-green-400"
                    : status === "pending"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {status}
              </span>
              <span className="px-2 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400">
                {funding_stage}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render pool details section
  const renderPoolDetails = () => {
    if (!pool) return null;

    const {
      blockchain_status,
      funding_stage,
      target_amount,
      raised_amount,
      token_amount,
      token_symbol,
      ends_at,
      location,
      venue,
      currency,
    } = pool;

    return (
      <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Pool Details</h3>

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
            {blockchain_status === "active" || blockchain_status === "confirmed"
              ? "Active"
              : blockchain_status === "pending"
              ? "Pending"
              : "Inactive"}
          </span>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Funding Stage:</span>
          <span className="font-medium capitalize">{funding_stage}</span>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Target Amount:</span>
          <span className="font-medium">
            {target_amount.toLocaleString()} {currency}
          </span>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Raised Amount:</span>
          <span className="font-medium">
            {raised_amount.toLocaleString()} {currency}
          </span>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Token Amount:</span>
          <span className="font-medium">
            {token_amount} {token_symbol}
          </span>
        </div>

        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">Ends At:</span>
          <span className="font-medium">
            {new Date(ends_at).toLocaleDateString()}
          </span>
        </div>

        {location && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Location:</span>
            <span className="font-medium">{location}</span>
          </div>
        )}

        {venue && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400">Venue:</span>
            <span className="font-medium">{venue}</span>
          </div>
        )}
      </div>
    );
  };

  // Render pool progress section
  const renderPoolProgress = () => {
    if (!pool) return null;

    const { target_amount, raised_amount, currency } = pool;
    const progress = (raised_amount / target_amount) * 100;

    return (
      <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Funding Progress</h3>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                Progress
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-blue-600">
                {progress.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
            <div
              style={{ width: `${progress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
            ></div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Raised:</span>
          <span className="font-medium">
            {raised_amount} {currency}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-gray-400">Target:</span>
          <span className="font-medium">
            {target_amount} {currency}
          </span>
        </div>
      </div>
    );
  };

  // Render pool time section
  const renderPoolTime = () => {
    if (!pool || isTimeLoading) return null;

    return (
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
        {/* Pool Status and Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <div
              className={`w-2 h-2 rounded-full ${
                pool.blockchain_status === "active" ||
                pool.blockchain_status === "confirmed"
                  ? "bg-green-500"
                  : pool.blockchain_status === "pending"
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
            ></div>
            <span>
              {pool.blockchain_status === "active" ||
              pool.blockchain_status === "confirmed"
                ? "Active"
                : pool.blockchain_status === "pending"
                ? "Pending"
                : "Inactive"}
            </span>
          </div>
          <h1 className="text-3xl font-bold">{pool.name}</h1>
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
        {renderPoolDetails()}

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
            {/* Pool Status and Title */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    pool.blockchain_status === "active" ||
                    pool.blockchain_status === "confirmed"
                      ? "bg-green-500"
                      : pool.blockchain_status === "pending"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                ></div>
                <span>
                  {pool.blockchain_status === "active" ||
                  pool.blockchain_status === "confirmed"
                    ? "Active"
                    : pool.blockchain_status === "pending"
                    ? "Pending"
                    : "Inactive"}
                </span>
              </div>
              <h1 className="text-3xl font-bold">{pool.name}</h1>
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
            {renderPoolDetails()}

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
