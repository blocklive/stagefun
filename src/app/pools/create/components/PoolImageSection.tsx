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
    <div className="mb-6">
      <PoolImageUpload
        imagePreview={imagePreview}
        isUploadingImage={isUploadingImage}
        onImageSelect={onImageSelect}
        onRemoveImage={onRemoveImage}
        showValidation={showValidation}
        placeholderText="YOU ARE INVITED"
        isRequired={true}
      />
    </div>
  );
};

export default PoolImageSection;
