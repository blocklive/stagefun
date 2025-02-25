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
import patronsData from "../../data/patrons.json";

export default function PoolDetailsPage() {
  const { user } = usePrivy();
  const router = useRouter();
  const params = useParams();
  const poolId = params.id;

  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("commit"); // "commit" or "withdraw"
  const [commitAmount, setCommitAmount] = useState("100");
  const [availableBalance, setAvailableBalance] = useState("140.04");
  const [timeLeft, setTimeLeft] = useState({
    hours: 47,
    minutes: 59,
    seconds: 12,
  });
  const [showPatrons, setShowPatrons] = useState(true);

  // Mock pool data - in a real app, you would fetch this from an API
  const poolData = {
    id: poolId,
    name: "1X Technologies",
    status: "Accepting patrons",
    fundingStage: "Raising",
    endsIn: "2 days",
    targetAmount: "1,500,000",
    raisedAmount: "0.47m",
    percentComplete: 64,
    currency: "USDC",
    patronPass: true,
    tokenAmount: "100,000",
    tokenSymbol: "$PARTY",
    description:
      "Patrons will receive an all inclusive dinner with drinks provided. Planning for Nobu, subject to change",
    location: "Denver, Colorado",
    venue: "Convergence Station",
    organizer: {
      name: "Matt Hill",
      username: "Eth Denver",
      avatar: "/placeholder-avatar.png",
    },
  };

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

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

  const handleCommit = () => {
    console.log(`Committing ${commitAmount} USDC to pool ${poolId}`);
    // In a real app, you would call an API to process the commitment
    alert(`Successfully committed ${commitAmount} USDC!`);
  };

  return (
    <div
      className="flex flex-col bg-black text-white relative"
      style={{ height: viewportHeight }}
    >
      {/* Header */}
      <header className="flex justify-between items-center p-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
        >
          <FaArrowLeft className="text-white" />
        </button>

        {/* User profile image - right side of header */}
        <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-600">
          {user?.avatar ? (
            <Image
              src={user.avatar}
              alt="Profile"
              width={40}
              height={40}
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold">
              {user?.twitter?.username?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>
      </header>

      {/* Main content with scrolling */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "70px" }}>
        {/* Pool Header */}
        <div className="px-4">
          {/* Pool Logo and Status */}
          <div className="flex items-center mb-2">
            <div className="w-16 h-16 bg-gray-300 rounded-lg mr-4 overflow-hidden">
              <Image
                src="/placeholder-logo.png"
                alt={poolData.name}
                width={64}
                height={64}
                className="object-cover"
                onError={(e) => {
                  // Fallback for image error
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                }}
              />
            </div>
            <div>
              <div className="text-purple-500 text-sm">{poolData.status}</div>
              <h1 className="text-2xl font-bold">{poolData.name}</h1>
            </div>
          </div>

          {/* Funding Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <div className="text-gray-400">
                {poolData.fundingStage} • Ends in {poolData.endsIn}
              </div>
              <div>
                {poolData.percentComplete}% • {poolData.raisedAmount}/
                {poolData.targetAmount}
              </div>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full"
                style={{ width: `${poolData.percentComplete}%` }}
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
              <div className="mb-4">
                <label className="block text-gray-400 mb-2">You commit</label>
                <div className="flex items-center bg-[#1A1724] rounded-lg p-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white font-bold">$</span>
                  </div>
                  <input
                    type="text"
                    value={commitAmount}
                    onChange={(e) => setCommitAmount(e.target.value)}
                    className="bg-transparent flex-1 text-3xl font-bold focus:outline-none"
                  />
                </div>
                <div className="text-right text-gray-400 mt-1">
                  Available {availableBalance} {poolData.currency}
                </div>
              </div>

              {/* Patron Benefits */}
              <div className="bg-[#1A1724] rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                      <FaCheck className="text-white text-xs" />
                    </div>
                    <span>Patron</span>
                  </div>
                  <div>
                    {commitAmount} {poolData.currency}
                  </div>
                </div>

                <div className="border-t border-gray-700 my-4"></div>

                <div className="flex items-center mb-2">
                  <span className="text-gray-400 mr-2">1 ×</span>
                  <span>Patron Pass</span>
                </div>

                <div className="flex items-center">
                  <span className="text-gray-400 mr-2">1 ×</span>
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mr-2">
                    <span className="text-white text-xs">$</span>
                  </div>
                  <span>
                    {poolData.tokenAmount} {poolData.tokenSymbol}
                  </span>
                </div>
              </div>

              {/* Timer */}
              <div className="bg-[#1A1724] rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Time left</span>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-[#2A2640] rounded-lg flex items-center justify-center text-xl font-bold">
                      {String(timeLeft.hours).padStart(2, "0")}
                    </div>
                    <span className="mx-2 text-xl">:</span>
                    <div className="w-12 h-12 bg-[#2A2640] rounded-lg flex items-center justify-center text-xl font-bold">
                      {String(timeLeft.minutes).padStart(2, "0")}
                    </div>
                    <span className="mx-2 text-xl">:</span>
                    <div className="w-12 h-12 bg-[#2A2640] rounded-lg flex items-center justify-center text-xl font-bold">
                      {String(timeLeft.seconds).padStart(2, "0")}
                    </div>
                  </div>
                </div>
              </div>

              {/* You Receive Section */}
              <div className="mb-4">
                <h3 className="text-2xl font-bold mb-2">You receive</h3>
                <p className="text-gray-400 mb-4">{poolData.description}</p>

                {/* Location */}
                {poolData.location && (
                  <div className="bg-[#1A1724] rounded-lg p-4">
                    <div className="flex items-center text-gray-400 mb-1">
                      <FaMapMarkerAlt className="mr-2" />
                      <span>{poolData.location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{poolData.venue}</span>
                      <FaChevronRight className="text-gray-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Organizer Section */}
              <div className="mb-4">
                <h3 className="text-2xl font-bold mb-2">Organizer</h3>
                <div className="bg-[#1A1724] rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-600 mr-3">
                      <Image
                        src={poolData.organizer.avatar}
                        alt={poolData.organizer.name}
                        width={48}
                        height={48}
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                    <div>
                      <div className="font-medium">
                        {poolData.organizer.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {poolData.organizer.username}
                      </div>
                    </div>
                  </div>
                  <FaChevronRight className="text-gray-400" />
                </div>
              </div>

              {/* Patrons Section */}
              <div className="mb-4">
                <div
                  className="flex items-center justify-between mb-2 cursor-pointer"
                  onClick={() => setShowPatrons(!showPatrons)}
                >
                  <h3 className="text-2xl font-bold">
                    Patrons {patronsData.length}
                  </h3>
                  {showPatrons ? (
                    <FaChevronUp className="text-gray-400" />
                  ) : (
                    <FaChevronRight className="text-gray-400" />
                  )}
                </div>

                {showPatrons && (
                  <div className="space-y-2">
                    {patronsData.map((patron, index) => (
                      <div
                        key={index}
                        className="bg-[#1A1724] rounded-lg p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600 mr-3">
                            {patron.name.charAt(0) === "D" ||
                            patron.name.charAt(0) === "M" ? (
                              <div className="w-full h-full bg-teal-400 flex items-center justify-center text-white font-bold">
                                {patron.name.charAt(0)}
                              </div>
                            ) : (
                              <Image
                                src={patron.avatar}
                                alt={patron.name}
                                width={40}
                                height={40}
                                className="object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = "none";
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <span className="font-medium mr-1">
                                {patron.name}
                              </span>
                              {patron.verified && (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                                    stroke="#8B5CF6"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {patron.username}
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
        </div>
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
