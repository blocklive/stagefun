import { useState, useEffect } from "react";

export function usePoolTimeLeft(pool: any) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    hasEnded: false,
    rawDays: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for either ends_at (database field) or end_date (contract field)
    const endDate = pool?.ends_at || pool?.end_date;

    if (!endDate) {
      console.log("No end date found for pool:", pool?.id);
      setIsLoading(false);
      return;
    }

    // Function to calculate time left
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);

      // Parse the end date - handle both string (Date) and number (timestamp) formats
      let endTime: number;
      if (typeof endDate === "string") {
        // Convert date string to timestamp
        const endsAtDate = new Date(endDate);
        endTime = Math.floor(endsAtDate.getTime() / 1000);
      } else if (typeof endDate === "number" || typeof endDate === "bigint") {
        // Already a timestamp (seconds)
        endTime = Number(endDate);
      } else {
        console.error("Invalid end date format:", endDate);
        endTime = now; // Default to now (show as ended)
      }

      const diff = endTime - now;
      const hasEnded = diff <= 0;

      const rawDays = Math.floor(diff / (24 * 60 * 60));
      const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((diff % (60 * 60)) / 60);
      const seconds = Math.floor(diff % 60);

      setTimeLeft({
        rawDays,
        days: Math.max(0, rawDays),
        hours: Math.max(0, hours),
        minutes: Math.max(0, minutes),
        seconds: Math.max(0, seconds),
        hasEnded,
      });
      setIsLoading(false);
    };

    // Calculate immediately
    calculateTimeLeft();

    // Set up interval to update every second
    const intervalId = setInterval(calculateTimeLeft, 1000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [pool?.ends_at, pool?.end_date, pool?.id]);

  return {
    days: timeLeft.days,
    hours: timeLeft.hours,
    minutes: timeLeft.minutes,
    seconds: timeLeft.seconds,
    hasEnded: timeLeft.hasEnded,
    rawDays: timeLeft.rawDays,
    isLoading,
  };
}
