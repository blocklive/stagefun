"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SideNavbar from "../components/SideNavbar";
import BottomNavbar from "../components/BottomNavbar";
import AppHeader from "../components/AppHeader";
import { usePrivy } from "@privy-io/react-auth";
import GetTokensModal from "../components/GetTokensModal";
import InfoModal from "../components/InfoModal";

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Handle points button click
  const handlePointsClick = () => {
    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen bg-[#15161a] text-white">
      <AppHeader
        showTitle={false}
        showCreateButton={true}
        showGetTokensButton={true}
        showPointsButton={true}
        onGetTokensClick={() => setShowTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onPointsClick={handlePointsClick}
        isAuthenticated={authenticated}
      />
      <SideNavbar activeTab="portfolio" isAuthenticated={authenticated} />
      <div className="md:pl-64 min-h-screen">{children}</div>
      <BottomNavbar activeTab="portfolio" isAuthenticated={authenticated} />

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
