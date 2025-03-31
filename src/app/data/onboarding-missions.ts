export interface Mission {
  id: string;
  title: string;
  description: string;
  points: number;
  completed?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
  category?: string;
  component?: string;
}

export const onboardingMissions: Mission[] = [
  {
    id: "link_x",
    title: "Link your X account",
    description: "Connect your X account to Stage.fun",
    points: 1000,
    actionLabel: "Link",
    category: "social",
  },
  {
    id: "follow_x",
    title: "Follow us on X (Twitter)",
    description:
      "Connect with us on Twitter for the latest updates and join our growing community.",
    points: 1000,
    icon: "/images/x-logo.png",
    actionLabel: "Follow",
    category: "social",
    completed: false,
  },
  {
    id: "create_pool",
    title: "Create your first pool",
    description: "Create your first party round",
    points: 5000,
    actionLabel: "Verify Pool",
    category: "pools",
  },
  {
    id: "daily_checkin",
    title: "Daily Check-in",
    description: "Check in daily to earn points and build your streak",
    points: 100,
    actionUrl: "/pools",
    actionLabel: "Check In",
  },
];

// Note: Daily check-ins are managed separately from other missions in the database
// This ensures better performance tracking for streak counts and next available times
// Daily check-ins use the daily_checkins table which includes streak_count and next_available_at
// While one-time missions use the user_completed_missions table

export default onboardingMissions;
