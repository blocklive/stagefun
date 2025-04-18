import React from "react";
import Image from "next/image";
import { SupabaseClient } from "@supabase/supabase-js";
import { uploadTierImage } from "@/lib/utils/imageUpload";

interface TierImageUploaderProps {
  id: string;
  imageUrl?: string;
  name: string;
  isUploading: boolean;
  onUploadStart: (tierId: string) => void;
  onUploadComplete: (
    tierId: string,
    imageUrl: string,
    metadataUrl: string
  ) => void;
  onUploadError: (error: Error) => void;
  supabase: SupabaseClient;
}

export const TierImageUploader: React.FC<TierImageUploaderProps> = ({
  id,
  imageUrl,
  name,
  isUploading,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  supabase,
}) => {
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!name) {
      onUploadError(
        new Error("Please enter a tier name before uploading an image")
      );
      return;
    }

    // IMPORTANT: Always upload images to Supabase storage!
    // Never save base64 data directly to the database - this causes:
    // 1. Extremely large DB entries (megabytes instead of a few bytes for a URL)
    // 2. Poor performance for queries that return these fields
    // 3. Difficulty managing/referencing these images later
    // 4. Higher database costs

    onUploadStart(id);

    try {
      const { imageUrl: uploadedImageUrl, metadataUrl } = await uploadTierImage(
        file,
        name,
        supabase,
        () => {} // We're handling upload status via the onUploadStart/onUploadComplete
      );

      if (uploadedImageUrl && metadataUrl) {
        if (!uploadedImageUrl.startsWith("http")) {
          throw new Error(
            "Image upload didn't return a valid URL. Got: " +
              (typeof uploadedImageUrl === "string"
                ? uploadedImageUrl.substring(0, 30) + "..."
                : typeof uploadedImageUrl)
          );
        }

        // IMPORTANT: Both the image URL and metadata URL are used
        // These will be saved to the database in the tiers table:
        // - image_url: URL to the actual image
        // - nft_metadata: URL to the JSON metadata file used for NFTs
        onUploadComplete(id, uploadedImageUrl, metadataUrl);
      } else {
        throw new Error("Failed to get URLs after upload");
      }
    } catch (error) {
      console.error("Failed to upload tier image:", error);
      onUploadError(
        error instanceof Error ? error : new Error("Failed to upload image")
      );
      const input = document.getElementById(
        `tier-image-${id}`
      ) as HTMLInputElement;
      if (input) input.value = "";
    }
  };

  return (
    <div className="w-full md:w-[400px] h-[450px]">
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-[#FFFFFF14] group">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={`${name} tier image`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 280px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-center p-4">
            <div className="text-2xl font-bold text-[#836EF9] opacity-50">
              UPLOAD IMAGE
            </div>
          </div>
        )}
        <label
          htmlFor={`tier-image-${id}`}
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <input
            id={`tier-image-${id}`}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
            <span className="text-white">
              {isUploading ? "Uploading..." : "Upload Image"}
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};
