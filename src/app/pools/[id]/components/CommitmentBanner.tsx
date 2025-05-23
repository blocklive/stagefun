import React, { useEffect, useState, useRef } from "react";
import { Pool, Tier } from "@/lib/types";
import { formatAmount } from "@/lib/utils";
import { fromUSDCBaseUnits } from "@/lib/contracts/StageDotFunPool";
import confetti from "canvas-confetti";

interface CommitmentBannerProps {
  pool: Pool;
  userCommitments: {
    tier: Tier;
    amount: string;
  }[];
  showShake?: boolean;
}

export default function CommitmentBanner({
  pool,
  userCommitments,
  showShake = false,
}: CommitmentBannerProps) {
  const [isShaking, setIsShaking] = useState(false);
  const [isPulsating, setIsPulsating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to handle initial shake and timer setup
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If showShake is true, start shaking
    if (showShake) {
      setIsShaking(true);
      setIsPulsating(true);

      // Set timer for auto-stop after 15 seconds
      timerRef.current = setTimeout(() => {
        setIsShaking(false);
        setIsPulsating(false);
        triggerFireworks();
      }, 15000);
    }

    // Cleanup function to clear timer when component unmounts or showShake changes
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [showShake]); // Only depend on showShake

  const handleClick = () => {
    // Only handle click if banner is shaking
    if (!isShaking) return;

    // Clear the timer to prevent fireworks from happening again
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Stop animations and trigger fireworks
    setIsShaking(false);
    setIsPulsating(false);
    triggerFireworks();
  };

  const triggerFireworks = () => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "1000";
    document.body.appendChild(canvas);

    const myConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: false,
    });

    const count = 5;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 1000,
      shapes: ["star", "circle"],
      colors: ["#836EF9", "#6F5BD0", "#FFD700", "#FFA500"],
      disableForReducedMotion: true,
    };

    const fire = (particleRatio: number, opts: any) => {
      myConfetti({
        ...defaults,
        particleCount: Math.floor(200 * particleRatio),
        origin: { x: Math.random(), y: Math.random() },
        ...opts,
      });
    };

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        fire(0.25, {
          spread: 26,
          startVelocity: 55,
        });

        fire(0.2, {
          spread: 60,
        });

        fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          scalar: 1.2,
        });

        fire(0.1, {
          spread: 120,
          startVelocity: 45,
        });
      }, i * 150);
    }

    setTimeout(() => {
      document.body.removeChild(canvas);
    }, 5000);
  };

  const totalAmount = userCommitments.reduce(
    (sum, commitment) => sum + parseFloat(commitment.amount),
    0
  );

  const displayAmount = formatAmount(fromUSDCBaseUnits(BigInt(totalAmount)));
  const tierNames = userCommitments.map((c) => c.tier.name).join(", ");

  return (
    <div
      onClick={handleClick}
      className={`relative w-full bg-gradient-to-r from-[#836EF9] to-[#6F5BD0] text-white ${
        isShaking ? "cursor-pointer" : ""
      } ${isPulsating ? "animate-subtle-pulse" : ""}`}
      style={{
        animation: isShaking ? "shake 0.6s ease-in-out infinite" : "",
        opacity: isPulsating ? "0.95" : "1",
        transition: "opacity 2s ease-in-out",
        position: "relative",
        zIndex: 10,
        isolation: "isolate",
        transformOrigin: "center",
        willChange: isShaking ? "transform" : "auto",
      }}
    >
      <div className="container mx-auto px-4 py-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">You're In!</h2>
          <p className="text-white/90">
            {displayAmount} USDC{" "}
            <span className="text-white/60">{tierNames}</span>
          </p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
    </div>
  );
}
