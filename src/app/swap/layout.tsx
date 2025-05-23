"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SideNavbar from "../components/SideNavbar";
import BottomNavbar from "../components/BottomNavbar";
import AppHeader from "../components/AppHeader";
import { usePrivy } from "@privy-io/react-auth";
import GetTokensModal from "../components/GetTokensModal";
import InfoModal from "../components/InfoModal";

export default function SwapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated } = usePrivy();
  const [showTokensModal, setShowTokensModal] = React.useState(false);
  const [showInfoModal, setShowInfoModal] = React.useState(false);

  // Handle points button click
  const handlePointsClick = () => {
    router.push("/onboarding");
  };

  // Handle back button click
  const handleBackClick = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-[#15161a] text-white">
      <AppHeader
        title="SWAP"
        showTitle={true}
        showBackButton={false}
        showCreateButton={false}
        showGetTokensButton={true}
        showPointsButton={true}
        onGetTokensClick={() => setShowTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onPointsClick={handlePointsClick}
        onBackClick={handleBackClick}
        isAuthenticated={authenticated}
      />
      <SideNavbar activeTab="swap" isAuthenticated={authenticated} />

      <div className="md:pl-64 flex-1 flex flex-col">
        <div className="container mx-auto px-4 py-6">
          {/* Swap Navigation Tabs -  */}
          <div className="flex justify-center space-x-8 mb-8">
            <Link
              href="/swap"
              className={`text-lg font-medium ${
                pathname === "/swap"
                  ? "text-[#9b6dff] border-b-2 border-[#9b6dff] pb-1"
                  : "text-gray-400 hover:text-white pb-1"
              }`}
              style={
                pathname === "/swap"
                  ? {
                      borderImage:
                        "linear-gradient(to right, #9b6dff, #836ef9) 1",
                      color: "#9b6dff",
                    }
                  : {}
              }
            >
              Swap
            </Link>
            <Link
              href="/swap/liquidity"
              className={`text-lg font-medium ${
                pathname === "/swap/liquidity"
                  ? "text-[#9b6dff] border-b-2 pb-1"
                  : "text-gray-400 hover:text-white pb-1"
              }`}
              style={
                pathname === "/swap/liquidity"
                  ? {
                      borderImage:
                        "linear-gradient(to right, #9b6dff, #836ef9) 1",
                      color: "#9b6dff",
                    }
                  : {}
              }
            >
              Add Liquidity
            </Link>
            <Link
              href="/swap/positions"
              className={`text-lg font-medium ${
                pathname === "/swap/positions"
                  ? "text-[#9b6dff] border-b-2 pb-1"
                  : "text-gray-400 hover:text-white pb-1"
              }`}
              style={
                pathname === "/swap/positions"
                  ? {
                      borderImage:
                        "linear-gradient(to right, #9b6dff, #836ef9) 1",
                      color: "#9b6dff",
                    }
                  : {}
              }
            >
              Positions
            </Link>
          </div>

          <Suspense fallback={<div>Loading page content...</div>}>
            {children}
          </Suspense>
        </div>
      </div>

      <BottomNavbar activeTab="swap" isAuthenticated={authenticated} />

      {/* Modals */}
      {showTokensModal && (
        <GetTokensModal
          isOpen={showTokensModal}
          onClose={() => setShowTokensModal(false)}
          isAuthenticated={authenticated}
        />
      )}
      {showInfoModal && (
        <InfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
        />
      )}
    </div>
  );
}
