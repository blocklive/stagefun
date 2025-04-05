import React, { useState } from "react";
import { FaChevronLeft, FaChevronDown } from "react-icons/fa";
import {
  REWARD_TYPES,
  REWARD_TYPE_ICONS,
} from "../../../../lib/constants/strings";

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
  const [newItemType, setNewItemType] = useState(REWARD_TYPES.NFT);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Create an array of reward types for rendering
  const rewardTypeOptions = [
    {
      value: REWARD_TYPES.NFT,
      label: "NFT",
      icon: REWARD_TYPE_ICONS[REWARD_TYPES.NFT],
    },
    {
      value: REWARD_TYPES.MERCH,
      label: "Merchandise",
      icon: REWARD_TYPE_ICONS[REWARD_TYPES.MERCH],
    },
    {
      value: REWARD_TYPES.TICKET,
      label: "Ticket",
      icon: REWARD_TYPE_ICONS[REWARD_TYPES.TICKET],
    },
    {
      value: REWARD_TYPES.PERK,
      label: "Special Perk",
      icon: REWARD_TYPE_ICONS[REWARD_TYPES.PERK],
    },
  ];

  // Find the currently selected option
  const selectedOption =
    rewardTypeOptions.find((option) => option.value === newItemType) ||
    rewardTypeOptions[0];

  const handleSubmit = () => {
    if (!newItemName.trim()) return;

    onAdd({
      name: newItemName.trim(),
      description: newItemDescription.trim(),
      type: newItemType,
    });

    onClose();
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const selectType = (type: string) => {
    setNewItemType(type);
    setIsDropdownOpen(false);
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

            {/* Custom dropdown with icons */}
            <div className="relative">
              {/* Dropdown Button */}
              <button
                type="button"
                onClick={toggleDropdown}
                className="w-full px-4 py-2 bg-[#FFFFFF14] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#836EF9] text-white flex items-center justify-between"
              >
                <div className="flex items-center">
                  <span className="mr-2">{selectedOption.icon}</span>
                  <span>{selectedOption.label}</span>
                </div>
                <FaChevronDown
                  className={`transition-transform duration-300 ${
                    isDropdownOpen ? "transform rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-[#1E1F25] border border-[#FFFFFF1A] rounded-lg shadow-lg overflow-hidden">
                  {rewardTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => selectType(option.value)}
                      className={`w-full px-4 py-3 text-left flex items-center hover:bg-[#FFFFFF14] transition-colors ${
                        newItemType === option.value
                          ? "bg-[#FFFFFF0A] text-[#836EF9]"
                          : "text-white"
                      }`}
                    >
                      <span className="mr-3 text-lg">{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
