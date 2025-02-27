"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
import { useContractInteraction } from "../../../hooks/useContractInteraction";
import { getPoolById } from "../../../lib/services/pool-service";
import {
  commitToPool,
  getPatronsByPoolId,
} from "../../../lib/services/patron-service";
import { getUserById } from "../../../lib/services/user-service";
import { Pool, User } from "../../../lib/supabase";

export default function PoolDetailsPage() {
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();
  const router = useRouter();
  const params = useParams();
  const poolId = params.id as string;

  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("commit");
  const [commitAmount, setCommitAmount] = useState("100");
  const [availableBalance, setAvailableBalance] = useState("140.04");
  const [timeLeft, setTimeLeft] = useState({
    hours: 47,
    minutes: 59,
    seconds: 12,
  });
  const [showPatrons, setShowPatrons] = useState(true);
  const [pool, setPool] = useState<Pool | null>(null);
  const [patrons, setPatrons] = useState<any[]>([]);
  const [creator, setCreator] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCommitting, setIsCommitting] = useState(false);

  // Set the correct viewport height
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Fetch pool data
  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        setLoading(true);

        // Fetch pool details
        const poolData = await getPoolById(poolId);
        if (!poolData) {
          console.error("Pool not found");
          router.push("/pools");
          return;
        }

        setPool(poolData);

        // Fetch pool creator
        const creatorData = await getUserById(poolData.creator_id);
        setCreator(creatorData);

        // Fetch patrons
        const patronsData = await getPatronsByPoolId(poolId);
        setPatrons(patronsData);

        // Calculate time left
        if (poolData.ends_at) {
          const endTime = new Date(poolData.ends_at).getTime();
          const now = new Date().getTime();
          const diff = Math.max(0, endTime - now);

          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          setTimeLeft({ hours, minutes, seconds });
        }
      } catch (error) {
        console.error("Error fetching pool data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (poolId) {
      fetchPoolData();
    }
  }, [poolId, router]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newSeconds = prev.seconds - 1;
        if (newSeconds >= 0) return { ...prev, seconds: newSeconds };

        const newMinutes = prev.minutes - 1;
        if (newMinutes >= 0)
          return { ...prev, minutes: newMinutes, seconds: 59 };

        const newHours = prev.hours - 1;
        if (newHours >= 0) return { hours: newHours, minutes: 59, seconds: 59 };

        // Timer reached zero
        clearInterval(timer);
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCommit = async () => {
    if (!dbUser) {
      alert("You must be logged in to commit to a pool");
      return;
    }

    if (!pool) {
      alert("Pool data not available");
      return;
    }

    try {
      const amount = parseFloat(commitAmount);
      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      // First, commit to the blockchain
      try {
        // Get the contract interaction hook
        const { commitToPool: commitToBlockchain } = useContractInteraction();

        // Show loading state
        setIsCommitting(true);

        // Commit to the blockchain
        await commitToBlockchain(poolId, amount);

        // If successful, also commit to the database
        const result = await commitToPool(dbUser.id, poolId, amount);

        if (result) {
          alert(
            `Successfully committed ${amount} ${pool.currency} to the pool!`
          );

          // Refresh pool data
          const updatedPool = await getPoolById(poolId);
          if (updatedPool) setPool(updatedPool);

          // Refresh patrons
          const updatedPatrons = await getPatronsByPoolId(poolId);
          setPatrons(updatedPatrons);
        } else {
          alert("Failed to commit to the pool in the database");
        }
      } catch (error: any) {
        console.error("Error committing to blockchain:", error);
        alert(
          `Blockchain transaction failed: ${error.message || "Unknown error"}`
        );
      } finally {
        setIsCommitting(false);
      }
    } catch (error) {
      console.error("Error committing to pool:", error);
      alert("An error occurred while committing to the pool");
      setIsCommitting(false);
    }
  };

  // Render blockchain information section
  const renderBlockchainInfo = () => {
    if (!pool) return null;

    return (
      <div className="mt-6 p-4 bg-[#2A2640] rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Blockchain Information</h3>

        {pool.blockchain_tx_hash ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Status:</span>
              <span
                className={`font-medium ${
                  pool.blockchain_status === "confirmed"
                    ? "text-green-400"
                    : pool.blockchain_status === "pending"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {pool.blockchain_status || "Unknown"}
              </span>
            </div>

            {pool.blockchain_network && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Network:</span>
                <span className="font-medium capitalize">
                  {pool.blockchain_network}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Transaction:</span>
              <a
                href={
                  pool.blockchain_explorer_url
                    ? pool.blockchain_explorer_url
                    : pool.blockchain_network === "monad"
                    ? `https://testnet.monadexplorer.com/tx/${pool.blockchain_tx_hash}`
                    : `https://sepolia.etherscan.io/tx/${pool.blockchain_tx_hash}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline text-sm truncate max-w-[200px]"
              >
                {pool.blockchain_tx_hash.substring(0, 10)}...
                {pool.blockchain_tx_hash.substring(
                  pool.blockchain_tx_hash.length - 8
                )}
              </a>
            </div>

            {pool.blockchain_block_number && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Block:</span>
                <span className="font-medium">
                  {pool.blockchain_block_number}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 text-center py-2">
            No blockchain data available
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-purple-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading pool details...</p>
        </div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Pool not found</p>
          <button
            onClick={() => router.push("/pools")}
            className="bg-purple-500 px-6 py-3 rounded-full font-medium"
          >
            Back to Pools
          </button>
        </div>
      </div>
    );
  }

  // Format percentage
  const percentComplete = Math.min(
    100,
    Math.round((pool.raised_amount / pool.target_amount) * 100)
  );

  // Format amounts
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  return (
    <div
      className="flex flex-col bg-black text-white relative"
      style={{ height: viewportHeight }}
    >
      {/* Header with back button */}
      <header className="flex items-center p-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center mr-4"
        >
          <FaArrowLeft className="text-white" />
        </button>

        {/* Pool info */}
        <div className="flex-1 flex items-center">
          <div className="w-12 h-12 rounded-lg bg-purple-600 mr-3 flex items-center justify-center">
            {pool.image_url ? (
              <Image
                src={pool.image_url}
                alt={pool.name}
                width={48}
                height={48}
                className="rounded-lg"
              />
            ) : (
              <span className="text-xl font-bold">
                {pool.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="text-purple-500 text-sm">{pool.status}</div>
            <h1 className="text-2xl font-bold">{pool.name}</h1>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {/* Funding Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <div className="text-gray-400">
              {pool.funding_stage} • Ends in{" "}
              {new Date(pool.ends_at).toLocaleDateString()}
            </div>
            <div>
              {percentComplete}% • {formatAmount(pool.raised_amount)}/
              {formatAmount(pool.target_amount)}
            </div>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${percentComplete}%` }}
            ></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 border-b border-gray-700">
          <button
            className={`flex-1 py-3 text-center ${
              activeTab === "commit"
                ? "text-white border-b-2 border-purple-500"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("commit")}
          >
            Commit
          </button>
          <button
            className={`flex-1 py-3 text-center ${
              activeTab === "withdraw"
                ? "text-white border-b-2 border-purple-500"
                : "text-gray-400"
            }`}
            onClick={() => setActiveTab("withdraw")}
          >
            Withdraw
          </button>
        </div>

        {/* Commit Form */}
        {activeTab === "commit" && (
          <div>
            {/* Amount Input */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">$</span>
                  </div>
                </div>
                <input
                  type="text"
                  value={commitAmount}
                  onChange={(e) => setCommitAmount(e.target.value)}
                  className="w-full p-4 pl-16 bg-[#1A1724] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  {pool.currency}
                </div>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-400">
                  Available: {availableBalance} {pool.currency}
                </span>
                <button
                  className="text-purple-500"
                  onClick={() => setCommitAmount(availableBalance)}
                >
                  Max
                </button>
              </div>
            </div>

            {/* You Receive Section */}
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">You receive</h3>
              <div className="bg-[#1A1724] rounded-lg p-4 mb-4">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 bg-purple-600 rounded-full mr-2 flex items-center justify-center">
                    <FaCheck className="text-white text-xs" />
                  </div>
                  <span>1 x Patron Pass</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-purple-600 rounded-full mr-2 flex items-center justify-center">
                    <span className="text-white text-xs">$</span>
                  </div>
                  <span>
                    {pool.token_amount.toLocaleString()} {pool.token_symbol}
                  </span>
                </div>
              </div>

              {/* Time Left */}
              <div className="bg-[#1A1724] rounded-lg p-4 mb-4">
                <div className="text-gray-400 mb-2">Time left</div>
                <div className="flex justify-center gap-2">
                  <div className="bg-[#2A2640] w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </div>
                  <div className="text-2xl font-bold flex items-center">:</div>
                  <div className="bg-[#2A2640] w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </div>
                  <div className="text-2xl font-bold flex items-center">:</div>
                  <div className="bg-[#2A2640] w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <h3 className="text-xl font-bold mb-2">You receive</h3>
                <p className="text-gray-400">{pool.description}</p>
              </div>

              {/* Location */}
              {pool.location && (
                <div
                  className="bg-[#1A1724] rounded-lg p-4 mb-4 flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    // Open map or location details
                  }}
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center mr-3">
                      <FaMapMarkerAlt className="text-gray-400" />
                    </div>
                    <div>
                      <div className="font-medium">{pool.location}</div>
                      {pool.venue && (
                        <div className="text-sm text-gray-400">
                          {pool.venue}
                        </div>
                      )}
                    </div>
                  </div>
                  <FaChevronRight className="text-gray-400" />
                </div>
              )}

              {/* Organizer */}
              {creator && (
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">Organizer</h3>
                  <div
                    className="bg-[#1A1724] rounded-lg p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => {
                      // View organizer profile
                    }}
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-600 mr-3">
                        {creator.avatar_url ? (
                          <Image
                            src={creator.avatar_url}
                            alt={creator.name || ""}
                            width={48}
                            height={48}
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xl font-bold">
                              {creator.name?.charAt(0).toUpperCase() || "A"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{creator.name}</div>
                        <div className="text-sm text-gray-400">
                          {creator.twitter_username || "@anonymous"}
                        </div>
                      </div>
                    </div>
                    <FaChevronRight className="text-gray-400" />
                  </div>
                </div>
              )}

              {/* Patrons */}
              <div className="mb-4">
                <div
                  className="flex items-center justify-between mb-2 cursor-pointer"
                  onClick={() => setShowPatrons(!showPatrons)}
                >
                  <h3 className="text-xl font-bold">
                    Patrons {patrons.length}
                  </h3>
                  {showPatrons ? (
                    <FaChevronUp className="text-gray-400" />
                  ) : (
                    <FaChevronRight className="text-gray-400" />
                  )}
                </div>

                {showPatrons && (
                  <div className="space-y-2">
                    {patrons.map((patron, index) => (
                      <div
                        key={index}
                        className="bg-[#1A1724] rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-600 mr-3">
                            {patron.user?.avatar_url ? (
                              <Image
                                src={patron.user.avatar_url}
                                alt={patron.user.name || ""}
                                width={48}
                                height={48}
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xl font-bold">
                                  {patron.user?.name?.charAt(0).toUpperCase() ||
                                    "A"}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="font-semibold">
                              {patron.user?.name || "Anonymous"}
                            </div>
                            <div className="text-sm text-gray-400">
                              {patron.user?.twitter_username || "@anonymous"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                            <span className="text-white text-xs">$</span>
                          </div>
                          <span>{patron.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Form - Just a placeholder for now */}
        {activeTab === "withdraw" && (
          <div className="bg-[#1A1724] rounded-lg p-6 text-center">
            <p className="text-gray-400 mb-4">
              You haven't committed any funds to this pool yet.
            </p>
            <button
              className="bg-purple-500 px-6 py-3 rounded-full font-medium"
              onClick={() => setActiveTab("commit")}
            >
              Make a commitment
            </button>
          </div>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">About</h2>
            <p className="text-gray-300 mb-6">
              {pool?.description || "No description available."}
            </p>

            {/* Add the blockchain information section */}
            {renderBlockchainInfo()}

            {/* Rest of the about tab content */}
            {/* ... */}
          </div>
        )}
      </div>

      {/* Commit Button - Fixed at bottom */}
      {activeTab === "commit" && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 bg-black">
          <button
            onClick={handleCommit}
            className="w-full py-4 bg-purple-500 rounded-full text-white font-medium text-lg"
          >
            Commit
          </button>
        </div>
      )}

      {/* Navigation Bar - Hidden when showing the commit button */}
      {activeTab !== "commit" && (
        <div className="absolute bottom-0 left-0 right-0">
          <BottomNavbar activeTab="party" />
        </div>
      )}
    </div>
  );
}
