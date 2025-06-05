import { useState, useEffect } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import { getAuthHeaders } from "@/lib/auth/client";
import showToast from "@/utils/toast";

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

            // Parse response to check if it was refreshed
            try {
              const successData = JSON.parse(responseData);
              if (successData.message === "Referral link refreshed") {
                showToast.success(`Referral link refreshed for ${ref}!`, {
                  duration: 4000,
                });
              } else {
                showToast.success(`Referral link activated for ${ref}!`, {
                  duration: 4000,
                });
              }
            } catch (e) {
              // Default success message if parsing fails
              showToast.success(`Referral link activated for ${ref}!`, {
                duration: 4000,
              });
            }
          } else {
            console.warn("❌ Failed to store referral:", responseData);

            // Parse the error message
            let errorMessage = "Failed to activate referral link";
            try {
              const errorData = JSON.parse(responseData);
              if (errorData.error === "Referrer not found") {
                errorMessage = `Referrer "${ref}" not found. Make sure they have connected their Twitter account.`;
              } else if (errorData.error === "Cannot refer yourself") {
                errorMessage = "You cannot use your own referral link!";
              } else {
                errorMessage = errorData.error || errorMessage;
              }
            } catch (e) {
              // Use default message if parsing fails
            }

            showToast.error(errorMessage, {
              duration: 5000,
            });
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
