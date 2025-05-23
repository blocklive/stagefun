import React from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import PoolImageUpload from "@/app/components/PoolImageUpload";

interface PoolImageSectionProps {
  imagePreview: string | null;
  isUploadingImage: boolean;
  selectedImage?: File | null;
  showValidation: boolean;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  supabase?: SupabaseClient | null;
}

const PoolImageSection: React.FC<PoolImageSectionProps> = ({
  imagePreview,
  isUploadingImage,
  showValidation,
  onImageSelect,
  onRemoveImage,
}) => {
  return (
    <PoolImageUpload
      imagePreview={imagePreview}
      isUploadingImage={isUploadingImage}
      onImageSelect={onImageSelect}
      onRemoveImage={onRemoveImage}
      showValidation={showValidation}
      placeholderText="UPLOAD IMAGE"
      isRequired={true}
    />
  );
};

export default PoolImageSection;
