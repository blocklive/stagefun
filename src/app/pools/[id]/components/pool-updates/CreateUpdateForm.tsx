"use client";

import { useState } from "react";
import TiptapEditor from "@/components/TiptapEditor";
import { FaChevronLeft } from "react-icons/fa";
import showToast from "@/utils/toast";
import { useAuthJwt } from "@/hooks/useAuthJwt";

interface CreateUpdateFormProps {
  poolId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CreateUpdateForm({
  poolId,
  onSuccess,
  onCancel,
}: CreateUpdateFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token, isLoading: isTokenLoading } = useAuthJwt();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast.error("Please enter a title");
      return;
    }

    if (content === "<p></p>" || content === "") {
      showToast.error("Please enter some content");
      return;
    }

    if (!token) {
      showToast.error("Authentication required");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/pool-updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          poolId,
          title,
          content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create update");
      }

      onSuccess();
    } catch (error) {
      console.error("Error creating update:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to create update"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF0A] rounded-[16px] p-6">
      <div className="flex items-center mb-4">
        <button
          onClick={onCancel}
          className="p-2 rounded-full bg-[#FFFFFF14] mr-3"
          aria-label="Go back"
        >
          <FaChevronLeft className="text-white" />
        </button>
        <h3 className="text-xl font-semibold text-white">Post an Update</h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for your update"
            className="w-full bg-[#FFFFFF14] border border-[#FFFFFF1A] rounded-lg p-3 text-white"
            required
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Content
          </label>
          <div className="min-h-[120px]">
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="Share your update with supporters..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-start">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 px-6 bg-white text-[#15161A] rounded-xl font-medium disabled:opacity-50"
          >
            {isSubmitting ? "Posting..." : "Post Update"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-[#FFFFFF1A] rounded-lg text-white"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
