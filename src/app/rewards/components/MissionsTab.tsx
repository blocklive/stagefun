"use client";

import React from "react";
import useOnboardingMissions from "@/hooks/useOnboardingMissions";
import OnboardingProgress from "./OnboardingProgress";
import MissionItem from "./MissionItem";
import { Mission } from "../../data/onboarding-missions";
import { useRouter } from "next/navigation";
import { usePoints } from "@/hooks/usePoints";
import showToast from "@/utils/toast";
import { FaCheck } from "react-icons/fa";
import { colors } from "@/lib/theme";

interface MissionsTabProps {
  onMissionAction: (mission: Mission) => Promise<void>;
}

interface MissionCategory {
  title: string;
  missions: Mission[];
  completedCount: number;
  totalCount: number;
  percentage: number;
}

export default function MissionsTab({ onMissionAction }: MissionsTabProps) {
  const {
    missions,
    isLoading,
    completedCount,
    totalCount,
    completionPercentage,
  } = useOnboardingMissions();

  // Calculate completion status excluding daily check-in
  const onboardingMissions = !isLoading
    ? missions.filter((m) => m.id !== "daily_checkin")
    : [];

  // Split missions into categories
  const accountSetupIds = ["link_x", "follow_x", "create_pool"];
  const tradingMissionIds = [
    "swap_mon_usdc",
    "swap_shmon",
    "swap_aprmon",
    "swap_gmon",
    "swap_jerry",
    "add_liquidity",
  ];

  const accountSetupMissions = onboardingMissions.filter((m) =>
    accountSetupIds.includes(m.id)
  );
  const tradingMissions = onboardingMissions.filter((m) =>
    tradingMissionIds.includes(m.id)
  );

  // Calculate progress for each category
  const getCategoryProgress = (
    missions: Mission[]
  ): { completed: number; total: number; percentage: number } => {
    const completed = missions.filter((m) => m.completed).length;
    const total = missions.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const accountSetupProgress = getCategoryProgress(accountSetupMissions);
  const tradingProgress = getCategoryProgress(tradingMissions);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Account Setup Skeleton */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold mb-2 text-transparent bg-gray-800 rounded animate-pulse w-48 h-6"></h3>
            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <div className="text-transparent bg-gray-800 w-32 h-5 rounded animate-pulse"></div>
              <div className="text-transparent bg-gray-800 w-16 h-5 rounded animate-pulse"></div>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-700 rounded-full animate-pulse"
                style={{ width: "0%" }}
              ></div>
            </div>
          </div>
          <div className="bg-[#FFFFFF0A] rounded-xl overflow-hidden border border-[#FFFFFF14]">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border-b border-[#FFFFFF14] last:border-b-0"
              >
                <div className="flex items-center">
                  <div className="mr-4 w-6 h-6 rounded-full border-2 border-dashed border-gray-700 animate-pulse"></div>
                  <div>
                    <h3 className="text-lg w-32 h-6 bg-gray-800 rounded animate-pulse mb-2"></h3>
                    <p className="text-sm w-48 h-4 bg-gray-800 rounded animate-pulse"></p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="w-20 h-5 bg-gray-800 rounded animate-pulse"></div>
                  <div className="w-24 h-8 bg-gray-800 rounded-full animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trading Missions Skeleton */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold mb-2 text-transparent bg-gray-800 rounded animate-pulse w-48 h-6"></h3>
            <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
              <div className="text-transparent bg-gray-800 w-32 h-5 rounded animate-pulse"></div>
              <div className="text-transparent bg-gray-800 w-16 h-5 rounded animate-pulse"></div>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-700 rounded-full animate-pulse"
                style={{ width: "0%" }}
              ></div>
            </div>
          </div>
          <div className="bg-[#FFFFFF0A] rounded-xl overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border-b border-[#FFFFFF14] last:border-b-0"
              >
                <div className="flex items-center">
                  <div className="mr-4 w-6 h-6 rounded-full border-2 border-dashed border-gray-700 animate-pulse"></div>
                  <div>
                    <h3 className="text-lg w-32 h-6 bg-gray-800 rounded animate-pulse mb-2"></h3>
                    <p className="text-sm w-48 h-4 bg-gray-800 rounded animate-pulse"></p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="w-20 h-5 bg-gray-800 rounded animate-pulse"></div>
                  <div className="w-24 h-8 bg-gray-800 rounded-full animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Account Setup Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold mb-2">Account Setup</h3>
          <div className="flex justify-between items-center text-sm text-gray-400 mb-2">
            <span>
              {accountSetupProgress.completed} of {accountSetupProgress.total}{" "}
              completed
            </span>
            <span>{accountSetupProgress.percentage}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${accountSetupProgress.percentage}%`,
                backgroundColor: colors.purple.DEFAULT,
              }}
            ></div>
          </div>
        </div>

        <div className="bg-[#FFFFFF0A] rounded-xl overflow-hidden border border-[#FFFFFF14]">
          {accountSetupMissions.map((mission) => (
            <MissionItem
              key={mission.id}
              mission={mission}
              onAction={onMissionAction}
            />
          ))}
        </div>

        {/* Account Setup completion message */}
        {accountSetupProgress.completed === accountSetupProgress.total &&
          accountSetupProgress.total > 0 && (
            <div className="text-center p-3 bg-[#FFFFFF0A] border border-[#FFFFFF14] rounded-xl">
              <h4 className="text-lg font-bold mb-1 flex items-center justify-center gap-2">
                <FaCheck color={colors.purple.DEFAULT} size={16} />
                <span style={{ color: colors.purple.DEFAULT }}>
                  Account Setup Complete!
                </span>
              </h4>
              <p className="text-sm text-gray-400">
                Your account is fully set up. Ready for trading!
              </p>
            </div>
          )}
      </div>

      {/* Trading Missions Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold mb-2">Trading missions</h3>
          <div className="flex justify-between items-center text-sm text-gray-400 mb-2">
            <span>
              {tradingProgress.completed} of {tradingProgress.total} completed
            </span>
            <span>{tradingProgress.percentage}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${tradingProgress.percentage}%`,
                backgroundColor: colors.purple.DEFAULT,
              }}
            ></div>
          </div>
        </div>

        <div className="bg-[#FFFFFF0A] rounded-xl overflow-hidden">
          {tradingMissions.map((mission) => (
            <MissionItem
              key={mission.id}
              mission={mission}
              onAction={onMissionAction}
            />
          ))}
        </div>

        {/* Trading missions completion message */}
        {tradingProgress.completed === tradingProgress.total &&
          tradingProgress.total > 0 && (
            <div className="text-center p-3 bg-[#FFFFFF0A] border border-[#FFFFFF14] rounded-xl">
              <h4 className="text-lg font-bold mb-1 flex items-center justify-center gap-2">
                <FaCheck color={colors.purple.DEFAULT} size={16} />
                <span style={{ color: colors.purple.DEFAULT }}>
                  Trading Master!
                </span>
              </h4>
              <p className="text-sm text-gray-400">
                You've completed all trading missions. You're a pro trader now!
              </p>
            </div>
          )}
      </div>

      {/* Overall completion message - spans both columns */}
      {accountSetupProgress.completed === accountSetupProgress.total &&
        tradingProgress.completed === tradingProgress.total &&
        (accountSetupProgress.total > 0 || tradingProgress.total > 0) && (
          <div className="lg:col-span-2 text-center p-4 bg-[#FFFFFF0A] border border-[#FFFFFF14] rounded-xl">
            <h3 className="text-xl font-bold mb-2 flex items-center justify-center gap-2">
              <FaCheck color={colors.purple.DEFAULT} size={20} />
              <span style={{ color: colors.purple.DEFAULT }}>
                All missions completed!
              </span>
            </h3>
            <p className="text-gray-400">
              Congratulations! You've mastered Stage.fun. Continue exploring the
              platform!
            </p>
          </div>
        )}
    </div>
  );
}
