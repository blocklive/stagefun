"use client";

import React from "react";
import MyPoints from "@/app/components/MyPoints";
import MyLevel from "@/app/components/MyLevel";
import PointsBonus from "@/app/components/PointsBonus";
import MissionsCompleted from "@/app/components/MissionsCompleted";
import NFTPartnerList from "@/app/components/NFTPartnerList";
import ReferralSection from "./ReferralSection";

export default function RewardsTab() {
  return (
    <div className="space-y-6">
      {/* Points and Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MyPoints />
        <MyLevel />
        <PointsBonus />
        <MissionsCompleted />
      </div>

      {/* NFT Partner List */}
      <NFTPartnerList />

      {/* Referral Section */}
      <ReferralSection />
    </div>
  );
}
