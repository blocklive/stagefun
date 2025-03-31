"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import SideNavbar from "@/app/components/SideNavbar";
import BottomNavbar from "@/app/components/BottomNavbar";

interface OnboardingLayoutProps {
  children: ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0D0E13]">
      <SideNavbar activeTab="party" />
      <div className="md:pl-64 pb-16 md:pb-0">{children}</div>
      <BottomNavbar activeTab="party" />
    </div>
  );
}
