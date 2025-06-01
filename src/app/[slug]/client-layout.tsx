"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import SideNavbar from "../components/SideNavbar";
import BottomNavbar from "../components/BottomNavbar";
import AppHeader from "../components/AppHeader";
import { usePrivy } from "@privy-io/react-auth";
import GetTokensModal from "../components/GetTokensModal";
import InfoModal from "../components/InfoModal";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { authenticated } = usePrivy();
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Always show back button for slug pages
  const showBackButton = true;

  // Handle points button click
  const handlePointsClick = () => {
    router.push("/rewards");
  };

  // Handle back button click
  const handleBackClick = () => {
    // Go back to the home page
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#15161a] text-white">
      <AppHeader
        showBackButton={showBackButton}
        showCreateButton={true}
        showGetTokensButton={true}
        showPointsButton={true}
        onGetTokensClick={() => setShowTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onPointsClick={handlePointsClick}
        onBackClick={handleBackClick}
        isAuthenticated={authenticated}
        showTitle={false}
        title=""
      />
      <SideNavbar activeTab="party" isAuthenticated={authenticated} />
      <div className="md:pl-64 flex-1 flex flex-col">
        <div className="h-full">{children}</div>
      </div>
      <BottomNavbar activeTab="party" isAuthenticated={authenticated} />

      {/* Modals */}
      <GetTokensModal
        isOpen={showTokensModal}
        onClose={() => setShowTokensModal(false)}
        isAuthenticated={authenticated}
      />
      <InfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
}
