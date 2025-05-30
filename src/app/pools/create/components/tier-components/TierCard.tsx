import React, { useState, useRef, useEffect } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { SupabaseClient } from "@supabase/supabase-js";
import showToast from "@/utils/toast";
import { Tier, RewardItem } from "../../types";
import { uploadTierImage } from "@/lib/utils/imageUpload";
import { TierImageUploader } from "./TierImageUploader";
import { TierDetailsForm } from "./TierDetailsForm";
import { TierRewardsList } from "./TierRewardsList";
import { TierEnhancements } from "./TierEnhancements";
import RichTextEditor from "@/app/components/RichTextEditor";
import {
  getTierPriceDisplay,
  getMaxPatronsDisplay,
} from "@/lib/utils/contractValues";

interface TierCardProps {
  tier: Tier;
  index: number;
  onRemoveTier: (id: string) => void;
  onUpdateTier: (
    tierId: string,
    fieldOrFields: keyof Tier | Partial<Tier>,
    value?: any
  ) => void;
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
  onAddReward: (tierId: string) => void;
  onRemoveReward: (tierId: string, rewardId: string) => void;
  onUpdateReward: (
    tierId: string,
    rewardId: string,
    field: keyof RewardItem,
    value: string
  ) => void;
  disabled?: boolean;
  capAmount?: string;
  fundingGoal?: string;
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
  onAddReward,
  onRemoveReward,
  onUpdateReward,
  disabled = false,
  capAmount = "0",
  fundingGoal = "0.1",
}) => {
  // Handler for image upload start
  const handleUploadStart = (tierId: string) => {
    if (disabled) return; // Don't allow uploads when disabled
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

  // Create wrapper functions that respect the disabled state
  const handleTierUpdate = (
    tierId: string,
    fieldOrFields: keyof Tier | Partial<Tier>,
    value?: any
  ) => {
    if (disabled) return; // Don't update when disabled
    onUpdateTier(tierId, fieldOrFields, value);
  };

  const handleCreateReward = () => {
    if (disabled) return; // Don't create rewards when disabled
    onSetCurrentTierId(tier.id);
    onCreateNewReward(tier.id);
  };

  return (
    <div key={tier.id} className={`w-full ${disabled ? "opacity-90" : ""}`}>
      <div className="flex justify-end">
        {!disabled && (
          <button
            type="button"
            onClick={() => onRemoveTier(tier.id)}
            className="p-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full items-stretch">
        {/* Left side - Tier image */}
        <div className="order-first md:order-first flex-shrink-0">
          <TierImageUploader
            id={tier.id}
            imageUrl={tier.imageUrl}
            name={tier.name}
            isUploading={isUploadingImage}
            onUploadStart={handleUploadStart}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            supabase={supabase}
            disabled={disabled}
          />
        </div>

        {/* Right side - Tier details form */}
        <div className="order-last md:order-last flex-grow">
          <TierDetailsForm
            tier={tier}
            onUpdateTier={handleTierUpdate}
            capAmount={capAmount}
            fundingGoal={fundingGoal}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Description field - full width */}
      <div className="mt-6 w-full">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Tier Description
        </label>
        <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
          <RichTextEditor
            content={tier.description}
            onChange={(value) =>
              handleTierUpdate(tier.id, "description", value)
            }
            placeholder="Describe what this tier includes..."
            readOnly={disabled}
          />
        </div>
      </div>

      {/* Rewards section */}
      <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
        <TierRewardsList
          tier={tier}
          availableRewardItems={availableRewardItems}
          onUpdateTier={handleTierUpdate}
          onCreateNewReward={handleCreateReward}
        />
      </div>

      {/* Investment Enhancement section - Hidden for now */}
      {/* <div className={disabled ? "opacity-70 pointer-events-none" : ""}>
        <TierEnhancements
          tier={tier}
          onUpdateTier={handleTierUpdate}
          disabled={disabled}
        />
      </div> */}
    </div>
  );
};
