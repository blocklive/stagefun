"use client";

import AppHeader from "../components/AppHeader";
import SideNavbar from "../components/SideNavbar";
import BottomNavbar from "../components/BottomNavbar";

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppHeader title="LEADERBOARD" />
      <SideNavbar activeTab="leaderboard" />
      <main className="md:ml-64 pt-16 pb-16 min-h-screen">{children}</main>
      <BottomNavbar activeTab="leaderboard" />
    </div>
  );
}
