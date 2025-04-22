import React, { useState } from "react";
import { Tier, RewardItem } from "../../create/types";
import { TiersSection } from "../../create/components/TiersSection";
import { useTierManagement } from "@/hooks/useTierManagement";
import Modal from "@/app/components/Modal";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import { v4 as uuidv4 } from "uuid";

interface CreateTierModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolId: string;
  contractAddress: string;
  poolName: string;
  poolImage: string;
  availableRewardItems: RewardItem[];
  onSuccess: () => void;
}

const CreateTierModal: React.FC<CreateTierModalProps> = ({
  isOpen,
  onClose,
  poolId,
  contractAddress,
  poolName,
  poolImage,
  availableRewardItems,
  onSuccess,
}) => {
  const { supabase } = useAuthenticatedSupabase();

  // Create a default tier
  const defaultTier: Tier = {
    id: `temp_${uuidv4()}`,
    name: "New Tier",
    price: "99",
    isActive: true,
    isVariablePrice: false,
    minPrice: "0",
    maxPrice: "0",
    maxPatrons: "20",
    description: "",
    nftMetadata: "",
    rewardItems: [],
    modifiedFields: new Set<string>([]),
  };

  const [newTier, setNewTier] = useState<Tier>(defaultTier);

  // Initialize the tier management hook
  const { isLoading, isUpdating, error, createTier } = useTierManagement({
    poolId,
    contractAddress,
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  // Handle tier changes from the TiersSection component
  const handleTiersChange = (tiers: Tier[]) => {
    if (tiers.length > 0) {
      setNewTier(tiers[0]);
    }
  };

  // Handle creating the tier
  const handleCreate = async () => {
    // Convert string values to numbers
    const price = newTier.price ? parseFloat(newTier.price) : 0;
    const minPrice = newTier.minPrice ? parseFloat(newTier.minPrice) : 0;
    const maxPrice = newTier.maxPrice ? parseFloat(newTier.maxPrice) : 0;
    const maxPatrons = newTier.maxPatrons ? parseInt(newTier.maxPatrons) : 0;

    // Format the tier data for creation
    const tierCreateData = {
      name: newTier.name,
      description: newTier.description || "",
      price,
      isVariablePrice: newTier.isVariablePrice,
      minPrice,
      maxPrice,
      maxPatrons,
      isActive: newTier.isActive,
      imageUrl: newTier.imageUrl || "",
      nftMetadata: newTier.nftMetadata || "",
      // Include reward items
      rewardItemIds: Array.isArray(newTier.rewardItems)
        ? newTier.rewardItems.map((item) => {
            if (typeof item === "string") return item;
            // Handle any object with an id property
            return (item as any)?.id || "";
          })
        : [],
      // Add onchainIndex for new tiers (typically 0 or the next available index)
      onchainIndex: 0,
    };

    await createTier(tierCreateData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Tier">
      <div className="p-4">
        {supabase && (
          <div>
            <TiersSection
              tiers={[newTier]}
              onTiersChange={handleTiersChange}
              availableRewardItems={availableRewardItems}
              onAddRewardItem={(reward) => {
                // We just need to return a reward with an ID for the TiersSection
                // The actual creation happens on save
                const tempId = `temp_${uuidv4()}`;
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
                onClick={handleCreate}
                disabled={isLoading || isUpdating}
                className="py-3 px-6 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium transition-colors"
              >
                {isUpdating ? "Creating..." : "Create Tier"}
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

export default CreateTierModal;
