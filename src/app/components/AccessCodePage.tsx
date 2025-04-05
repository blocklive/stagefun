"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { tickers } from "@/data/tickers";
import AppHeader from "@/app/components/AppHeader";
import InfoModal from "@/app/components/InfoModal";
import AccessCodeEntry from "@/app/components/AccessCodeEntry";

export default function AccessCodePage() {
  const router = useRouter();
  const { authenticated, ready } = usePrivy();
  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // Check if user is authenticated and redirect to pools
  useEffect(() => {
    if (ready && authenticated) {
      console.log("User is authenticated, redirecting to pools page");
      router.push("/pools");
    }
  }, [ready, authenticated, router]);

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
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

  return (
    <div
      className="flex flex-col bg-black text-white relative"
      style={{ height: viewportHeight }}
    >
      {/* Main content area with scrolling */}
      <div className="flex-1 overflow-y-auto">
        {/* Use the AppHeader component */}
        <AppHeader
          title=""
          showBackButton={false}
          showPointsButton={false}
          showCreateButton={false}
          showGetTokensButton={false}
          showInfoButton={false}
          backgroundColor="black"
          onInfoClick={handleInfoClick}
        />

        {/* Access Code Entry Component */}
        <AccessCodeEntry />
      </div>

      {/* Info Modal */}
      <InfoModal isOpen={isInfoModalOpen} onClose={handleCloseInfoModal} />
    </div>
  );
}
