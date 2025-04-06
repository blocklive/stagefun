"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaBolt } from "react-icons/fa";
import Image from "next/image";
import { tickers } from "@/data/tickers";
import { pools } from "@/data/pools";
import AutoScroller from "@/app/components/AutoScroller";
import PoolScroller from "@/app/components/PoolScroller";
import AppHeader from "@/app/components/AppHeader";
import InfoModal from "@/app/components/InfoModal";
import showToast from "@/utils/toast";

export default function LoginPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [hasAccessCode, setHasAccessCode] = useState(false);

  // Check if user has access code cookie
  useEffect(() => {
    // Simple check for the cookie existence - the actual validation happens in the middleware
    const cookies = document.cookie.split(";").map((cookie) => cookie.trim());
    const hasAccessCookie = cookies.some((cookie) =>
      cookie.startsWith("access_code=")
    );
    setHasAccessCode(hasAccessCookie);
  }, []);

  // Use useEffect to handle navigation after authentication
  useEffect(() => {
    const recordAccessCodeUsage = async () => {
      if (authenticated) {
        try {
          // Record that the user has used an access code
          await fetch("/api/access-code/use", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Privy Auth token is automatically added by the browser
            },
          });
        } catch (error) {
          console.error("Error recording access code usage:", error);
        }

        // Navigate to pools page
        router.push("/pools");
      }
    };

    if (ready && authenticated) {
      recordAccessCodeUsage();
    }
  }, [authenticated, ready, router]);

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

  const handleInfoClick = () => {
    setIsInfoModalOpen(true);
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
  };

  const handleLogin = () => {
    if (!hasAccessCode) {
      showToast.error("You need an access code to create an account");
      router.push("/");
      return;
    }
    login();
  };

  return (
    <div
      className="flex flex-col bg-[#1E1B2E] text-white relative"
      style={{ height: viewportHeight }}
    >
      {/* Main content area with scrolling */}
      <div className="flex-1 overflow-y-auto">
        {/* Use the AppHeader component */}
        <AppHeader
          title="Login"
          showBackButton={false}
          showPointsButton={false}
          showCreateButton={false}
          showGetTokensButton={false}
          backgroundColor="#1E1B2E"
          onInfoClick={handleInfoClick}
        />

        {/* Auto-scrolling Navigation */}
        <div className="px-6 mt-6">
          <AutoScroller items={tickers} />
        </div>

        {/* Token Cards - Auto Scrolling */}
        <div className="px-6 mt-8">
          <PoolScroller pools={pools} />
        </div>

        {/* Heading */}
        <div className="px-6 mt-12">
          <h1 className="text-5xl font-bold leading-tight">
            Community event
            <br />
            financing for crypto
          </h1>
        </div>

        {/* Login Button */}
        <div className="px-6 mt-12 mb-8">
          <button
            onClick={handleLogin}
            className="w-full bg-purple-500 py-4 rounded-full text-white text-lg font-medium"
          >
            Log in with 𝕏
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-center">
          <span className="text-gray-500 mr-2">powered by</span>
          <span className="font-bold">MONAD</span>
        </div>
      </div>

      {/* Info Modal */}
      <InfoModal isOpen={isInfoModalOpen} onClose={handleCloseInfoModal} />
    </div>
  );
}
