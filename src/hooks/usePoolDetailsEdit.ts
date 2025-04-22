import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { SocialLinksType } from "@/app/components/SocialLinksInput";
import showToast from "@/utils/toast";

interface PoolDetailsData {
  description: string;
  location: string;
  socialLinks: SocialLinksType;
}

interface UsePoolDetailsEditOptions {
  poolId: string;
  initialDescription: string;
  initialLocation: string;
  initialSocialLinks: SocialLinksType;
  onSuccess?: () => void;
}

interface UsePoolDetailsEditResult {
  description: string;
  setDescription: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  socialLinks: SocialLinksType;
  setSocialLinks: (value: SocialLinksType) => void;
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;
}

export function usePoolDetailsEdit({
  poolId,
  initialDescription,
  initialLocation,
  initialSocialLinks,
  onSuccess,
}: UsePoolDetailsEditOptions): UsePoolDetailsEditResult {
  const [description, setDescription] = useState(initialDescription || "");
  const [location, setLocation] = useState(initialLocation || "");
  const [socialLinks, setSocialLinks] = useState<SocialLinksType>(
    initialSocialLinks || {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getAccessToken } = usePrivy();

  const handleSubmit = async () => {
    if (!poolId) {
      showToast.error("Pool ID is required");
      return;
    }

    try {
      setIsSubmitting(true);
      showToast.loading("Updating pool details...");

      const token = await getAccessToken();
      if (!token) {
        showToast.error("Authentication error. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const updates = {
        description,
        location,
        social_links:
          Object.keys(socialLinks).length > 0
            ? JSON.parse(JSON.stringify(socialLinks))
            : null,
      };

      const response = await fetch("/api/pools/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          poolId,
          updates,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        showToast.remove();
        showToast.error(result.error || "Failed to update pool details");
        setIsSubmitting(false);
        return;
      }

      showToast.remove();
      showToast.success("Pool details updated successfully");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating pool details:", error);
      showToast.remove();
      showToast.error("Failed to update pool details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    description,
    setDescription,
    location,
    setLocation,
    socialLinks,
    setSocialLinks,
    isSubmitting,
    handleSubmit,
  };
}
