"use client";

import { useState, useEffect } from "react";

interface PoolData {
  id: string;
  name: string;
  title: string;
  description: string;
  image_url?: string;
  raised_amount: number;
  target_amount: number;
  token_symbol?: string;
  creator?: {
    id: string;
    name: string;
    avatar_url: string;
  };
}

export default function TestOGPage() {
  const [slug, setSlug] = useState("0vvhmop3");
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolData = async (poolSlug: string) => {
    if (!poolSlug.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch pool data directly from our service
      const response = await fetch(
        `/api/pool-metadata?slug=${encodeURIComponent(poolSlug)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch pool: ${response.status}`);
      }

      const data = await response.json();
      setPoolData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPoolData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateFundingPercentage = (
    raised: number,
    target: number
  ): number => {
    return target > 0 ? Math.min(Math.round((raised / target) * 100), 100) : 0;
  };

  const generateOGUrl = () => {
    if (!poolData) return "";

    const params = new URLSearchParams();
    params.set("title", poolData.name || poolData.title);
    if (poolData.token_symbol) {
      params.set("tokenSymbol", poolData.token_symbol);
    }
    if (poolData.image_url) {
      params.set("imageUrl", poolData.image_url);
    }
    return `/api/og?${params.toString()}`;
  };

  const handleSlugSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPoolData(slug);
  };

  // Auto-fetch on mount with default slug
  useEffect(() => {
    if (slug) {
      fetchPoolData(slug);
    }
  }, []);

  const ogUrl = generateOGUrl();

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          OG Image Test - Real Pool Data
        </h1>

        {/* Slug Input */}
        <form onSubmit={handleSlugSubmit} className="mb-8">
          <div className="max-w-md mx-auto">
            <label className="block text-sm font-medium mb-2">Pool Slug</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-md text-white"
                placeholder="e.g., 0vvhmop3"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-md font-medium"
              >
                {loading ? "Loading..." : "Test"}
              </button>
            </div>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/50 border border-red-700 rounded-lg text-center">
            <p className="text-red-300">Error: {error}</p>
          </div>
        )}

        {/* Pool Data Display */}
        {poolData && (
          <div className="mb-8 p-6 bg-[#1a1a1a] rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Pool Data</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Name:</span>{" "}
                {poolData.name || poolData.title}
              </div>
              <div>
                <span className="text-gray-400">Creator:</span>{" "}
                {poolData.creator?.name || "Unknown"}
              </div>
              <div>
                <span className="text-gray-400">Token Symbol:</span>{" "}
                {poolData.token_symbol || "None"}
              </div>
              <div>
                <span className="text-gray-400">Has Image:</span>{" "}
                {poolData.image_url ? "Yes" : "No"}
              </div>
            </div>
            {poolData.description && (
              <div className="mt-4">
                <span className="text-gray-400">Description (cleaned):</span>
                <p className="mt-1 text-sm">{poolData.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Twitter Card Preview */}
        {poolData && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-center">
              Twitter Card Preview
            </h2>
            <div className="max-w-md mx-auto bg-[#1a1a1a] border border-[#404040] rounded-lg overflow-hidden">
              {/* Card Image */}
              <div className="w-full h-48 bg-gray-800">
                <img
                  src={ogUrl}
                  alt="OG Image Preview"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Card Content */}
              <div className="p-4">
                <div className="text-xs text-gray-400 mb-1">APP.STAGE.FUN</div>
                <div className="font-semibold text-white mb-1 line-clamp-2">
                  {poolData.name || poolData.title} - StageFun
                </div>
                <div className="text-sm text-gray-300 line-clamp-2">
                  {poolData.description
                    ? `${poolData.description.slice(0, 150)}${
                        poolData.description.length > 150 ? "..." : ""
                      }`
                    : `Join ${
                        poolData.creator?.name || "this creator"
                      }'s pool on StageFun.`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OG Image Preview */}
        {poolData && (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">
              OG Image Preview (1200x630)
            </h2>
            <div className="inline-block border border-[#404040] rounded-lg overflow-hidden">
              <img
                src={ogUrl}
                alt="OG Image Preview"
                className="max-w-full h-auto"
                style={{ maxWidth: "800px" }}
              />
            </div>

            {/* URL for debugging */}
            <div className="mt-4 p-4 bg-[#1a1a1a] rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Generated URL:</p>
              <code className="text-xs text-green-400 break-all">{ogUrl}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
