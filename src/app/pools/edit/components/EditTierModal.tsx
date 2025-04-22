import React, { useEffect, useState } from "react";
import { Tier, RewardItem } from "../../create/types";
import { TiersSection } from "../../create/components/TiersSection";
import { useTierManagement } from "@/hooks/useTierManagement";
import { SupabaseClient } from "@supabase/supabase-js";
import Modal from "@/app/components/Modal";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";

interface EditTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: Tier | null;
  poolId: string;
  contractAddress: string;
  poolName: string;
  poolImage: string;
  availableRewardItems: RewardItem[];
  onSuccess: () => void;
}

const EditTierModal: React.FC<EditTierModalProps> = ({
  isOpen,
  onClose,
  tier,
  poolId,
  contractAddress,
  poolName,
  poolImage,
  availableRewardItems,
  onSuccess,
}) => {
  const [editedTier, setEditedTier] = useState<Tier | null>(null);
  const { supabase } = useAuthenticatedSupabase();

  // Initialize the tier management hook
  const { isLoading, isUpdating, error, updateTier } = useTierManagement({
    poolId,
    contractAddress,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  // Reset the edited tier when the modal opens with a new tier
  useEffect(() => {
    if (tier) {
      setEditedTier(tier);
    }
  }, [tier]);

  // Handle tier changes from the TiersSection component
  const handleTiersChange = (tiers: Tier[]) => {
    if (tiers.length > 0) {
      setEditedTier(tiers[0]);
    }
  };

  // Handle saving the tier
  const handleSave = async () => {
    if (!editedTier) return;

    // Convert string values to numbers
    const price = editedTier.price ? parseFloat(editedTier.price) : 0;
    const minPrice = editedTier.minPrice ? parseFloat(editedTier.minPrice) : 0;
    const maxPrice = editedTier.maxPrice ? parseFloat(editedTier.maxPrice) : 0;
    const maxPatrons = editedTier.maxPatrons
      ? parseInt(editedTier.maxPatrons)
      : 0;

    // TiersSection gives us a different format than what updateTier expects,
    // so we need to map the properties
    const tierUpdateData = {
      dbId: editedTier.id,
      onchainIndex: editedTier.onchain_index || 0,
      name: editedTier.name,
      description: editedTier.description || "",
      price,
      isVariablePrice: editedTier.isVariablePrice,
      minPrice,
      maxPrice,
      maxPatrons,
      isActive: editedTier.isActive,
      imageUrl: editedTier.imageUrl || "",
      nftMetadata: editedTier.nftMetadata || "",
      // Include reward items
      rewardItemIds: Array.isArray(editedTier.rewardItems)
        ? editedTier.rewardItems.map((item) => {
            if (typeof item === "string") return item;
            // Handle any object with an id property
            return (item as any)?.id || "";
          })
        : [],
    };

    await updateTier(tierUpdateData);
  };

  // Check if we have a tier to edit
  if (!tier) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Tier: ${tier.name}`}>
      <div className="p-4">
        {editedTier && supabase && (
          <div>
            <TiersSection
              tiers={[editedTier]}
              onTiersChange={handleTiersChange}
              availableRewardItems={availableRewardItems}
              onAddRewardItem={(reward) => {
                // We just need to return a reward with an ID for the TiersSection
                // The actual creation happens on save
                const tempId = `temp_${crypto.randomUUID()}`;
                return { ...reward, id: tempId };
              }}
              supabase={supabase}
              poolName={poolName}
              poolImage={poolImage}
            />

            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-6 bg-gray-700 hover:bg-gray-600 rounded-full text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading || isUpdating}
                className="py-3 px-6 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium transition-colors"
              >
                {isUpdating ? "Saving..." : "Save Tier"}
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500 rounded-lg text-red-300">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EditTierModal;
