import React from "react";
import Image from "next/image";

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
  placeholderText = "UPLOAD IMAGE",
  isRequired = true,
  showValidation = false,
}: PoolImageUploadProps) {
  return (
    <div className="w-[300px] h-[300px]">
      {isRequired && showValidation && !imagePreview && (
        <div className="mb-1">
          <span className="text-red-500">*</span>
        </div>
      )}

      <div className="relative w-full h-full rounded-lg overflow-hidden group">
        {/* Background color and checkerboard pattern */}
        <div
          className={`absolute inset-0 ${
            imagePreview ? "bg-[#1A1B1F]" : "bg-[#836EF9]"
          }`}
        >
          {imagePreview && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, #2a2a2a 25%, transparent 25%), 
                  linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), 
                  linear-gradient(45deg, transparent 75%, #2a2a2a 75%), 
                  linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)
                `,
                backgroundSize: "20px 20px",
                backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                opacity: 0.1,
              }}
            />
          )}
        </div>

        {/* Image preview or placeholder text */}
        {imagePreview ? (
          <Image
            src={imagePreview}
            alt="Pool preview"
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-3xl font-bold text-center text-[#1E1B2E]">
              {placeholderText}
            </div>
          </div>
        )}

        {/* Edit button - pencil icon in circle at bottom right */}
        {/* Full clickable area */}
        <label
          htmlFor="pool-image-upload"
          className="absolute inset-0 cursor-pointer"
        >
          <input
            id="pool-image-upload"
            type="file"
            accept="image/*"
            onChange={onImageSelect}
            className="hidden"
          />
        </label>

        {/* Visual edit indicator - circle with pencil icon */}
        <div className="absolute bottom-4 right-4 w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center group-hover:bg-white group-hover:bg-opacity-40 transition-all duration-200 pointer-events-none">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={imagePreview ? "white" : "#1E1B2E"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </div>

        {/* Loading spinner overlay */}
        {isUploadingImage && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <svg
                className="animate-spin h-8 w-8 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span className="text-white text-sm font-medium">
                Uploading...
              </span>
            </div>
          </div>
        )}

        {/* Remove button */}
        {imagePreview && (
          <button
            onClick={onRemoveImage}
            className="absolute top-4 right-4 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Status messages */}
      {isRequired && showValidation && !imagePreview && (
        <div className="mt-1 text-sm text-red-400">
          An image is required for your pool
        </div>
      )}
    </div>
  );
}
