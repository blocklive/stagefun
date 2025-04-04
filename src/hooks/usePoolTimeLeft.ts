import { useState, useEffect } from "react";

export function usePoolTimeLeft(pool: any) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    hasEnded: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!pool?.ends_at) {
      setIsLoading(false);
      return;
    }

    // Function to calculate time left
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);

      // Convert ends_at to timestamp
      const endsAtDate = new Date(pool.ends_at);
      const endTime = Math.floor(endsAtDate.getTime() / 1000);

      const diff = endTime - now;
      const hasEnded = diff <= 0;

      const days = Math.floor(diff / (24 * 60 * 60));
      const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((diff % (60 * 60)) / 60);
      const seconds = Math.floor(diff % 60);

      setTimeLeft({
        days: Math.max(0, days),
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
  }, [pool?.ends_at]);

  return {
    days: timeLeft.days,
    hours: timeLeft.hours,
    minutes: timeLeft.minutes,
    seconds: timeLeft.seconds,
    hasEnded: timeLeft.hasEnded,
    isLoading,
  };
}
