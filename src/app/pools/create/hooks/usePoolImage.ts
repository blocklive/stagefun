import { useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { uploadPoolImage } from "@/lib/utils/imageUpload";

export const usePoolImage = (supabase: SupabaseClient | null) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [metadataUrl, setMetadataUrl] = useState<string | null>(null);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if user is authenticated
      if (!supabase) {
        alert(
          "Please wait for authentication to complete before uploading images"
        );
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert("Image size should be less than 50MB");
        return;
      }

      setSelectedImage(file);

      // Upload the image immediately
      try {
        const result = await uploadImage(file);
        if (result.imageUrl) {
          setImagePreview(result.imageUrl);
          setFinalImageUrl(result.imageUrl);
        } else {
          // If upload fails, still show preview but warn user
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
          console.warn("Image upload failed, using local preview");
        }
      } catch (error) {
        // If upload fails, still show preview but warn user
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        console.error("Error uploading image:", error);
      }
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setMetadataUrl(null);
    setFinalImageUrl(null);
  };

  const uploadImage = async (
    file: File,
    poolName?: string
  ): Promise<{ imageUrl: string | null; metadataUrl: string | null }> => {
    if (!supabase) {
      console.error("Supabase client not available");
      alert("Authentication error. Please try again or refresh the page.");
      return { imageUrl: null, metadataUrl: null };
    }

    const result = await uploadPoolImage(
      file,
      supabase,
      setIsUploadingImage,
      poolName
    );

    // Store metadata URL in state for later use if needed
    if (result.metadataUrl) {
      setMetadataUrl(result.metadataUrl);
    }

    return result;
  };

  return {
    selectedImage,
    imagePreview,
    metadataUrl,
    finalImageUrl,
    isUploadingImage,
    setIsUploadingImage,
    handleImageSelect,
    handleRemoveImage,
    uploadImage,
  };
};

export default usePoolImage;
