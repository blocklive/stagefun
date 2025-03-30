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
import GetTokensModal from "../../../components/GetTokensModal";
import { useContractInteraction } from "../../../../contexts/ContractInteractionContext";
import { useNativeBalance } from "../../../../hooks/useNativeBalance";
import showToast from "@/utils/toast";
import PoolImageUpload from "@/app/components/PoolImageUpload";
import { uploadPoolImage } from "@/lib/utils/imageUpload";
import { usePoolDetails } from "@/hooks/usePoolDetails";
import SocialLinksInput, {
  SocialLinksType,
} from "@/app/components/SocialLinksInput";
import RichTextEditor from "@/app/components/RichTextEditor";

export default function EditPoolPage() {
  const { user: privyUser } = usePrivy();
  const { dbUser } = useSupabase();
  const { supabase, isLoading: isClientLoading } = useAuthenticatedSupabase();
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
  } = usePoolDetails(poolId);

  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [poolName, setPoolName] = useState("");
  const [minCommitment, setMinCommitment] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinksType>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [showGetTokensModal, setShowGetTokensModal] = useState(false);

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
    if (pool) {
      // Only set these values if they are empty to avoid overwriting user edits
      if (!poolName) {
        setPoolName(pool.name);
      }
      if (!minCommitment) {
        setMinCommitment(pool.min_commitment?.toString() || "");
      }
      // Always load the description from pool data on initial load
      setDescription(pool.description || "");
      if (!location) {
        setLocation(pool.location || "");
      }
      if (Object.keys(socialLinks).length === 0) {
        setSocialLinks(pool.social_links || {});
      }

      // Always set the image preview from the pool data if it exists
      if (pool.image_url) {
        setImagePreview(pool.image_url);
      }
    }
  }, [pool, poolId, poolName, minCommitment, location, socialLinks]); // Removed description from deps

  // Add debug logging for description
  useEffect(() => {
    if (pool) {
      console.log("Description loading state:", {
        poolDescription: pool.description,
        currentDescription: description,
        pool,
      });
    }
  }, [pool, description]);

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
      showToast.error("Please wait for authentication to complete");
      return;
    }

    if (!pool) {
      showToast.error("Pool data not available");
      return;
    }

    // Check if user is the creator
    if (dbUser.id !== pool.creator_id) {
      showToast.error("You don't have permission to edit this pool");
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
        social_links: Object.keys(socialLinks).length > 0 ? socialLinks : null,
      };

      console.log("Update data:", {
        currentDescription: pool.description,
        newDescription: description,
        descriptionChanged: pool.description !== description,
      });

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
          showToast.error(
            "You don't have permission to update this pool. Please contact support."
          );
        } else {
          showToast.error(
            `Failed to update pool in database: ${error.message}`
          );
        }

        setIsSubmitting(false);
        return;
      }

      // Verify that the update was successful by checking the returned data
      if (!data || data.length === 0) {
        showToast.error(
          "Failed to update pool: No data returned from database"
        );
        setIsSubmitting(false);
        return;
      }

      const updatedPool = data[0];

      // Check if any fields were actually updated
      const fieldsUpdated = Object.keys(updateData).some((key) => {
        const updateKey = key as keyof typeof updateData;
        const poolKey = key as keyof typeof pool;

        const valueChanged =
          updateData[updateKey] !== null &&
          (key === "description"
            ? updateData[updateKey] !== pool[poolKey]
            : JSON.stringify(updateData[updateKey]) !==
              JSON.stringify(pool[poolKey]));

        if (valueChanged) {
          console.log(`Field ${key} changed:`, {
            old: pool[poolKey],
            new: updateData[updateKey],
          });
        }

        return valueChanged;
      });

      if (!fieldsUpdated) {
        showToast.error("No changes were detected in the pool data");
      } else {
        showToast.success("Pool updated successfully");
      }

      // Force a refresh of the pool data in the SWR cache
      refreshPool();

      // Navigate back to pool details with a state parameter
      router.push(`/pools/${pool.id}?refresh=true`);
    } catch (error) {
      showToast.error("An error occurred while updating the pool");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle points button click
  const handlePointsClick = () => {
    // Currently just a placeholder - later can route to points history or leaderboard
    router.push("/pools"); // In the future this can be "/profile/points" or similar
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
    <>
      <AppHeader
        showBackButton={true}
        showTitle={false}
        backgroundColor="#15161a"
        showGetTokensButton={true}
        showPointsButton={true}
        onGetTokensClick={() => setShowGetTokensModal(true)}
        onPointsClick={handlePointsClick}
        onBackClick={() => router.back()}
      />

      {/* Main Content */}
      <div className="px-4 md:px-8 max-w-6xl mx-auto">
        {/* Page Title */}
        <div className="mt-4">
          <h1 className="text-2xl font-bold">Edit Pool Details</h1>
        </div>

        {/* Form */}
        <form id="editPoolForm" onSubmit={handleSubmit} className="mt-6">
          {/* Pool Image */}
          <PoolImageUpload
            imagePreview={imagePreview}
            isUploadingImage={isUploadingImage}
            onImageSelect={handleImageSelect}
            onRemoveImage={handleRemoveImage}
            placeholderText={poolName || "Edit Pool"}
          />

          <div className="mt-8 space-y-6 pb-32 md:pb-24">
            {/* Description */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Write your story..."
              />
            </div>

            {/* Location */}
            <div>
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
            <div>
              <SocialLinksInput value={socialLinks} onChange={setSocialLinks} />
            </div>
          </div>
        </form>

        {/* Update Button - Fixed at bottom on mobile, normal position on desktop */}
        <div className="fixed bottom-0 left-0 right-0 md:static md:mt-8 bg-[#15161a] z-10">
          <div className="px-4 py-6 md:p-0 max-w-6xl mx-auto">
            <button
              onClick={handleSubmit}
              className="w-full py-4 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium text-lg transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Pool Details"}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showGetTokensModal && (
        <GetTokensModal
          isOpen={showGetTokensModal}
          onClose={() => setShowGetTokensModal(false)}
        />
      )}
    </>
  );
}
