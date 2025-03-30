// Points system constants and utility functions

// Constants
export const DAILY_CHECKIN_POINTS = 1000;
export const DAILY_CHECKIN_ACTION = "daily_checkin";
export const MIN_CHECKIN_INTERVAL_HOURS = 24;

/**
 * Format the time remaining until next claim
 */
export function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return "Available now";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
