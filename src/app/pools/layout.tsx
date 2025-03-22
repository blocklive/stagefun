"use client";

import { useRouter } from "next/navigation";
import SideNavbar from "../components/SideNavbar";
import BottomNavbar from "../components/BottomNavbar";

interface PoolsLayoutProps {
  children: React.ReactNode;
}

export default function PoolsLayout({ children }: PoolsLayoutProps) {
  const router = useRouter();

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
      <SideNavbar activeTab="party" />
      <div className="md:pl-64">{children}</div>
      <BottomNavbar activeTab="party" />
    </div>
  );
}
