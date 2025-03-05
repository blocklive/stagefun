"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
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
import { useSupabase } from "../../../contexts/SupabaseContext";
import { createPool } from "../../../lib/services/pool-service";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import { Pool } from "@/lib/supabase";

export default function CreatePoolPage() {
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();
  const { client: supabase, isLoading: isClientLoading } =
    useAuthenticatedSupabase();
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    if (!dbUser || !supabase || isClientLoading) {
      alert("Please wait for authentication to complete");
      return;
    }

    try {
      setIsSubmitting(true);

      // Create pool data directly from state variables
      const poolData = {
        name: poolName,
        ticker: ticker,
        description: description,
        target_amount: parseFloat(fundingGoal) || 0,
        min_commitment: parseFloat(minCommitment) || 0,
        currency: currency,
        token_amount: 100000, // Default token amount
        token_symbol: "$PARTY",
        location: location,
        venue: "Convergence Station",
        status: "Accepting patrons",
        funding_stage: "Raising",
        ends_at: new Date(
          new Date().setDate(new Date().getDate() + 2)
        ).toISOString(), // 2 days from now
        creator_id: dbUser.id,
        raised_amount: 0,
      };

      console.log("Submitting pool data:", poolData);

      // Insert the pool using the authenticated client
      const { data, error } = await supabase
        .from("pools")
        .insert(poolData)
        .select()
        .single();

      if (error) {
        console.error("Error creating pool:", error);
        alert("Failed to create pool: " + error.message);
        return;
      }

      console.log("Pool created successfully in database:", data);

      // Now create the pool on the blockchain using the backend API
      try {
        console.log("Creating pool on blockchain via backend API...");

        const response = await fetch("/api/blockchain/create-pool", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            poolId: data.id,
            name: poolData.name,
            userId: dbUser.id,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Failed to create pool on blockchain"
          );
        }

        console.log("Pool created successfully on blockchain:", result);
      } catch (blockchainError: any) {
        console.error("Error creating pool on blockchain:", blockchainError);
        // We don't want to block the user from proceeding if the blockchain transaction fails
        // Just show a warning
        alert(
          "Warning: Pool was created in the database but blockchain transaction failed. Some features may be limited."
        );
      }

      router.push(`/pools/${data.id}`);
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
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
        <form id="createPoolForm" onSubmit={handleSubmit} className="mt-8">
          {/* Pool Name Input */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Party Round Name"
              name="name"
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
              name="ticker"
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
                  name="fundingGoal"
                  value={fundingGoal}
                  onChange={(e) => setFundingGoal(e.target.value)}
                  className="w-full p-4 pl-16 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Currency Selector */}
              <div className="relative">
                <button
                  className="h-full px-4 bg-[#2A2640] rounded-lg flex items-center gap-2"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowCurrencyDropdown(!showCurrencyDropdown);
                  }}
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
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrency("USDC");
                        setShowCurrencyDropdown(false);
                      }}
                    >
                      USDC
                    </button>
                    <button
                      className="w-full p-3 text-left hover:bg-[#3A3650] transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
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
                name="minCommitment"
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
              name="patrons"
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
                name="description"
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
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-4 pl-12 bg-[#2A2640] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Launch Button - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-6 bg-[#121212]">
        <button
          onClick={handleSubmit}
          className="w-full py-4 bg-purple-500 rounded-full text-white font-medium text-lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Launch Party Round"}
        </button>
      </div>
    </div>
  );
}
