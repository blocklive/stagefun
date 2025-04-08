"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import SideNavbar from "@/app/components/SideNavbar";
import BottomNavbar from "@/app/components/BottomNavbar";
import { usePrivy } from "@privy-io/react-auth";

interface OnboardingLayoutProps {
  children: ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const router = useRouter();
  const { authenticated } = usePrivy();

  return (
    <div className="min-h-screen bg-[#0D0E13]">
      <SideNavbar activeTab="party" isAuthenticated={authenticated} />
      <div className="md:pl-64 pb-16 md:pb-0">{children}</div>
      <BottomNavbar activeTab="party" isAuthenticated={authenticated} />
    </div>
  );
}
