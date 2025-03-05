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
  getLPTokenSymbol,
  activatePoolOnChain,
} from "../../../lib/services/contract-service";
import { Pool, User } from "../../../lib/supabase";
import { toast } from "react-hot-toast";

export default function PoolDetailsPage() {
  const { user: privyUser } = usePrivy();
  const { wallets, ready } = useWallets();

  const { dbUser } = useSupabase();
  const router = useRouter();
  const params = useParams();
  const poolId = params.id as string;

  const {
    depositToPool: commitToBlockchain,
    isLoading: isBlockchainLoading,
    getBalance,
    walletsReady,
    privyReady,
  } = useContractInteraction();

  // Basic states
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("commit");
  const [commitAmount, setCommitAmount] = useState("1");
  const [showPatrons, setShowPatrons] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 47,
    minutes: 59,
    seconds: 12,
  });

  // Data states
  const [pool, setPool] = useState<Pool | null>(null);
  const [creator, setCreator] = useState<User | null>(null);
  const [patrons, setPatrons] = useState<any[]>([]);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [lpTokenSymbol, setLpTokenSymbol] = useState<string>("");
  const [lpTokenError, setLpTokenError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  // Add state for activation
  const [isActivating, setIsActivating] = useState(false);

  // Load initial pool data
  useEffect(() => {
    let mounted = true;
    let provider: ethers.Provider | null = null;

    async function loadPoolData() {
      try {
        setLoading(true);
        setLpTokenError("");
        const poolData = await getPoolById(poolId);
        if (!poolData || !mounted) return;

        const [creatorData, patronsData] = await Promise.all([
          getUserById(poolData.creator_id),
          getPatronsByPoolId(poolId),
        ]);

        if (!mounted) return;

        setPool(poolData);
        setCreator(creatorData);
        setPatrons(patronsData);

        // Only fetch LP token symbol once if we have both contract address and confirmed status
        if (
          poolData.contract_address &&
          privyReady &&
          poolData.blockchain_status === "confirmed" &&
          !lpTokenSymbol
        ) {
          try {
            if (!provider) {
              provider = new ethers.JsonRpcProvider(
                process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK === "monad"
                  ? "https://testnet-rpc.monad.xyz"
                  : "https://sepolia.base.org"
              );
            }
            const symbol = await getLPTokenSymbol(
              provider,
              poolData.contract_address
            );
            if (mounted && symbol) {
              setLpTokenSymbol(symbol);
            }
          } catch (error) {
            console.error("Error fetching LP token symbol:", error);
            setLpTokenError("Unable to fetch token symbol");
          }
        }
      } catch (error) {
        console.error("Error loading pool data:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPoolData();
    return () => {
      mounted = false;
      provider = null;
    };
  }, [poolId, privyReady, lpTokenSymbol]);

  // Separate effect for balance checking - only run on mount and after successful deposits
  useEffect(() => {
    const address = privyUser?.wallet?.address;
    if (!address || !privyReady) {
      console.log("Skipping balance check - no address or Privy not ready");
      return;
    }

    let mounted = true;

    async function checkBalance() {
      try {
        console.log("Checking balance for address:", address);
        const balance = await getBalance(address as string);
        if (!mounted) return;
        console.log("Setting balance:", balance);
        setUsdcBalance(balance);
      } catch (error) {
        console.error("Error checking balance:", error);
      }
    }

    checkBalance();
    return () => {
      mounted = false;
    };
  }, [privyReady]); // Only run on mount and when Privy becomes ready

  // Viewport height effect
  useEffect(() => {
    const updateHeight = () => setViewportHeight(`${window.innerHeight}px`);
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

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
        // Refresh pool data
        const [newPool, newPatrons] = await Promise.all([
          getPoolById(poolId),
          getPatronsByPoolId(poolId),
        ]);

        if (newPool) setPool(newPool);
        if (newPatrons) setPatrons(newPatrons);

        // Update balance after successful deposit
        if (privyUser?.wallet?.address) {
          const newBalance = await getBalance(privyUser.wallet.address);
          setUsdcBalance(newBalance);
        }

        alert(`Successfully committed ${amount} ${pool.currency} to the pool!`);
      }
    } catch (error: any) {
      console.error("Error during commit:", error);
      alert(`Transaction failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleMaxClick = useCallback(() => {
    setCommitAmount(usdcBalance);
  }, [usdcBalance]);

  // Update function to handle pool activation
  const handleActivatePool = async () => {
    if (!pool || !dbUser) return;

    setIsActivating(true);
    try {
      const response = await fetch("/api/blockchain/activate-pool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          poolId: pool.id,
          userId: dbUser.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to activate pool");
      }

      const result = await response.json();
      console.log("Pool activated:", result);

      // Show success message
      toast.success("Pool activated successfully!");

      // Refresh the page to show updated status
      router.refresh();
    } catch (error) {
      console.error("Error activating pool:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to activate pool"
      );
    } finally {
      setIsActivating(false);
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
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Block:</span>
                <span className="font-medium">
                  {pool.blockchain_block_number}
                </span>
              </div>
            )}

            {pool.contract_address && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">
                  LP Token{" "}
                  {lpTokenSymbol && !lpTokenError && `(${lpTokenSymbol})`}
                  {lpTokenError && (
                    <span className="text-xs text-gray-500 ml-1">
                      (loading...)
                    </span>
                  )}
                </span>
                <a
                  href={
                    pool.blockchain_network === "monad"
                      ? `https://testnet.monadexplorer.com/address/${pool.contract_address}`
                      : `https://sepolia.etherscan.io/address/${pool.contract_address}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline text-sm truncate max-w-[200px]"
                >
                  {pool.contract_address.substring(0, 10)}...
                  {pool.contract_address.substring(
                    pool.contract_address.length - 8
                  )}
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400">
            No blockchain information available
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

        {/* Blockchain Information */}
        {pool.blockchain_tx_hash && (
          <div className="mb-6 p-4 bg-[#1A1724] rounded-lg">
            <h3 className="text-xl font-bold mb-2">Contract Details</h3>
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

              {pool.contract_address && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">
                    LP Token{" "}
                    {lpTokenSymbol && !lpTokenError && `(${lpTokenSymbol})`}
                    {lpTokenError && (
                      <span className="text-xs text-gray-500 ml-1">
                        (loading...)
                      </span>
                    )}
                  </span>
                  <a
                    href={
                      pool.blockchain_network === "monad"
                        ? `https://testnet.monadexplorer.com/address/${pool.contract_address}`
                        : `https://sepolia.etherscan.io/address/${pool.contract_address}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline text-sm truncate max-w-[200px]"
                  >
                    {pool.contract_address.substring(0, 10)}...
                    {pool.contract_address.substring(
                      pool.contract_address.length - 8
                    )}
                  </a>
                </div>
              )}

              <div className="flex justify-between items-center">
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

              {/* Add activation button for pool creator */}
              {dbUser?.id === pool.creator_id &&
                pool.blockchain_status === "confirmed" && (
                  <div className="mt-4">
                    <button
                      onClick={handleActivatePool}
                      disabled={isActivating}
                      className={`w-full py-2 px-4 rounded-lg font-medium ${
                        isActivating
                          ? "bg-gray-600 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {isActivating ? "Activating..." : "Activate Pool"}
                    </button>
                  </div>
                )}
            </div>
          </div>
        )}

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
                  Available: {usdcBalance} {pool.currency}
                </span>
                <button className="text-purple-500" onClick={handleMaxClick}>
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
            disabled={isApproving || isBlockchainLoading}
            className={`w-full py-4 ${
              isApproving || isBlockchainLoading
                ? "bg-purple-700 cursor-not-allowed"
                : "bg-purple-500 hover:bg-purple-600"
            } rounded-full text-white font-medium text-lg flex items-center justify-center`}
          >
            {isApproving || isBlockchainLoading ? (
              <>
                <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin mr-3"></div>
                {isApproving ? "Approving USDC..." : "Confirming..."}
              </>
            ) : (
              "Commit"
            )}
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
