"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import LeaderboardSkeleton from "@/app/leaderboard/components/LeaderboardSkeleton";

// Dynamically import the LeaderboardContent component to prevent hydration issues
const LeaderboardContent = dynamic(
  () => import("@/app/leaderboard/components/LeaderboardContent"),
  { ssr: false }
);

export default function LeaderboardTab() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-400 mb-6">
          Top users by points earned and funding activity
        </p>
      </div>

      <Suspense fallback={<LeaderboardSkeleton />}>
        <LeaderboardContent />
      </Suspense>
    </div>
  );
}
