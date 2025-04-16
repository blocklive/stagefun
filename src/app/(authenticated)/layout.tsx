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

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated } = usePrivy();
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
      // When viewing a pool, go back to the pools list
      router.push("/pools");
    } else {
      // Default back behavior
      router.back();
    }
  };

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
    </div>
  );
}
