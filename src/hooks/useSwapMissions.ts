import { useCallback } from "react";
import { useAuthJwt } from "./useAuthJwt";
import showToast from "@/utils/toast";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";
import { onboardingMissions } from "@/app/data/onboarding-missions";
import confetti from "canvas-confetti";

interface UseSwapMissionsProps {
  showSuccessToast?: boolean;
}

/**
 * Hook to handle verification of swap and liquidity-related missions
 */
export function useSwapMissions({
  showSuccessToast = true,
}: UseSwapMissionsProps = {}) {
  const { token: authToken } = useAuthJwt();

  /**
   * Gets a user-friendly mission title from the mission ID
   */
  const getMissionTitle = useCallback((missionId: string): string => {
    const mission = onboardingMissions.find((m) => m.id === missionId);
    return mission?.title || missionId.replace(/_/g, " ");
  }, []);

  /**
   * Triggers a confetti celebration effect
   */
  const triggerConfetti = useCallback(() => {
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

    const count = 3; // Slightly less than pool commitment
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
      }, i * 150);
    }

    setTimeout(() => {
      document.body.removeChild(canvas);
    }, 3000); // Shorter cleanup time
  }, []);

  /**
   * Verifies a swap mission with the server using the transaction hash
   */
  const verifySwapMission = useCallback(
    async (missionId: string, txHash: string): Promise<boolean> => {
      try {
        if (!authToken) {
          console.error("No auth token available to verify swap mission");
          return false;
        }

        // Call the verify-swap API
        const response = await fetch("/api/missions/verify-swap", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            missionId,
            txHash,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success && !data.alreadyCompleted) {
          // Successfully verified and awarded points
          if (showSuccessToast) {
            showToast.remove();
            const missionTitle = getMissionTitle(missionId);
            showToast.success(
              `${missionTitle} mission completed! +${data.points} points`
            );

            // Launch confetti celebration
            triggerConfetti();
          }

          // Trigger points refresh
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("refreshPoints"));
          }
          return true;
        } else if (response.ok && data.alreadyCompleted) {
          console.log(`Mission ${missionId} already completed`);
          return true;
        } else {
          console.error(
            `Failed to verify ${missionId} mission:`,
            data.error || "Unknown error"
          );
          return false;
        }
      } catch (error) {
        console.error(`Error verifying ${missionId} mission:`, error);
        return false;
      }
    },
    [authToken, showSuccessToast, getMissionTitle, triggerConfetti]
  );

  /**
   * Verifies a swap based on the input and output tokens
   */
  const verifySwapByTokens = useCallback(
    async (
      inputTokenAddress: string,
      outputTokenAddress: string,
      txHash: string
    ): Promise<boolean> => {
      if (!txHash) {
        console.error("No transaction hash provided for mission verification");
        return false;
      }

      // Ensure addresses are valid
      if (!inputTokenAddress || !outputTokenAddress) {
        console.error("Invalid token addresses for mission verification");
        return false;
      }

      // Normalize addresses for comparison
      const normalizeAddress = (address: string) =>
        address === "NATIVE" ? address : address.toLowerCase();

      const normalizedInputAddress = normalizeAddress(inputTokenAddress);
      const normalizedOutputAddress = normalizeAddress(outputTokenAddress);

      // Get required token addresses
      const usdcAddress = CONTRACT_ADDRESSES.monadTestnet.usdc.toLowerCase();
      const nativeSymbol = "NATIVE";
      const wmonAddress =
        CONTRACT_ADDRESSES.monadTestnet.officialWmon.toLowerCase();
      const shmonAddress = CONTRACT_ADDRESSES.monadTestnet.shmon.toLowerCase();
      const aprmonAddress =
        CONTRACT_ADDRESSES.monadTestnet.aprmon.toLowerCase();
      const gmonAddress = CONTRACT_ADDRESSES.monadTestnet.gmon.toLowerCase();
      const jerryAddress = CONTRACT_ADDRESSES.monadTestnet.jerry.toLowerCase();

      // Track mission verification
      let verifiedAnyMission = false;

      // Check for MON to USDC swap (including WMON)
      if (
        ((normalizedInputAddress === wmonAddress ||
          normalizedInputAddress === nativeSymbol) &&
          normalizedOutputAddress === usdcAddress) ||
        ((normalizedOutputAddress === wmonAddress ||
          normalizedOutputAddress === nativeSymbol) &&
          normalizedInputAddress === usdcAddress)
      ) {
        console.log("Detected MON/USDC swap, verifying mission...");
        const result = await verifySwapMission("swap_mon_usdc", txHash);
        verifiedAnyMission = verifiedAnyMission || result;
      }

      // Check for shMON swap
      if (
        normalizedInputAddress === shmonAddress ||
        normalizedOutputAddress === shmonAddress
      ) {
        console.log("Detected shMON swap, verifying mission...");
        const result = await verifySwapMission("swap_shmon", txHash);
        verifiedAnyMission = verifiedAnyMission || result;
      }

      // Check for aprMON swap
      if (
        normalizedInputAddress === aprmonAddress ||
        normalizedOutputAddress === aprmonAddress
      ) {
        console.log("Detected aprMON swap, verifying mission...");
        const result = await verifySwapMission("swap_aprmon", txHash);
        verifiedAnyMission = verifiedAnyMission || result;
      }

      // Check for gMON swap
      if (
        normalizedInputAddress === gmonAddress ||
        normalizedOutputAddress === gmonAddress
      ) {
        console.log("Detected gMON swap, verifying mission...");
        const result = await verifySwapMission("swap_gmon", txHash);
        verifiedAnyMission = verifiedAnyMission || result;
      }

      // Check for JERRY swap
      if (
        normalizedInputAddress === jerryAddress ||
        normalizedOutputAddress === jerryAddress
      ) {
        console.log("Detected JERRY swap, verifying mission...");
        const result = await verifySwapMission("swap_jerry", txHash);
        verifiedAnyMission = verifiedAnyMission || result;
      }

      return verifiedAnyMission;
    },
    [verifySwapMission]
  );

  /**
   * Verifies an add liquidity operation
   */
  const verifyAddLiquidity = useCallback(
    async (txHash: string): Promise<boolean> => {
      if (!txHash) {
        console.error(
          "No transaction hash provided for liquidity verification"
        );
        return false;
      }

      console.log("Verifying add_liquidity mission...");
      return await verifySwapMission("add_liquidity", txHash);
    },
    [verifySwapMission]
  );

  return {
    verifySwapMission,
    verifySwapByTokens,
    verifyAddLiquidity,
  };
}
