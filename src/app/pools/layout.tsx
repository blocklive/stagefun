"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import SideNavbar from "../components/SideNavbar";
import BottomNavbar from "../components/BottomNavbar";
import AppHeader from "../components/AppHeader";
import { usePrivy } from "@privy-io/react-auth";
import GetTokensModal from "../components/GetTokensModal";
import InfoModal from "../components/InfoModal";

interface PoolsLayoutProps {
  children: React.ReactNode;
}

export default function PoolsLayout({ children }: PoolsLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated } = usePrivy();
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Check if we need to show a back button (pool detail or edit pages)
  const showBackButton = pathname !== "/pools";

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
      // When viewing a pool, go back to the home page
      router.push("/");
    } else {
      // Default back behavior
      router.back();
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    // This will be overridden by individual pages that need to check for unsaved changes
    return false;
  };

  // Handle navigation attempts
  const handleNavigationAttempt = (path: string) => {
    if (hasUnsavedChanges()) {
      router.push(path);
      return false; // Prevent navigation
    }
    return true; // Allow navigation
  };

  return (
    <div className="min-h-screen bg-[#15161a] text-white">
      <AppHeader
        title={title}
        showTitle={showTitle}
        showBackButton={showBackButton}
        showCreateButton={!pathname.includes("/create")}
        showGetTokensButton={true}
        showPointsButton={true}
        onGetTokensClick={() => setShowTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onPointsClick={handlePointsClick}
        onBackClick={handleBackClick}
        isAuthenticated={authenticated}
      />
      <SideNavbar activeTab="party" isAuthenticated={authenticated} />
      <div className="md:pl-64 flex-1 flex flex-col">
        <div className="h-full">{children}</div>
      </div>
      <BottomNavbar activeTab="party" isAuthenticated={authenticated} />

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
