"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { FaArrowLeft, FaMapMarkerAlt } from "react-icons/fa";
import {
  FaBold,
  FaItalic,
  FaListUl,
  FaLink,
  FaYoutube,
  FaImage,
} from "react-icons/fa";
import { useSupabase } from "../../../../contexts/SupabaseContext";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import { Pool } from "@/lib/supabase";
import AppHeader from "../../../components/AppHeader";
import toast from "react-hot-toast";
import PoolImageUpload from "@/components/PoolImageUpload";
import { uploadPoolImage } from "@/lib/utils/imageUpload";
import { usePool } from "@/hooks/usePool";
import { useContractInteraction } from "../../../../contexts/ContractInteractionContext";
import SocialLinksInput, {
  SocialLinksType,
} from "@/components/SocialLinksInput";

export default function EditPoolPage() {
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();
  const { client: supabase, isLoading: isClientLoading } =
    useAuthenticatedSupabase();
  const {
    updatePoolName,
    updateMinCommitment,
    isLoading: isContractLoading,
  } = useContractInteraction();
  const router = useRouter();
  const params = useParams();
  const poolId = params.id as string;

  const {
    pool,
    isLoading: isPoolLoading,
    refresh: refreshPool,
  } = usePool(poolId);

  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [poolName, setPoolName] = useState("");
  const [minCommitment, setMinCommitment] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [patrons, setPatrons] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinksType>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      // Use the window's inner height for a more accurate measurement
      setViewportHeight(`${window.innerHeight}px`);
    };

    // Set initial height
    updateHeight();

    // Update on resize
    window.addEventListener("resize", updateHeight);

    // Clean up
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Load pool data when available
  useEffect(() => {
    if (pool && !poolName) {
      setPoolName(pool.name);
      setMinCommitment(pool.min_commitment?.toString() || "");
      setDescription(pool.description || "");
      setLocation(pool.location || "");
      setPatrons(pool.patrons_number?.toString() || "");
      setSocialLinks(pool.social_links || {});
      if (pool.image_url) {
        setImagePreview(pool.image_url);
      }
    }
  }, [pool, poolId, poolName]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if user is authenticated
      if (!dbUser || !supabase) {
        alert(
          "Please wait for authentication to complete before uploading images"
        );
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        alert("Image size should be less than 50MB");
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    if (!dbUser || !supabase || isClientLoading) {
      toast.error("Please wait for authentication to complete");
      return;
    }

    if (!pool) {
      toast.error("Pool data not available");
      return;
    }

    // Check if user is the creator
    if (dbUser.id !== pool.creator_id) {
      toast.error("You don't have permission to edit this pool");
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload image if selected
      let imageUrl = pool.image_url;
      if (selectedImage) {
        const uploadedImageUrl = await uploadPoolImage(
          selectedImage,
          supabase,
          setIsUploadingImage
        );

        // Stop pool update if image upload failed
        if (!uploadedImageUrl) {
          setIsSubmitting(false);
          return;
        }

        imageUrl = uploadedImageUrl;
      }

      // If image was removed, set to null
      if (!imagePreview && !selectedImage) {
        imageUrl = null;
      }

      // Create the update object
      const updateData = {
        name: pool.name,
        min_commitment: pool.min_commitment,
        image_url: imageUrl,
        description: description,
        location: location,
        patrons_number: patrons ? parseInt(patrons) : pool.patrons_number,
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      };

      // Then, update the database record
      const { data, error } = await supabase
        .from("pools")
        .update(updateData)
        .eq("id", pool.id)
        .select();

      if (error) {
        // Check if it's an RLS permission error
        if (
          error.code === "42501" ||
          error.message.includes("permission") ||
          error.message.includes("policy")
        ) {
          toast.error(
            "You don't have permission to update this pool. Please contact support."
          );
        } else {
          toast.error(`Failed to update pool in database: ${error.message}`);
        }

        setIsSubmitting(false);
        return;
      }

      // Verify that the update was successful by checking the returned data
      if (!data || data.length === 0) {
        toast.error("Failed to update pool: No data returned from database");
        setIsSubmitting(false);
        return;
      }

      const updatedPool = data[0];

      // Check if any fields were actually updated
      const fieldsUpdated = Object.keys(updateData).some((key) => {
        const updateKey = key as keyof typeof updateData;
        const poolKey = key as keyof typeof pool;

        return (
          updateData[updateKey] !== null &&
          JSON.stringify(updateData[updateKey]) !==
            JSON.stringify(pool[poolKey])
        );
      });

      if (!fieldsUpdated) {
        toast.error("No changes were detected in the pool data");
      } else {
        toast.success("Pool updated successfully");
      }

      // Force a refresh of the pool data in the SWR cache
      refreshPool();

      // Navigate back to pool details with a state parameter
      router.push(`/pools/${pool.id}?refresh=true`);
    } catch (error) {
      toast.error("An error occurred while updating the pool");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if user is authorized to edit this pool
  const isAuthorized = dbUser && pool && dbUser.id === pool.creator_id;

  if (isPoolLoading || isClientLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Pool Not Found</h1>
          <p className="text-gray-400">
            The pool you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
          <p className="text-gray-400">
            You don't have permission to edit this pool.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-[#121212] text-white min-h-screen"
      style={{ minHeight: viewportHeight }}
    >
      <AppHeader />

      {/* Back Button and Title */}
      <div className="flex items-center px-6 py-4">
        <button
          onClick={() => router.back()}
          className="mr-4 text-gray-400 hover:text-white"
        >
          <FaArrowLeft />
        </button>
        <h1 className="text-2xl font-bold">Edit Pool Details</h1>
      </div>

      <div className="px-6" style={{ paddingBottom: "100px" }}>
        {/* Pool Image */}
        <PoolImageUpload
          imagePreview={imagePreview}
          isUploadingImage={isUploadingImage}
          onImageSelect={handleImageSelect}
          onRemoveImage={handleRemoveImage}
          placeholderText={poolName || "Edit Pool"}
        />

        {/* Form */}
        <form id="editPoolForm" onSubmit={handleSubmit} className="mt-8">
          {/* Patrons */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Patrons"
              name="patrons"
              value={patrons}
              onChange={(e) => setPatrons(e.target.value)}
              className="w-full p-4 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Description</h2>
            <div className="bg-[#FFFFFF14] rounded-lg overflow-hidden">
              <textarea
                placeholder="Write your story..."
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-transparent text-white placeholder-gray-400 focus:outline-none min-h-[200px] resize-none"
              />

              {/* Text formatting toolbar */}
              <div className="flex items-center p-2 border-t border-gray-700">
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <FaBold />
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <FaItalic />
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <FaListUl />
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <FaLink />
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <FaYoutube />
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <FaImage />
                </button>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="w-8 h-8 bg-[#FFFFFF14] rounded-full flex items-center justify-center">
                  <FaMapMarkerAlt className="text-white" />
                </div>
              </div>
              <input
                type="text"
                placeholder="Location (Optional)"
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-4 pl-16 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="mb-6">
            <SocialLinksInput value={socialLinks} onChange={setSocialLinks} />
          </div>

          {/* Submit Button */}
          <div className="fixed bottom-0 left-0 right-0 bg-[#121212] p-4 border-t border-gray-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-lg font-bold ${
                isSubmitting
                  ? "bg-gray-600 text-gray-300"
                  : "bg-[#836EF9] text-white hover:bg-opacity-90"
              }`}
            >
              {isSubmitting ? "Updating..." : "Update Pool"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
