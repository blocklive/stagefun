export interface Mission {
  id: string;
  title: string;
  description: string;
  points: number;
  completed?: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export const onboardingMissions: Mission[] = [
  {
    id: "link_x",
    title: "Link your X account",
    description: "Connect your X account to Stage.fun",
    points: 10000,
    actionUrl: "/profile",
    actionLabel: "Link Account",
  },
  {
    id: "follow_x",
    title: "Follow Stage.fun on X",
    description: "Follow @stagedotfun on X",
    points: 10000,
    actionUrl: "https://x.com/stagedotfun",
    actionLabel: "Follow",
  },
  {
    id: "create_pool",
    title: "Create your first pool",
    description: "Create your first party round",
    points: 50000,
    actionUrl: "/pools/create",
    actionLabel: "Create Pool",
  },
  {
    id: "daily_checkin",
    title: "Daily Check-in",
    description: "Check in daily to earn points and build your streak",
    points: 1000,
    actionUrl: "/pools",
    actionLabel: "Check In",
  },
];

// Note: Daily check-ins are managed separately from other missions in the database
// This ensures better performance tracking for streak counts and next available times
// Daily check-ins use the daily_checkins table which includes streak_count and next_available_at
// While one-time missions use the user_completed_missions table

export default onboardingMissions;
