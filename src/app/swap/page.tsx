"use client";

import React, { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSupabase } from "@/contexts/SupabaseContext";
import { ethers } from "ethers";
import {
  approveToken,
  getAmountsOut,
  getDeadlineTimestamp,
  getTokenAllowance,
  getTokenBalance,
  swapExactTokensForTokens,
} from "@/lib/contracts/StageSwap";
import { getContractAddresses } from "@/lib/contracts/addresses";
import AppHeader from "@/app/components/AppHeader";
import { FaArrowDown, FaSync } from "react-icons/fa";
import showToast from "@/utils/toast";

export default function SwapPage() {
  const { user, authenticated, ready, login, getEthersProvider } = usePrivy();
  const { dbUser } = useSupabase();

  const [tokenIn, setTokenIn] = useState("USDC");
  const [tokenOut, setTokenOut] = useState("MON");
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [tokenInBalance, setTokenInBalance] = useState("0");
  const [tokenOutBalance, setTokenOutBalance] = useState("0");
  const [isSwapping, setIsSwapping] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [slippage, setSlippage] = useState("0.5");

  const { usdc, weth } = getContractAddresses();

  const TOKEN_ADDRESSES: Record<string, string> = {
    USDC: usdc,
    MON: weth,
  };

  const TOKEN_DECIMALS: Record<string, number> = {
    USDC: 6,
    MON: 18,
  };

  // Initialize wallet connection
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address) return;

    loadBalances();
  }, [authenticated, user?.wallet?.address]);

  // Check for approval when input changes
  useEffect(() => {
    if (
      !authenticated ||
      !user?.wallet?.address ||
      !amountIn ||
      amountIn === "0"
    ) {
      setNeedsApproval(false);
      return;
    }

    checkApproval();
  }, [amountIn, tokenIn, authenticated, user?.wallet?.address]);

  // Calculate output amount when input changes
  useEffect(() => {
    if (!amountIn || amountIn === "0") {
      setAmountOut("");
      return;
    }

    calculateOutputAmount();
  }, [amountIn, tokenIn, tokenOut]);

  const loadBalances = async () => {
    try {
      if (!authenticated || !user?.wallet?.address) return;

      const provider = await getEthersProvider();
      if (!provider) return;

      // Get USDC balance
      const usdcBalance = await getTokenBalance(
        TOKEN_ADDRESSES["USDC"],
        user.wallet.address,
        provider
      );
      setTokenInBalance(
        tokenIn === "USDC"
          ? ethers.formatUnits(usdcBalance, TOKEN_DECIMALS["USDC"])
          : ethers.formatUnits(usdcBalance, TOKEN_DECIMALS["MON"])
      );

      // Get MON balance
      const monBalance = await provider.getBalance(user.wallet.address);
      setTokenOutBalance(
        tokenOut === "MON"
          ? ethers.formatUnits(monBalance, TOKEN_DECIMALS["MON"])
          : ethers.formatUnits(monBalance, TOKEN_DECIMALS["USDC"])
      );
    } catch (error) {
      console.error("Error loading balances:", error);
    }
  };

  const checkApproval = async () => {
    try {
      if (
        !authenticated ||
        !user?.wallet?.address ||
        !amountIn ||
        amountIn === "0"
      )
        return;

      // Only need approval for ERC20 tokens (USDC), not for native token (MON)
      if (tokenIn === "MON") {
        setNeedsApproval(false);
        return;
      }

      const provider = await getEthersProvider();
      if (!provider) return;

      // Check allowance
      const spenderAddress = getContractAddresses().stageSwapRouter;
      const tokenAddress = TOKEN_ADDRESSES[tokenIn];

      const allowance = await getTokenAllowance(
        tokenAddress,
        user.wallet.address,
        spenderAddress,
        provider
      );

      const amountInWei = ethers.parseUnits(amountIn, TOKEN_DECIMALS[tokenIn]);
      setNeedsApproval(allowance < amountInWei);
    } catch (error) {
      console.error("Error checking approval:", error);
    }
  };

  const calculateOutputAmount = async () => {
    try {
      if (!amountIn || amountIn === "0") {
        setAmountOut("");
        return;
      }

      const provider = await getEthersProvider();
      if (!provider) return;

      // Get path for swap
      const path = [TOKEN_ADDRESSES[tokenIn], TOKEN_ADDRESSES[tokenOut]];

      // Format amount with proper decimals
      const amountInWei = ethers.parseUnits(amountIn, TOKEN_DECIMALS[tokenIn]);

      // Get expected output amount
      const amounts = await getAmountsOut(
        amountInWei.toString(),
        path,
        provider
      );
      setAmountOut(ethers.formatUnits(amounts[1], TOKEN_DECIMALS[tokenOut]));
    } catch (error) {
      console.error("Error calculating output amount:", error);
      setAmountOut("");
    }
  };

  const handleSwap = async () => {
    if (!authenticated) {
      login();
      return;
    }

    try {
      setIsSwapping(true);

      if (!user?.wallet?.address || !amountIn || !amountOut) {
        setIsSwapping(false);
        return;
      }

      const wallet = user.wallet;
      if (!wallet) {
        showToast.error("Wallet not available");
        setIsSwapping(false);
        return;
      }

      // Get a signer
      const provider = await getEthersProvider();
      if (!provider) {
        setIsSwapping(false);
        return;
      }

      // Prepare swap parameters
      const path = [TOKEN_ADDRESSES[tokenIn], TOKEN_ADDRESSES[tokenOut]];
      const deadline = getDeadlineTimestamp();
      const amountInWei = ethers.parseUnits(amountIn, TOKEN_DECIMALS[tokenIn]);

      // Calculate minimum output amount considering slippage
      const slippageMultiplier = 1 - parseFloat(slippage) / 100;
      const minAmountOut = ethers.parseUnits(
        (parseFloat(amountOut) * slippageMultiplier).toFixed(
          TOKEN_DECIMALS[tokenOut]
        ),
        TOKEN_DECIMALS[tokenOut]
      );

      // Execute swap transaction
      const tx = await swapExactTokensForTokens(
        amountInWei.toString(),
        minAmountOut.toString(),
        path,
        user.wallet.address,
        deadline,
        await provider.getSigner()
      );

      // Wait for transaction to complete
      await tx.wait();

      // Refresh balances
      await loadBalances();

      // Reset input fields
      setAmountIn("");
      setAmountOut("");

      showToast.success("Swap completed successfully!");
    } catch (error) {
      console.error("Error swapping tokens:", error);
      showToast.error("Failed to swap tokens. Please try again.");
    } finally {
      setIsSwapping(false);
    }
  };

  const handleApprove = async () => {
    if (!authenticated) {
      login();
      return;
    }

    try {
      setIsApproving(true);

      if (!user?.wallet?.address || !amountIn) {
        setIsApproving(false);
        return;
      }

      // Get a signer
      const provider = await getEthersProvider();
      if (!provider) {
        setIsApproving(false);
        return;
      }

      // Approve exact amount
      const spenderAddress = getContractAddresses().stageSwapRouter;
      const tokenAddress = TOKEN_ADDRESSES[tokenIn];
      const amountInWei = ethers.parseUnits(amountIn, TOKEN_DECIMALS[tokenIn]);

      // Execute approval transaction
      const tx = await approveToken(
        tokenAddress,
        spenderAddress,
        amountInWei.toString(),
        await provider.getSigner()
      );

      // Wait for transaction to complete
      await tx.wait();

      // Update approval status
      setNeedsApproval(false);

      showToast.success("Token approval successful!");
    } catch (error) {
      console.error("Error approving tokens:", error);
      showToast.error("Failed to approve tokens. Please try again.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleSwitchTokens = () => {
    const tempTokenIn = tokenIn;
    const tempTokenOut = tokenOut;
    const tempAmountIn = amountIn;

    setTokenIn(tempTokenOut);
    setTokenOut(tempTokenIn);
    setAmountIn("");
    setAmountOut("");

    const tempInBalance = tokenInBalance;
    setTokenInBalance(tokenOutBalance);
    setTokenOutBalance(tempInBalance);
  };

  const handleMaxAmount = () => {
    setAmountIn(tokenInBalance);
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#161819]">
        <AppHeader />
        <div className="flex justify-center items-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#161819]">
      <AppHeader />

      <main className="container max-w-xl mx-auto px-4 pt-8 pb-20">
        <div className="bg-[#1F2123] rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-6">Swap Tokens</h1>

          {/* Token Input */}
          <div className="mb-4 bg-[#282A2D] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-gray-400 text-sm">From</div>
              <div className="text-gray-400 text-sm">
                Balance: {parseFloat(tokenInBalance).toFixed(6)} {tokenIn}
                <button
                  onClick={handleMaxAmount}
                  className="ml-2 text-purple-500 text-xs font-semibold"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="bg-transparent w-1/2 text-xl font-semibold text-white outline-none"
              />

              <select
                value={tokenIn}
                onChange={(e) => setTokenIn(e.target.value)}
                className="bg-[#353840] text-white px-4 py-2 rounded-xl outline-none"
              >
                <option value="USDC">USDC</option>
                <option value="MON">MON</option>
              </select>
            </div>
          </div>

          {/* Arrow Button */}
          <div className="flex justify-center my-2">
            <button
              onClick={handleSwitchTokens}
              className="bg-[#282A2D] hover:bg-[#353840] p-3 rounded-full transition-colors"
            >
              <FaArrowDown className="text-purple-500" />
            </button>
          </div>

          {/* Token Output */}
          <div className="mb-6 bg-[#282A2D] rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-gray-400 text-sm">To</div>
              <div className="text-gray-400 text-sm">
                Balance: {parseFloat(tokenOutBalance).toFixed(6)} {tokenOut}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <input
                type="number"
                placeholder="0.0"
                value={amountOut}
                readOnly
                className="bg-transparent w-1/2 text-xl font-semibold text-white outline-none"
              />

              <select
                value={tokenOut}
                onChange={(e) => setTokenOut(e.target.value)}
                className="bg-[#353840] text-white px-4 py-2 rounded-xl outline-none"
              >
                <option value="MON">MON</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
          </div>

          {/* Slippage Input */}
          <div className="mb-6">
            <div className="flex justify-between items-center bg-[#282A2D] rounded-xl p-4">
              <div className="text-gray-400 text-sm">Slippage Tolerance</div>

              <div className="flex items-center">
                <input
                  type="number"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="bg-[#353840] text-white w-20 px-3 py-1 rounded-lg outline-none text-right"
                />
                <span className="text-white ml-1">%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!authenticated ? (
            <button
              onClick={login}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
            >
              Connect Wallet
            </button>
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isApproving || !amountIn || amountIn === "0"}
              className={`w-full font-bold py-3 px-4 rounded-xl transition-colors ${
                isApproving || !amountIn || amountIn === "0"
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              {isApproving ? (
                <span className="flex items-center justify-center">
                  <FaSync className="animate-spin mr-2" /> Approving...
                </span>
              ) : (
                `Approve ${tokenIn}`
              )}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={
                isSwapping ||
                !amountIn ||
                amountIn === "0" ||
                !amountOut ||
                amountOut === "0"
              }
              className={`w-full font-bold py-3 px-4 rounded-xl transition-colors ${
                isSwapping ||
                !amountIn ||
                amountIn === "0" ||
                !amountOut ||
                amountOut === "0"
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}
            >
              {isSwapping ? (
                <span className="flex items-center justify-center">
                  <FaSync className="animate-spin mr-2" /> Swapping...
                </span>
              ) : (
                "Swap"
              )}
            </button>
          )}
        </div>

        {/* Price Information */}
        {amountIn && amountOut && amountIn !== "0" && amountOut !== "0" && (
          <div className="bg-[#1F2123] rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Price Information
            </h2>

            <div className="flex justify-between items-center mb-2">
              <div className="text-gray-400">Price</div>
              <div className="text-white">
                1 {tokenIn} ={" "}
                {(parseFloat(amountOut) / parseFloat(amountIn)).toFixed(6)}{" "}
                {tokenOut}
              </div>
            </div>

            <div className="flex justify-between items-center mb-2">
              <div className="text-gray-400">Minimum received</div>
              <div className="text-white">
                {(
                  parseFloat(amountOut) *
                  (1 - parseFloat(slippage) / 100)
                ).toFixed(6)}{" "}
                {tokenOut}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-gray-400">Slippage tolerance</div>
              <div className="text-white">{slippage}%</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
