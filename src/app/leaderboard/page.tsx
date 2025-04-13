"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import the LeaderboardContent component to prevent hydration issues
const LeaderboardContent = dynamic(
  () => import("./components/LeaderboardContent"),
  { ssr: false }
);

export default function LeaderboardPage() {
  return (
    <div className="container mx-auto px-4 py-2">
      <p className="text-gray-400 mb-6">
        Top users by points earned and funding activity
      </p>

      <Suspense fallback={<div>Loading leaderboard...</div>}>
        <LeaderboardContent />
      </Suspense>
    </div>
  );
}
