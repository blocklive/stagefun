import React, { useState } from "react";
import { FaChevronLeft } from "react-icons/fa";

interface RewardItem {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface AddRewardModalProps {
  onClose: () => void;
  onAdd: (reward: Omit<RewardItem, "id">) => void;
}

export function AddRewardModal({ onClose, onAdd }: AddRewardModalProps) {
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemType, setNewItemType] = useState("NFT");

  const handleSubmit = () => {
    if (!newItemName.trim()) return;

    onAdd({
      name: newItemName.trim(),
      description: newItemDescription.trim(),
      type: newItemType,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#000000] rounded-[16px] w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 flex items-center">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#FFFFFF14] mr-4"
          >
            <FaChevronLeft className="text-white" />
          </button>
          <h2 className="text-xl font-bold text-white text-center flex-grow">
            Add New Reward
          </h2>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="e.g., VIP Badge"
              className="w-full px-4 py-2 bg-[#FFFFFF14] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#836EF9] text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={newItemType}
              onChange={(e) => setNewItemType(e.target.value)}
              className="w-full px-4 py-2 bg-[#FFFFFF14] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#836EF9] text-white"
            >
              <option value="NFT">NFT</option>
              <option value="Merchandise">Merchandise</option>
              <option value="Ticket">Ticket</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <textarea
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              placeholder="Describe the reward item..."
              className="w-full px-4 py-2 bg-[#FFFFFF14] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#836EF9] text-white resize-none h-24"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white transition-colors"
            >
              Add Reward
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
