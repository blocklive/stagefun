"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import SideNavbar from "../components/SideNavbar";
import BottomNavbar from "../components/BottomNavbar";
import AppHeader from "../components/AppHeader";
import Footer from "../components/Footer";
import { usePrivy } from "@privy-io/react-auth";
import GetTokensModal from "../components/GetTokensModal";
import InfoModal from "../components/InfoModal";
import Link from "next/link";

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated, user } = usePrivy();
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Set the correct title for create pool page
  const showTitle = pathname === "/pools/create";
  const title = showTitle ? "CREATE PARTY ROUND" : undefined;

  // Handle points button click
  const handlePointsClick = () => {
    router.push("/onboarding");
  };

  // Handle back button click
  const handleBackClick = () => {
    if (pathname.includes("/pools/edit")) {
      // When editing, go back to the pool details page
      const poolId = pathname.split("/").pop();
      router.push(`/pools/${poolId}`);
    } else if (pathname.includes("/pools/")) {
      // When viewing a pool, go back to the homepage
      router.push("/");
    } else {
      // Default back behavior
      router.back();
    }
  };

  // Check if user is an admin
  const isAdmin = (() => {
    if (!user) return false;

    // Get the user's wallet address from Privy
    const walletAddress = user.wallet?.address?.toLowerCase();

    // Admin addresses list - should be moved to an environment variable or database in production
    const adminAddresses = [
      // List of admin wallet addresses
      "0x123...", // Replace with actual admin addresses
    ];

    return adminAddresses.includes(walletAddress || "");
  })();

  return (
    <div className="min-h-screen bg-[#15161a] text-white">
      <AppHeader
        title={title}
        showTitle={showTitle}
        showBackButton={false}
        showCreateButton={!pathname.includes("/create")}
        showGetTokensButton={true}
        showPointsButton={true}
        onGetTokensClick={() => setShowTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onPointsClick={handlePointsClick}
        onBackClick={handleBackClick}
        isAuthenticated={authenticated}
      />
      <SideNavbar activeTab={"" as any} isAuthenticated={authenticated} />
      <div className="md:pl-64 min-h-screen">
        {children}
        <Footer />
      </div>
      <BottomNavbar activeTab={"" as any} isAuthenticated={authenticated} />

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

      <div className="flex flex-col space-y-2 mt-8">
        <Link
          href="/pools"
          className={`group p-2 hover:bg-gray-800 rounded-lg transition-colors ${
            pathname === "/pools" ? "bg-gray-800" : ""
          }`}
        >
          <div className="flex items-center space-x-3">
            <svg
              className="w-6 h-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L3 9V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V9L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-white">Pools</span>
          </div>
        </Link>

        <Link
          href="/leaderboard"
          className={`group p-2 hover:bg-gray-800 rounded-lg transition-colors ${
            pathname === "/leaderboard" ? "bg-gray-800" : ""
          }`}
        >
          <div className="flex items-center space-x-3">
            <svg
              className="w-6 h-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 6H16M8 10H16M8 14H11M6 22H18C19.1046 22 20 21.1046 20 20V4C20 2.89543 19.1046 2 18 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-white">Leaderboard</span>
          </div>
        </Link>

        <Link
          href="/admin"
          className={`group p-2 hover:bg-gray-800 rounded-lg transition-colors ${
            pathname === "/admin" ? "bg-gray-800" : ""
          }`}
        >
          <div className="flex items-center space-x-3">
            <svg
              className="w-6 h-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-white">Blockchain Status</span>
          </div>
        </Link>

        <Link
          href="/profile"
          className={`group p-2 hover:bg-gray-800 rounded-lg transition-colors ${
            pathname.startsWith("/profile") ? "bg-gray-800" : ""
          }`}
        >
          <div className="flex items-center space-x-3">
            <svg
              className="w-6 h-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-white">Profile</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
