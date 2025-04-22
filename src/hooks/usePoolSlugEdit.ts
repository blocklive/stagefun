import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { validateSlug } from "@/lib/utils/slugValidation";
import showToast from "@/utils/toast";
import { useRouter } from "next/navigation";

interface UsePoolSlugEditOptions {
  poolId: string;
  initialSlug: string | null;
  onSuccess?: (newSlug: string) => void;
}

interface UsePoolSlugEditResult {
  slug: string;
  slugError: string | null;
  setSlug: (value: string) => void;
  isSubmitting: boolean;
  handleSubmit: () => Promise<void>;
}

export function usePoolSlugEdit({
  poolId,
  initialSlug,
  onSuccess,
}: UsePoolSlugEditOptions): UsePoolSlugEditResult {
  const [slug, setSlug] = useState(initialSlug || "");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getAccessToken } = usePrivy();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!poolId) {
      showToast.error("Pool ID is required");
      return;
    }

    // Validate slug
    if (slug) {
      const validation = validateSlug(slug);
      if (!validation.isValid) {
        setSlugError(validation.reason || "Invalid slug");
        showToast.error(validation.reason || "Invalid slug format");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      showToast.loading("Updating public URL...");

      const token = await getAccessToken();
      if (!token) {
        showToast.error("Authentication error. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const updates = {
        slug: slug || null,
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
        showToast.error(result.error || "Failed to update public URL");
        setIsSubmitting(false);
        return;
      }

      showToast.remove();
      showToast.success("Public URL updated successfully");

      if (onSuccess) {
        onSuccess(slug);
      } else if (slug) {
        // Default behavior: redirect to the new URL
        router.push(`/${slug}`);
      }
    } catch (error) {
      console.error("Error updating pool slug:", error);
      showToast.remove();
      showToast.error("Failed to update public URL");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle slug change
  const handleSlugChange = (newSlug: string) => {
    setSlug(newSlug);
    // Clear any previous errors when editing
    if (slugError) setSlugError(null);
  };

  return {
    slug,
    slugError,
    setSlug: handleSlugChange,
    isSubmitting,
    handleSubmit,
  };
}
