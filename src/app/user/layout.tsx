"use client";

import { useRouter } from "next/navigation";
import SideNavbar from "../components/SideNavbar";
import BottomNavbar from "../components/BottomNavbar";
import { usePrivy } from "@privy-io/react-auth";

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  const { authenticated } = usePrivy();

  return (
    <div className="min-h-screen bg-[#15161a] text-white">
      <SideNavbar activeTab="portfolio" isAuthenticated={authenticated} />
      <div className="md:pl-64">{children}</div>
      <BottomNavbar activeTab="portfolio" isAuthenticated={authenticated} />
    </div>
  );
}
