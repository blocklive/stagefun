import { useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { uploadPoolImage } from "@/lib/utils/imageUpload";

export const usePoolImage = (supabase: SupabaseClient | null) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!supabase) {
      console.error("Supabase client not available");
      alert("Authentication error. Please try again or refresh the page.");
      return null;
    }

    return uploadPoolImage(file, supabase, setIsUploadingImage);
  };

  return {
    selectedImage,
    imagePreview,
    isUploadingImage,
    setIsUploadingImage,
    handleImageSelect,
    handleRemoveImage,
    uploadImage,
  };
};

export default usePoolImage;
