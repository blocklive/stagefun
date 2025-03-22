import React from "react";
import Image from "next/image";
import { FaTimes, FaPencilAlt } from "react-icons/fa";

interface PoolImageUploadProps {
  imagePreview: string | null;
  isUploadingImage: boolean;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  placeholderText?: string;
  isRequired?: boolean;
  showValidation?: boolean;
}

export default function PoolImageUpload({
  imagePreview,
  isUploadingImage,
  onImageSelect,
  onRemoveImage,
  placeholderText = "YOU ARE INVITED",
  isRequired = true,
  showValidation = false,
}: PoolImageUploadProps) {
  // Style for the checkerboard pattern background (for images with transparency)
  const checkerboardStyle = {
    backgroundImage: `
      linear-gradient(45deg, #2a2a2a 25%, transparent 25%), 
      linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), 
      linear-gradient(45deg, transparent 75%, #2a2a2a 75%), 
      linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)
    `,
    backgroundSize: "20px 20px",
    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
    backgroundColor: "#1A1B1F",
    opacity: 0.1,
  };

  return (
    <div className="mt-8">
      {isRequired && showValidation && !imagePreview && (
        <div className="mb-2">
          <span className="text-red-500">*</span>
        </div>
      )}

      {/* Main container - conditional background based on image presence */}
      <div
        className={`relative w-full aspect-square rounded-lg ${
          imagePreview ? "bg-[#1A1B1F]" : "bg-[#836EF9]"
        }`}
      >
        {/* Checkered background for transparency - only shown when image exists */}
        {imagePreview && (
          <div
            className="absolute inset-0 rounded-lg"
            style={checkerboardStyle}
          ></div>
        )}

        {/* Image preview if available */}
        {imagePreview && (
          <Image
            src={imagePreview}
            alt="Pool preview"
            fill
            className="object-cover rounded-lg"
          />
        )}

        {/* Remove button - only shown when image exists */}
        {imagePreview && (
          <button
            onClick={onRemoveImage}
            className="absolute top-4 right-4 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 z-10"
          >
            <FaTimes className="text-white" />
          </button>
        )}

        {/* Center text - only shown when no image */}
        {!imagePreview && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl font-bold text-center text-[#1E1B2E]">
              {placeholderText}
            </div>
          </div>
        )}
      </div>

      {/* Fixed edit button positioned at the bottom right of the image */}
      <div className="relative">
        <label
          className="absolute -mt-16 right-4 w-14 h-14 bg-[#15161ACC] rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-[#15161A] z-30"
          style={{ bottom: "1rem" }}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImageSelect}
          />
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          >
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </label>
      </div>

      {/* Status messages */}
      {isUploadingImage && (
        <div className="mt-2 text-sm text-gray-400">Uploading image...</div>
      )}
      {isRequired && showValidation && !imagePreview && (
        <div className="mt-2 text-sm text-red-400">
          An image is required for your pool
        </div>
      )}
    </div>
  );
}
