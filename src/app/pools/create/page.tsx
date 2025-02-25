"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaPencilAlt,
  FaImage,
  FaYoutube,
  FaLink,
  FaBold,
  FaItalic,
  FaListUl,
  FaMapMarkerAlt,
} from "react-icons/fa";
import Image from "next/image";

export default function CreatePoolPage() {
  const { user } = usePrivy();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [poolName, setPoolName] = useState("");
  const [ticker, setTicker] = useState("");
  const [fundingGoal, setFundingGoal] = useState("");
  const [minCommitment, setMinCommitment] = useState("");
  const [patrons, setPatrons] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState("USDC");
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

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

  const handleLaunch = () => {
    // Handle pool creation logic here
    console.log({
      poolName,
      ticker,
      fundingGoal,
      currency,
      minCommitment,
      patrons,
      description,
      location,
    });

    // Navigate back to pools page after creation
    router.push("/pools");
  };

  return (
    <div
      className="flex flex-col bg-[#121212] text-white relative"
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

        {/* Empty div to maintain flex spacing */}
        <div></div>
      </header>

      {/* Page Title */}
      <div className="px-6 mt-4">
        <h1 className="text-5xl font-bold">CREATE PARTY ROUND</h1>
      </div>

      {/* Main content with scrolling */}
      <div
        className="flex-1 overflow-y-auto px-6"
        style={{ paddingBottom: "100px" }}
      >
        {/* Pool Image */}
        <div className="mt-8">
          <div className="relative w-full aspect-square bg-purple-500 rounded-lg overflow-hidden flex items-center justify-center">
            <div className="text-4xl font-bold text-center text-[#1E1B2E] p-8">
              YOU ARE INVITED
            </div>
            <button className="absolute bottom-4 right-4 w-12 h-12 bg-[#2A2640] rounded-full flex items-center justify-center">
              <FaPencilAlt className="text-white" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="mt-8">
          {/* Pool Name Input */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Party Round Name"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              className="w-full p-4 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Sticker Input */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="$TICKER"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full p-4 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Funding Goal Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Funding goal</h2>
            <div className="flex gap-4">
              {/* Amount Input */}
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">$</span>
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="0"
                  value={fundingGoal}
                  onChange={(e) => setFundingGoal(e.target.value)}
                  className="w-full p-4 pl-16 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Currency Selector */}
              <div className="relative">
                <button
                  className="h-full px-4 bg-[#2A2640] rounded-lg flex items-center gap-2"
                  onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">$</span>
                  </div>
                  <span>{currency}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={`transition-transform ${
                      showCurrencyDropdown ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Dropdown */}
                {showCurrencyDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-full bg-[#2A2640] rounded-lg shadow-lg z-10">
                    <button
                      className="w-full p-3 text-left hover:bg-[#3A3650] transition-colors"
                      onClick={() => {
                        setCurrency("USDC");
                        setShowCurrencyDropdown(false);
                      }}
                    >
                      USDC
                    </button>
                    <button
                      className="w-full p-3 text-left hover:bg-[#3A3650] transition-colors"
                      onClick={() => {
                        setCurrency("ETH");
                        setShowCurrencyDropdown(false);
                      }}
                    >
                      ETH
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Minimum Commitment */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">$</span>
                </div>
              </div>
              <input
                type="text"
                placeholder="Minimum commitment"
                value={minCommitment}
                onChange={(e) => setMinCommitment(e.target.value)}
                className="w-full p-4 pl-16 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Patrons */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Patrons"
              value={patrons}
              onChange={(e) => setPatrons(e.target.value)}
              className="w-full p-4 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Description</h2>
            <div className="bg-[#2A2640] rounded-lg overflow-hidden">
              <textarea
                placeholder="Write your story..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-transparent text-white placeholder-gray-400 focus:outline-none min-h-[200px] resize-none"
              />

              {/* Text formatting toolbar */}
              <div className="flex items-center p-3 border-t border-gray-700">
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700">
                  <FaImage className="text-white" />
                </button>
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700">
                  <FaYoutube className="text-white" />
                </button>
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700">
                  <FaLink className="text-white" />
                </button>
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700">
                  <FaBold className="text-white" />
                </button>
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700">
                  <FaItalic className="text-white" />
                </button>
                <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-700">
                  <FaListUl className="text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <FaMapMarkerAlt className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Location (Optional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-4 pl-12 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Launch Button - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-6 bg-[#121212]">
        <button
          onClick={handleLaunch}
          className="w-full py-4 bg-purple-500 rounded-full text-white font-medium text-lg"
        >
          Launch Party Round
        </button>
      </div>
    </div>
  );
}
