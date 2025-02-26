"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { FaArrowLeft, FaEdit, FaTwitter, FaSignOutAlt } from "react-icons/fa";
import Image from "next/image";
import { useSupabase } from "../../contexts/SupabaseContext";
import { getUserPools } from "../../lib/services/pool-service";
import { Pool } from "../../lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const { user: privyUser, authenticated, ready, logout } = usePrivy();
  const { dbUser, isLoadingUser } = useSupabase();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("hosted");
  const [userPools, setUserPools] = useState<Pool[]>([]);
  const [isLoadingPools, setIsLoadingPools] = useState(true);

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Fetch user's pools
  useEffect(() => {
    async function fetchUserPools() {
      if (dbUser) {
        setIsLoadingPools(true);
        try {
          const pools = await getUserPools(dbUser.id);
          setUserPools(pools);
        } catch (error) {
          console.error("Error fetching user pools:", error);
        } finally {
          setIsLoadingPools(false);
        }
      }
    }

    fetchUserPools();
  }, [dbUser]);

  if (!ready || isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121212]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!authenticated || !dbUser) {
    router.push("/");
    return null;
  }

  const user = dbUser;
  const displayName = user?.name || "Anonymous";

  return (
    <div
      className="flex flex-col bg-[#121212] text-white"
      style={{ minHeight: viewportHeight }}
    >
      {/* Profile Header with Avatar and Name */}
      <div className="relative pt-12 pb-8 flex flex-col items-center bg-purple-900">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
        >
          <FaArrowLeft className="text-white" />
        </button>

        {/* Logout Button in Top Right */}
        <button
          onClick={() => logout()}
          className="absolute top-6 right-6 w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
          aria-label="Logout"
        >
          <FaSignOutAlt className="text-white" />
        </button>

        {/* Profile Picture */}
        <div className="relative mb-4">
          <div className="w-28 h-28 rounded-full bg-purple-600 overflow-hidden">
            {user?.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt="Profile"
                width={112}
                height={112}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                {displayName.charAt(0)}
              </div>
            )}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <FaEdit className="text-purple-600" />
          </button>
        </div>

        {/* Username */}
        <h1 className="text-3xl font-bold">{displayName}</h1>

        {/* Twitter handle if available */}
        {user?.twitter_username && (
          <div className="flex items-center mt-1 text-gray-300">
            <FaTwitter className="mr-2" />
            <span>@{user.twitter_username}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          className={`flex-1 py-4 text-center font-medium ${
            activeTab === "hosted"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("hosted")}
        >
          Hosted
        </button>
        <button
          className={`flex-1 py-4 text-center font-medium ${
            activeTab === "funded"
              ? "text-white border-b-2 border-purple-500"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("funded")}
        >
          Funded
        </button>
      </div>

      {/* Pool List */}
      <div className="flex-1 p-4">
        {isLoadingPools ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : userPools.length > 0 ? (
          <div className="space-y-4">
            {userPools.map((pool) => (
              <div
                key={pool.id}
                className="bg-gray-800 rounded-lg overflow-hidden"
                onClick={() => router.push(`/pools/${pool.id}`)}
              >
                <div className="p-4 flex items-center">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex-shrink-0 flex items-center justify-center">
                    {pool.image_url ? (
                      <Image
                        src={pool.image_url}
                        alt={pool.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full rounded-full"
                      />
                    ) : (
                      <span className="text-lg font-bold">
                        {pool.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="font-bold">{pool.name}</h3>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-400">• {pool.status}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {Math.round(
                        (pool.raised_amount / pool.target_amount) * 100
                      )}
                      %
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-700 h-1">
                  <div
                    className="bg-purple-500 h-1"
                    style={{
                      width: `${Math.min(
                        (pool.raised_amount / pool.target_amount) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            {activeTab === "hosted"
              ? "You haven't created any pools yet."
              : "You haven't funded any pools yet."}
          </div>
        )}
      </div>
    </div>
  );
}
