import React, { useState, useRef, useEffect } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { SupabaseClient } from "@supabase/supabase-js";
import showToast from "@/utils/toast";
import { Tier, RewardItem } from "../../types";
import { uploadTierImage } from "@/lib/utils/imageUpload";
import { TierImageUploader } from "./TierImageUploader";
import { TierDetailsForm } from "./TierDetailsForm";
import { TierRewardsList } from "./TierRewardsList";
import RichTextEditor from "@/app/components/RichTextEditor";

interface TierCardProps {
  tier: Tier;
  index: number;
  onRemoveTier: (id: string) => void;
  onUpdateTier: (tierId: string, field: keyof Tier, value: any) => void;
  onSetCurrentTierId: (id: string) => void;
  onAddRewardImage: (
    imageUrl: string,
    metadataUrl: string,
    tierId: string
  ) => void;
  supabase: SupabaseClient;
  isUploadingImage: boolean;
  setIsUploadingImage: (id: string, isUploading: boolean) => void;
  availableRewardItems: RewardItem[];
  onCreateNewReward: (tierId: string) => void;
}

export const TierCard: React.FC<TierCardProps> = ({
  tier,
  index,
  onRemoveTier,
  onUpdateTier,
  onSetCurrentTierId,
  onAddRewardImage,
  supabase,
  isUploadingImage,
  setIsUploadingImage,
  availableRewardItems,
  onCreateNewReward,
}) => {
  // Handler for image upload start
  const handleUploadStart = (tierId: string) => {
    setIsUploadingImage(tierId, true);
  };

  // Handler for image upload completion
  const handleUploadComplete = (
    tierId: string,
    imageUrl: string,
    metadataUrl: string
  ) => {
    setIsUploadingImage(tierId, false);
    onAddRewardImage(imageUrl, metadataUrl, tierId);
    console.log("Tier image uploaded:", imageUrl, metadataUrl, tierId);
  };

  // Handler for image upload error
  const handleUploadError = (error: Error) => {
    setIsUploadingImage(tier.id, false);
    showToast.error(error.message || "Failed to upload image");
  };

  return (
    <div key={tier.id} className="w-full">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold">Tier {index + 1} Details</h3>
        <button
          type="button"
          onClick={() => onRemoveTier(tier.id)}
          className="p-2 text-red-400 hover:text-red-300 transition-colors"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full">
        {/* Left side - Tier image */}
        <div className="order-first md:order-first md:w-80">
          <TierImageUploader
            id={tier.id}
            imageUrl={tier.imageUrl}
            name={tier.name}
            isUploading={isUploadingImage}
            onUploadStart={handleUploadStart}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            supabase={supabase}
          />
        </div>

        {/* Right side - Tier details form */}
        <div className="order-last md:order-last flex-grow">
          <TierDetailsForm tier={tier} onUpdateTier={onUpdateTier} />
        </div>
      </div>

      {/* Description field - full width */}
      <div className="mt-6 w-full">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Tier Description
        </label>
        <RichTextEditor
          content={tier.description}
          onChange={(value) => onUpdateTier(tier.id, "description", value)}
          placeholder="Describe what this tier includes..."
        />
      </div>

      {/* Rewards section */}
      <TierRewardsList
        tier={tier}
        availableRewardItems={availableRewardItems}
        onUpdateTier={onUpdateTier}
        onCreateNewReward={() => {
          onSetCurrentTierId(tier.id);
          onCreateNewReward(tier.id);
        }}
      />
    </div>
  );
};
