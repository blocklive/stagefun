import useSWR from "swr";
import { ethers } from "ethers";

export function usePoolTimeLeft(pool: any) {
  const {
    data: timeLeft,
    error,
    isLoading,
  } = useSWR(
    pool ? ["poolEndTime", pool.ends_at] : null,
    () => {
      if (!pool?.ends_at) return null;

      const now = Math.floor(Date.now() / 1000);
      const endTime = Math.floor(new Date(pool.ends_at).getTime() / 1000);
      const timeLeft = endTime - now;
      const hasEnded = timeLeft <= 0;

      const days = Math.floor(timeLeft / (24 * 60 * 60));
      const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
      const seconds = Math.floor(timeLeft % 60);

      return {
        days: Math.max(0, days),
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
        seconds: Math.max(0, seconds),
        hasEnded,
      };
    },
    {
      refreshInterval: 1000, // Update every second
    }
  );

  return {
    days: timeLeft?.days ?? 0,
    hours: timeLeft?.hours ?? 0,
    minutes: timeLeft?.minutes ?? 0,
    seconds: timeLeft?.seconds ?? 0,
    hasEnded: timeLeft?.hasEnded ?? false,
    isLoading: !error && !timeLeft,
  };
}
