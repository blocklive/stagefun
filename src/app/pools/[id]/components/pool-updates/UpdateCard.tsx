"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  FaHeart,
  FaRegHeart,
  FaPen,
  FaTrash,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import showToast from "@/utils/toast";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { useAuthJwt } from "@/hooks/useAuthJwt";
import EditUpdateForm from "./EditUpdateForm";

interface UpdateCardProps {
  update: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
    like_count: number;
    creator_id: string;
    users: {
      id: string;
      name: string;
      username: string;
      avatar_url: string;
    };
  };
  isCreator: boolean;
  userId?: string;
  onDelete: () => void;
  onEdit: () => void;
  updateNumber?: number;
}

export default function UpdateCard({
  update,
  isCreator,
  userId,
  onDelete,
  onEdit,
  updateNumber = 1,
}: UpdateCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const { token } = useAuthJwt();

  // Fetch like status
  const { data: likeData, mutate: mutateLike } = useSWR(
    userId
      ? `/api/pool-updates/likes?updateId=${update.id}&userId=${userId}`
      : null,
    fetcher
  );

  // Update hasLiked state when server data is received
  useEffect(() => {
    if (likeData) {
      setHasLiked(likeData.hasLiked);
    }
  }, [likeData]);

  // Format date
  const timeAgo = formatDistanceToNow(new Date(update.created_at), {
    addSuffix: true,
  });
  const wasEdited = update.created_at !== update.updated_at;

  // Toggle like
  const toggleLike = async () => {
    if (!userId) return;
    if (!token) {
      showToast.error("Authentication required");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/pool-updates/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          updateId: update.id,
          action: hasLiked ? "unlike" : "like",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle like");
      }

      // Update UI
      setHasLiked(!hasLiked);
      // Update like count
      update.like_count = hasLiked
        ? Math.max(0, update.like_count - 1)
        : update.like_count + 1;
    } catch (error) {
      console.error("Error toggling like:", error);
      showToast.error("Failed to process your like");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!token) {
      showToast.error("Authentication required");
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(`/api/pool-updates/${update.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete update");
      }

      onDelete();
    } catch (error) {
      console.error("Error deleting update:", error);
      showToast.error("Failed to delete update");
    } finally {
      setIsLoading(false);
      setIsDeleting(false);
    }
  };

  // Handle edit success
  const handleEditSuccess = () => {
    setIsEditing(false);
    onEdit();
  };

  // If editing, show edit form
  if (isEditing) {
    return (
      <EditUpdateForm
        update={update}
        onSuccess={handleEditSuccess}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="bg-[#FFFFFF0A] rounded-[16px] p-6">
      {/* Author and Actions Row */}
      <div className="flex items-center justify-between mb-4">
        {/* Author info */}
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full overflow-hidden relative mr-3">
            {update.users.avatar_url ? (
              <Image
                src={update.users.avatar_url}
                alt={update.users.name || "User"}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white">
                {(update.users.name || "User").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <div className="flex flex-col md:flex-row md:items-center md:gap-2">
              <div className="flex items-center">
                <h4 className="font-medium text-white">
                  {update.users.name || update.users.username || "User"}
                </h4>
                {isCreator && (
                  <span className="ml-2 text-[#FFDD50] text-sm">Organizer</span>
                )}
              </div>
              <p className="text-xs text-gray-400 md:before:content-['•'] md:before:mx-2 md:before:text-gray-500">
                {timeAgo} {wasEdited && "(edited)"}
              </p>
            </div>
          </div>
        </div>

        {/* Update Number */}
        <div className="text-gray-400">
          <span className="hidden md:inline">UPDATE </span>
          {updateNumber}
        </div>
      </div>

      {/* Title and Content */}
      <h3 className="text-xl font-bold text-white mb-3">{update.title}</h3>
      <div
        className="prose prose-invert prose-sm max-w-none mb-4"
        dangerouslySetInnerHTML={{ __html: update.content }}
      />

      {/* Bottom Actions - Like Button and Creator Actions */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button
            onClick={toggleLike}
            disabled={isLoading || !userId}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
              hasLiked
                ? "text-[#836EF9] hover:text-[#A78DFF]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {hasLiked ? <FaHeart className="text-[#836EF9]" /> : <FaRegHeart />}
            <span>{update.like_count || 0}</span>
          </button>

          {/* Creator Actions */}
          {isCreator && !isDeleting && (
            <div className="flex space-x-3">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                aria-label="Edit update"
              >
                <FaPen size={14} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setIsDeleting(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Delete update"
              >
                <FaTrash size={14} />
                <span>Delete</span>
              </button>
            </div>
          )}

          {/* Delete Confirmation */}
          {isCreator && isDeleting && (
            <div className="flex items-center space-x-3 ml-3">
              <span className="text-sm text-gray-400">Delete?</span>
              <button
                onClick={handleDeleteConfirm}
                disabled={isLoading}
                className="flex items-center gap-1 text-sm font-medium text-green-500 hover:text-green-400 transition-colors"
                aria-label="Confirm delete"
              >
                <FaCheck size={14} />
                <span>Yes</span>
              </button>
              <button
                onClick={() => setIsDeleting(false)}
                disabled={isLoading}
                className="flex items-center gap-1 text-sm font-medium text-red-500 hover:text-red-400 transition-colors"
                aria-label="Cancel delete"
              >
                <FaTimes size={14} />
                <span>No</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
