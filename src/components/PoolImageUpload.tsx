import React, { useState } from "react";
import Image from "next/image";
import { FaTimes } from "react-icons/fa";

interface PoolImageUploadProps {
  imagePreview: string | null;
  isUploadingImage: boolean;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  placeholderText?: string;
}

export default function PoolImageUpload({
  imagePreview,
  isUploadingImage,
  onImageSelect,
  onRemoveImage,
  placeholderText = "YOU ARE INVITED",
}: PoolImageUploadProps) {
  return (
    <div className="mt-8">
      <div className="relative w-full aspect-square bg-[#836EF9] rounded-lg overflow-hidden">
        {imagePreview ? (
          <>
            <Image
              src={imagePreview}
              alt="Pool preview"
              fill
              className="object-cover"
            />
            <button
              onClick={onRemoveImage}
              className="absolute top-4 right-4 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
            >
              <FaTimes className="text-white" />
            </button>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-4xl font-bold text-center text-[#1E1B2E] p-8">
              {placeholderText}
            </div>
            <label className="absolute bottom-4 right-4 w-12 h-12 bg-[#FFFFFF14] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#FFFFFF1A]">
              <input
                type="file"
                accept="image/*"
                onChange={onImageSelect}
                className="hidden"
              />
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </label>
          </div>
        )}
      </div>
      {isUploadingImage && (
        <div className="mt-2 text-sm text-gray-400">Uploading image...</div>
      )}
    </div>
  );
}
