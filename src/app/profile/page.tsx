"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaArrowLeft, FaSignOutAlt } from "react-icons/fa";
import Image from "next/image";
import BottomNavbar from "../components/BottomNavbar";

export default function ProfilePage() {
  const { user, logout } = usePrivy();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [activeTab, setActiveTab] = useState("hosted"); // "hosted" or "funded"

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      // Use the window's inner height for a more accurate measurement
      setViewportHeight(`${window.innerHeight}px`);
    };

    // Set initial height
    updateHeight();

    // Update on resize
    window.addEventListener("resize", updateHeight);

    // Clean up
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Get user display name or wallet address
  const displayName =
    user?.twitter?.username || user?.wallet?.address?.slice(0, 8) || "ronald.d";

  return (
    <div
      className="flex flex-col bg-[#1E1B2E] text-white relative"
      style={{ height: viewportHeight }}
    >
      {/* Header */}
      <header className="flex justify-between items-center p-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
        >
          <FaArrowLeft className="text-white" />
        </button>
        <button
          onClick={handleLogout}
          className="w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center"
        >
          <FaSignOutAlt className="text-white" />
        </button>
      </header>

      {/* Profile Info */}
      <div className="flex flex-col items-center mt-4">
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-purple-600 overflow-hidden">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt="Profile"
                width={112}
                height={112}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-10 h-10 bg-[#2A2640] rounded-full flex items-center justify-center">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M23 3.00005C22.0424 3.67552 20.9821 4.19216 19.86 4.53005C19.2577 3.83756 18.4573 3.34674 17.567 3.12397C16.6767 2.90121 15.7395 2.95724 14.8821 3.2845C14.0247 3.61176 13.2884 4.19445 12.773 4.95376C12.2575 5.71308 11.9877 6.61238 12 7.53005V8.53005C10.2426 8.57561 8.50127 8.18586 6.93101 7.39549C5.36074 6.60513 4.01032 5.43868 3 4.00005C3 4.00005 -1 13 8 17C5.94053 18.398 3.48716 19.099 1 19C10 24 21 19 21 7.50005C20.9991 7.2215 20.9723 6.94364 20.92 6.67005C21.9406 5.66354 22.6608 4.39276 23 3.00005Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold mt-4">{displayName}</h1>
      </div>

      {/* Tabs */}
      <div className="mt-12 border-b border-gray-700">
        <div className="flex">
          <button
            className={`flex-1 py-4 text-center font-semibold ${
              activeTab === "hosted" ? "border-b-2 border-purple-500" : ""
            }`}
            onClick={() => setActiveTab("hosted")}
          >
            Hosted
          </button>
          <button
            className={`flex-1 py-4 text-center font-semibold ${
              activeTab === "funded" ? "border-b-2 border-purple-500" : ""
            }`}
            onClick={() => setActiveTab("funded")}
          >
            Funded
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "70px" }}>
        {activeTab === "hosted" ? (
          <div>
            {/* Hosted Events */}
            <div className="p-4 bg-[#2A2640] rounded-lg m-4 flex items-center">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mr-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Dinner in denver</h3>
                <p className="text-purple-400">• Raising</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">64%</div>
                <div className="w-12 h-12 rounded-full border-4 border-gray-700 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent border-r-transparent transform -rotate-45"></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#2A2640] rounded-lg m-4 flex items-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-white font-bold">M</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">Mountain Cabin</h3>
                <p className="text-gray-400">• Closed</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">32%</div>
                <div className="w-12 h-12 rounded-full border-4 border-gray-700 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-500 border-t-transparent border-r-transparent transform -rotate-45"></div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#2A2640] rounded-lg m-4 flex items-center">
              <div className="w-12 h-12 bg-cyan-500 rounded-full flex items-center justify-center mr-4">
                <span className="text-white font-bold">b</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">bAlnance</h3>
                <p className="text-gray-400">• Closed</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">11%</div>
                <div className="w-12 h-12 rounded-full border-4 border-gray-700 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-500 border-t-transparent border-r-transparent transform -rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-gray-400 mb-4">
              You haven't funded any events yet
            </div>
            <button className="bg-purple-500 px-6 py-3 rounded-full font-medium">
              Browse events
            </button>
          </div>
        )}
      </div>

      {/* Shared Bottom Navigation Bar */}
      <BottomNavbar activeTab="profile" />
    </div>
  );
}
