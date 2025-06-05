import { useState, useEffect } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import { getAuthHeaders } from "@/lib/auth/client";

export interface ReferralData {
  referrerTwitterUsername: string | null;
  hasReferral: boolean;
}

export function useReferralTracking(): ReferralData {
  const searchParams = useSearchParams();
  const params = useParams();
  const { dbUser } = useSupabase();
  const [referralData, setReferralData] = useState<ReferralData>({
    referrerTwitterUsername: null,
    hasReferral: false,
  });

  useEffect(() => {
    const ref = searchParams.get("ref");
    const poolId = params.id as string; // Get pool ID from URL params
    const slug = params.slug as string; // Alternative: might be slug instead
    const actualPoolId = poolId || slug; // Use whichever exists

    console.log("🔍 Referral tracking debug:", {
      ref,
      poolId,
      slug,
      actualPoolId,
      allParams: params,
      userId: dbUser?.id,
      hasAllData: !!(ref && actualPoolId && dbUser?.id),
    });

    if (ref && actualPoolId && dbUser?.id) {
      // Store the referral info
      setReferralData({
        referrerTwitterUsername: ref,
        hasReferral: true,
      });

      console.log("📨 Calling referral API with:", {
        referrerTwitterUsername: ref,
        poolId: actualPoolId,
        userId: dbUser.id,
      });

      // Call the backend API to store this referral
      const storeReferral = async () => {
        try {
          const headers = await getAuthHeaders();
          const response = await fetch("/api/referrals", {
            method: "POST",
            headers,
            body: JSON.stringify({
              referrerTwitterUsername: ref,
              poolId: actualPoolId,
            }),
          });

          console.log("📨 Referral API response status:", response.status);
          const responseData = await response.text();
          console.log("📨 Referral API response data:", responseData);

          if (response.ok) {
            console.log("✅ Referral stored successfully");
          } else {
            console.warn("❌ Failed to store referral:", responseData);
          }
        } catch (error) {
          console.error("💥 Error storing referral:", error);
        }
      };

      storeReferral();
    } else {
      console.log("⏭️ Skipping referral storage - missing required data");
    }
  }, [searchParams, params, dbUser?.id]);

  return referralData;
}

// Helper function to get current referral data (deprecated - now handled by backend)
export function getCurrentReferralData(): ReferralData {
  return {
    referrerTwitterUsername: null,
    hasReferral: false,
  };
}

// Helper function to clear referral data (deprecated - now handled by backend)
export function clearReferralData(): void {
  // No-op - referrals are now managed by backend
}
