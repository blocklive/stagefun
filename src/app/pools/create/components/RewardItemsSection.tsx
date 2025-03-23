import React, { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface RewardItem {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface RewardItemsSectionProps {
  rewardItems: RewardItem[];
  onRewardItemsChange: (items: RewardItem[]) => void;
}

export function RewardItemsSection({
  rewardItems,
  onRewardItemsChange,
}: RewardItemsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newItemType, setNewItemType] = useState("NFT");

  const addRewardItem = () => {
    if (!newItemName.trim()) return;

    const newItem: RewardItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName.trim(),
      description: newItemDescription.trim(),
      type: newItemType,
    };

    onRewardItemsChange([...rewardItems, newItem]);
    setNewItemName("");
    setNewItemDescription("");
    setNewItemType("NFT");
    setShowForm(false); // Hide form after adding
  };

  const removeRewardItem = (id: string) => {
    onRewardItemsChange(rewardItems.filter((item) => item.id !== id));
  };

  return (
    <div className="bg-[#FFFFFF0A] p-6 rounded-[16px] mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Reward Items</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Reward Item
        </button>
      </div>

      {/* List of existing reward items */}
      {rewardItems.length > 0 && (
        <div className="space-y-4 mb-6">
          {rewardItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-[#FFFFFF0A] rounded-lg"
            >
              <div>
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-sm text-gray-400">{item.description}</p>
                <span className="text-xs text-[#836EF9] mt-1">{item.type}</span>
              </div>
              <button
                onClick={() => removeRewardItem(item.id)}
                className="text-gray-400 hover:text-red-400 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add reward item form */}
      {showForm && (
        <div className="space-y-4">
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

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-[#FFFFFF14] hover:bg-[#FFFFFF1A] rounded-full text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={addRewardItem}
              className="px-4 py-2 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white transition-colors"
            >
              Add Item
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {rewardItems.length === 0 && !showForm && (
        <p className="text-gray-400 text-center">No reward items added yet.</p>
      )}
    </div>
  );
}
