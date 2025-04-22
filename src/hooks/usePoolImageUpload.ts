import { useState } from "react";
import { uploadPoolImage } from "@/lib/utils/imageUpload";
import { SupabaseClient } from "@supabase/supabase-js";
import { usePrivy } from "@privy-io/react-auth";
import showToast from "@/utils/toast";

interface UsePoolImageUploadOptions {
  poolId: string;
  currentImageUrl: string | null;
  supabase: SupabaseClient | null;
  onSuccess?: () => void;
}

interface UsePoolImageUploadResult {
  imagePreview: string | null;
  isUploading: boolean;
  handleImageSelect: (file: File) => Promise<void>;
  handleRemoveImage: () => Promise<void>;
}

export function usePoolImageUpload({
  poolId,
  currentImageUrl,
  supabase,
  onSuccess,
}: UsePoolImageUploadOptions): UsePoolImageUploadResult {
  const [imagePreview, setImagePreview] = useState<string | null>(
    currentImageUrl
  );
  const [isUploading, setIsUploading] = useState(false);
  const { getAccessToken } = usePrivy();

  // Update database with new image URL
  const updateImageInDatabase = async (imageUrl: string | null) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        showToast.error("Authentication error. Please try again.");
        return false;
      }

      const response = await fetch("/api/pools/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          poolId,
          updates: { image_url: imageUrl },
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        showToast.error(result.error || "Failed to update pool image");
        return false;
      }

      if (onSuccess) {
        onSuccess();
      }

      return true;
    } catch (error) {
      console.error("Error updating pool image:", error);
      showToast.error("Failed to update pool image");
      return false;
    }
  };

  // Handle image selection and upload
  const handleImageSelect = async (file: File) => {
    if (!file || !supabase || !poolId) {
      showToast.error("Missing required data for image upload");
      return;
    }

    if (!file.type.startsWith("image/")) {
      showToast.error("Please select an image file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast.error("Image size should be less than 50MB");
      return;
    }

    try {
      // Show image preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload image
      setIsUploading(true);
      showToast.loading("Uploading image...");

      const uploadResult = await uploadPoolImage(
        file,
        supabase,
        setIsUploading
      );

      if (!uploadResult?.imageUrl) {
        showToast.remove();
        showToast.error("Failed to upload image");
        return;
      }

      // Update database with new image URL
      const success = await updateImageInDatabase(uploadResult.imageUrl);

      if (success) {
        showToast.remove();
        showToast.success("Pool image updated successfully");
      }
    } catch (error) {
      console.error("Error in image upload:", error);
      showToast.remove();
      showToast.error("Failed to upload image");
      setIsUploading(false);
    }
  };

  // Handle image removal
  const handleRemoveImage = async () => {
    if (!poolId) {
      showToast.error("Pool ID is required");
      return;
    }

    try {
      setIsUploading(true);
      showToast.loading("Removing image...");

      // Update database with null image URL
      const success = await updateImageInDatabase(null);

      if (success) {
        setImagePreview(null);
        showToast.remove();
        showToast.success("Pool image removed successfully");
      }
    } catch (error) {
      console.error("Error removing image:", error);
      showToast.remove();
      showToast.error("Failed to remove image");
    } finally {
      setIsUploading(false);
    }
  };

  return {
    imagePreview,
    isUploading,
    handleImageSelect,
    handleRemoveImage,
  };
}
