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
    id: "swap_mon_usdc",
    title: "Swap MON to USDC",
    description: "Swap MON to USDC",
    points: 1000,
    actionUrl: "/swap",
    actionLabel: "Swap",
    category: "swap",
  },
  {
    id: "swap_shmon",
    title: "Swap shMON",
    description: "Swap shMON",
    points: 1000,
    actionUrl: "/swap",
    actionLabel: "Swap",
    category: "swap",
  },
  {
    id: "swap_aprmon",
    title: "Swap aprMON",
    description: "Swap aprMON",
    points: 1000,
    actionUrl: "/swap",
    actionLabel: "Swap",
    category: "swap",
  },
  {
    id: "swap_gmon",
    title: "Swap gMON",
    description: "Swap gMON",
    points: 1000,
    actionUrl: "/swap",
    actionLabel: "Swap",
    category: "swap",
  },
  {
    id: "swap_jerry",
    title: "Swap JERRY",
    description: "Swap JERRY",
    points: 1000,
    actionUrl: "/swap",
    actionLabel: "Swap",
    category: "swap",
  },
  {
    id: "add_liquidity",
    title: "Add liquidity to any pool",
    description: "Add liquidity to any pool",
    points: 2000,
    actionUrl: "/swap/liquidity",
    actionLabel: "Add Liquidity",
    category: "swap",
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
