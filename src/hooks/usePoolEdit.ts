import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import showToast from "@/utils/toast";
import { validateSlug } from "@/lib/utils/slugValidation";

// Types of updates that can be made to a pool
export interface PoolUpdateFields {
  name?: string;
  description?: string;
  location?: string;
  image_url?: string | null;
  slug?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  discord?: string | null;
  website?: string | null;
  [key: string]: any; // Allow any other fields
}

export interface UsePoolEditOptions {
  poolId: string;
  onSuccess?: (updatedFields: PoolUpdateFields) => void;
}

export interface UsePoolEditResult {
  updatePool: (updates: PoolUpdateFields, message?: string) => Promise<boolean>;
  isUpdating: boolean;
  error: string | null;
  validateSlugField: (slug: string) => { isValid: boolean; reason?: string };
}

export function usePoolEdit({
  poolId,
  onSuccess,
}: UsePoolEditOptions): UsePoolEditResult {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = usePrivy();

  /**
   * Update pool with the specified fields
   * @param updates Fields to update
   * @param message Custom toast message (default: "Updating...")
   * @returns True if update was successful
   */
  const updatePool = async (
    updates: PoolUpdateFields,
    message = "Updating..."
  ): Promise<boolean> => {
    if (!poolId) {
      showToast.error("Pool ID is required");
      return false;
    }

    // Validate slug if it's being updated
    if (updates.slug !== undefined) {
      if (updates.slug) {
        const validation = validateSlug(updates.slug);
        if (!validation.isValid) {
          setError(validation.reason || "Invalid slug format");
          showToast.error(validation.reason || "Invalid slug format");
          return false;
        }
      }
    }

    try {
      setIsUpdating(true);
      setError(null);
      showToast.loading(message);

      const token = await getAccessToken();
      if (!token) {
        const errorMsg = "Authentication error. Please try again.";
        setError(errorMsg);
        showToast.remove();
        showToast.error(errorMsg);
        return false;
      }

      // Process updates
      const processedUpdates = { ...updates };

      // Extract social media links and put them in a social_links object
      const socialLinks: Record<string, string | null> = {};
      const socialFields = ["instagram", "twitter", "discord", "website"];

      socialFields.forEach((field) => {
        if (field in processedUpdates) {
          socialLinks[field] = processedUpdates[field];
          delete processedUpdates[field]; // Remove from main updates
        }
      });

      // Only add social_links if we have any social links to update
      if (Object.keys(socialLinks).length > 0) {
        processedUpdates.social_links = socialLinks;
      }

      // Convert empty strings to null for the database
      Object.keys(processedUpdates).forEach((key) => {
        if (processedUpdates[key] === "") {
          processedUpdates[key] = null;
        }
      });

      console.log("Sending updates to API:", processedUpdates);

      // Make the API request
      const response = await fetch("/api/pools/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          poolId,
          updates: processedUpdates,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg =
          result.message || result.error || "Failed to update pool";
        setError(errorMsg);
        showToast.remove();
        showToast.error(errorMsg);
        return false;
      }

      showToast.remove();
      showToast.success("Updated successfully");

      if (onSuccess) {
        onSuccess(updates); // Pass back the original updates
      }

      return true;
    } catch (error) {
      console.error("Error updating pool:", error);
      const errorMsg =
        error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMsg);
      showToast.remove();
      showToast.error("Failed to update pool");
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper to validate a slug
  const validateSlugField = (slug: string) => {
    return validateSlug(slug);
  };

  return {
    updatePool,
    isUpdating,
    error,
    validateSlugField,
  };
}
