"use client";

import { useState } from "react";
import TiptapEditor from "@/components/TiptapEditor";
import { FaChevronLeft } from "react-icons/fa";
import showToast from "@/utils/toast";
import { useAuthJwt } from "@/hooks/useAuthJwt";

interface EditUpdateFormProps {
  update: {
    id: string;
    title: string;
    content: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EditUpdateForm({
  update,
  onSuccess,
  onCancel,
}: EditUpdateFormProps) {
  const [title, setTitle] = useState(update.title);
  const [content, setContent] = useState(update.content);
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

      const response = await fetch(`/api/pool-updates/${update.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update");
      }

      onSuccess();
    } catch (error) {
      console.error("Error updating:", error);
      showToast.error(
        error instanceof Error ? error.message : "Failed to update"
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
        <h3 className="text-xl font-semibold text-white">Edit Update</h3>
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
          <TiptapEditor
            content={content}
            onChange={setContent}
            placeholder="Share your update with supporters..."
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-[#FFFFFF1A] rounded-lg text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
