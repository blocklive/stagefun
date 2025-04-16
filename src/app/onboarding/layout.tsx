"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import SideNavbar from "@/app/components/SideNavbar";
import BottomNavbar from "@/app/components/BottomNavbar";
import AppHeader from "@/app/components/AppHeader";
import InfoModal from "@/app/components/InfoModal";
import GetTokensModal from "@/app/components/GetTokensModal";
import { usePrivy } from "@privy-io/react-auth";

interface OnboardingLayoutProps {
  children: ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showTokensModal, setShowTokensModal] = useState(false);

  // Handle back button click
  const handleBackClick = () => {
    router.push("/");
  };

  // Handle points click - we're already on the onboarding page
  const handlePointsClick = () => {
    // No-op since we're already on the onboarding page
  };

  return (
    <div className="min-h-screen bg-[#0D0E13]">
      <AppHeader
        showBackButton={true}
        showTitle={false}
        backgroundColor="#0D0E13"
        showGetTokensButton={true}
        showCreateButton={true}
        showPointsButton={true}
        onGetTokensClick={() => setShowTokensModal(true)}
        onInfoClick={() => setShowInfoModal(true)}
        onBackClick={handleBackClick}
        onPointsClick={handlePointsClick}
        isAuthenticated={authenticated}
      />
      <SideNavbar activeTab="party" isAuthenticated={authenticated} />
      <div className="md:pl-64 pb-16 md:pb-0">{children}</div>
      <BottomNavbar activeTab="party" isAuthenticated={authenticated} />

      {/* Modals */}
      {showInfoModal && (
        <InfoModal
          isOpen={showInfoModal}
          onClose={() => setShowInfoModal(false)}
        />
      )}
      {showTokensModal && (
        <GetTokensModal
          isOpen={showTokensModal}
          onClose={() => setShowTokensModal(false)}
          isAuthenticated={authenticated}
        />
      )}
    </div>
  );
}
