// Points system constants and utility functions

// Constants
export const DAILY_CHECKIN_POINTS = 100;
export const DAILY_CHECKIN_ACTION = "daily_checkin";
export const MIN_CHECKIN_INTERVAL_HOURS = 24;

/**
 * Format the time remaining until next claim
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) {
    return "Available now";
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export const checkRecentMissionCompletions = async (
  supabase: any,
  userId: string
): Promise<{ missionId: string; points: number } | null> => {
  try {
    // Get the most recent mission completion within the last minute
    const { data, error } = await supabase
      .from("user_completed_missions")
      .select("mission_id, completed_at")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error checking recent mission completions:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const mostRecentCompletion = data[0];
    const completionTime = new Date(mostRecentCompletion.completed_at);
    const now = new Date();

    // Only check missions completed in the last minute
    if (now.getTime() - completionTime.getTime() <= 60000) {
      // Map mission IDs to point values
      const missionPoints: Record<string, number> = {
        link_x: 10000,
        follow_x: 10000,
        create_pool: 50000,
      };

      const points = missionPoints[mostRecentCompletion.mission_id] || 0;

      if (points > 0) {
        return {
          missionId: mostRecentCompletion.mission_id,
          points,
        };
      }
    }

    return null;
  } catch (err) {
    console.error("Error in checkRecentMissionCompletions:", err);
    return null;
  }
};
