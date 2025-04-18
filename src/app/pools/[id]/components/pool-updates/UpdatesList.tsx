"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import UpdateCard from "./UpdateCard";
import CreateUpdateForm from "./CreateUpdateForm";
import { FaPlus } from "react-icons/fa";
import showToast from "@/utils/toast";

interface UpdatesListProps {
  poolId: string;
  isCreator: boolean;
  userId?: string;
}

export default function UpdatesList({
  poolId,
  isCreator,
  userId,
}: UpdatesListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch pool updates
  const { data, error, mutate } = useSWR(
    `/api/pool-updates?poolId=${poolId}`,
    fetcher
  );

  const updates = data?.updates || [];
  const isLoading = !data && !error;

  // Handle update creation success
  const handleUpdateCreated = () => {
    setShowCreateForm(false);
    mutate();
    showToast.success("Update posted successfully!");
  };

  // Handle update deletion success
  const handleUpdateDeleted = () => {
    mutate();
    showToast.success("Update deleted successfully!");
  };

  // Handle update editing success
  const handleUpdateEdited = () => {
    mutate();
    showToast.success("Update edited successfully!");
  };

  return (
    <div className="space-y-6">
      {/* Create Update Button for Creators */}
      {isCreator && !showCreateForm && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center justify-center gap-2 h-12 px-6 bg-white text-[#15161A] rounded-xl font-medium hover:bg-gray-100 transition-colors"
        >
          <FaPlus className="text-sm" />
          <span>Post an Update</span>
        </button>
      )}

      {/* Create Update Form */}
      {isCreator && showCreateForm && (
        <CreateUpdateForm
          poolId={poolId}
          onSuccess={handleUpdateCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Updates List */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <div className="animate-pulse text-gray-400">Loading updates...</div>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-red-500">
          Error loading updates. Please try again.
        </div>
      ) : updates.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          {isCreator
            ? "No updates have been posted yet. Share news about your project!"
            : "No updates have been posted yet."}
        </div>
      ) : (
        <div className="space-y-6">
          {updates.map((update: any, index: number) => (
            <UpdateCard
              key={update.id}
              update={update}
              isCreator={isCreator}
              userId={userId}
              onDelete={handleUpdateDeleted}
              onEdit={handleUpdateEdited}
              updateNumber={updates.length - index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
