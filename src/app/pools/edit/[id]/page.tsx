"use client";

import React, {
  useEffect,
  useState,
  ChangeEvent,
  Dispatch,
  SetStateAction,
} from "react";
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
import { Pool } from "@/lib/types";
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
import { validateSlug, formatSlug } from "@/lib/utils/slugValidation";

export default function EditPoolPage() {
  const { user: privyUser, getAccessToken } = usePrivy();
  const { dbUser } = useSupabase();
  const { supabase, isLoading: isClientLoading } = useAuthenticatedSupabase();
  const {
    updatePoolName,
    updateMinCommitment,
    isLoading: isContractLoading,
  } = useContractInteraction();
  const router = useRouter();
  const params = useParams();
  const poolIdentifier = params.id as string;

  const {
    pool,
    isLoading: isPoolLoading,
    refresh: refreshPool,
  } = usePoolDetails(poolIdentifier);

  const [viewportHeight, setViewportHeight] = useState("100vh");
  const [poolName, setPoolName] = useState("");
  const [minCommitment, setMinCommitment] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinksType>({});
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [showGetTokensModal, setShowGetTokensModal] = useState(false);

  // Set the correct viewport height, accounting for mobile browsers
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight}px`);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Load pool data when available
  useEffect(() => {
    if (pool) {
      if (!poolName) setPoolName(pool.name);
      if (!minCommitment)
        setMinCommitment(pool.min_commitment?.toString() || "");
      setDescription(pool.description || "");
      if (!location) setLocation(pool.location || "");
      if (Object.keys(socialLinks).length === 0)
        setSocialLinks(pool.social_links || {});
      if (!slug) setSlug(pool.slug || "");
      if (pool.image_url) setImagePreview(pool.image_url);
    }
  }, [pool, poolIdentifier, poolName, minCommitment, location, slug]);

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

  // When pool data is loaded, set the form fields
  useEffect(() => {
    if (pool) {
      setPoolName(pool.name || "");
      setDescription(pool.description || "");
      setLocation(pool.location || "");
      setSocialLinks(pool.social_links || {});
      setSlug(pool.slug || "");
      if (pool.image_url) {
        setImagePreview(pool.image_url);
      }
    }
  }, [pool]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!dbUser || !supabase) {
        alert(
          "Please wait for authentication to complete before uploading images"
        );
        return;
      }
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
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

  // Handle slug change with validation
  const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newSlug = formatSlug(e.target.value);
    setSlug(newSlug);

    // Clear any previous errors when editing
    if (slugError) setSlugError(null);
  };

  // Validate slug when input loses focus
  const validateSlugOnBlur = () => {
    if (!slug) return; // Empty is valid

    const validation = validateSlug(slug);
    if (!validation.isValid) {
      setSlugError(validation.reason || "Invalid slug");
    } else {
      setSlugError(null);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();

    if (!dbUser || isClientLoading) {
      showToast.error("Please wait for authentication to complete");
      return;
    }

    if (!pool) {
      showToast.error("Pool data not available");
      return;
    }

    if (dbUser.id !== pool.creator_id) {
      showToast.error("You don't have permission to edit this pool");
      return;
    }

    // Validate slug if present
    if (slug) {
      const validation = validateSlug(slug);
      if (!validation.isValid) {
        setSlugError(validation.reason || "Invalid slug");
        showToast.error(validation.reason || "Invalid slug format");
        return;
      }
    }

    try {
      setIsSubmitting(true);

      let imageUrl = pool.image_url;
      if (selectedImage) {
        const uploadResult = await uploadPoolImage(
          selectedImage,
          supabase!,
          setIsUploadingImage
        );
        if (!uploadResult?.imageUrl) {
          setIsSubmitting(false);
          return;
        }
        imageUrl = uploadResult.imageUrl;
      }
      if (!imagePreview && !selectedImage) {
        imageUrl = null;
      }

      const updates = {
        name: poolName,
        min_commitment: minCommitment ? parseFloat(minCommitment) : null,
        image_url: imageUrl,
        description: description,
        location: location,
        social_links:
          Object.keys(socialLinks).length > 0
            ? JSON.parse(JSON.stringify(socialLinks))
            : null,
        slug: slug || null,
      };

      console.log("Update data:", {
        currentDescription: pool.description,
        newDescription: description,
        descriptionChanged: pool.description !== description,
        socialLinks,
      });

      const token = await getAccessToken();
      if (!token) {
        showToast.error("Authentication error. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/pools/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ poolId: pool.id, updates }),
      });

      const result = await response.json();
      if (!response.ok) {
        showToast.error(result.error || "Failed to update pool");
        setIsSubmitting(false);
        return;
      }

      showToast.success("Pool updated successfully!");
      await refreshPool();

      const newSlug = updates.slug || pool.slug;
      if (newSlug) {
        router.push(`/${newSlug}`);
      } else {
        router.push(`/pools/${pool.id}`); // Fallback to ID route if no slug
      }
    } catch (error) {
      console.error("Error updating pool:", error);
      showToast.error("An error occurred while updating the pool");
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const handlePointsClick = () => {
    router.push("/onboarding");
  };

  // Check if user is authorized to edit this pool
  const isAuthorized = dbUser && pool && dbUser.id === pool.creator_id;

  if (isPoolLoading || isClientLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {" "}
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>{" "}
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {" "}
        <div className="text-center">
          {" "}
          <h1 className="text-2xl font-bold mb-2">Pool Not Found</h1>{" "}
          <p className="text-gray-400">
            {" "}
            The pool identified by '{poolIdentifier}' could not be found.{" "}
          </p>{" "}
        </div>{" "}
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {" "}
        <div className="text-center">
          {" "}
          <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>{" "}
          <p className="text-gray-400">
            {" "}
            You don't have permission to edit this pool.{" "}
          </p>{" "}
        </div>{" "}
      </div>
    );
  }

  return (
    <>
      <div className="px-4 md:px-8 max-w-6xl mx-auto">
        <div className="mt-4">
          <h1 className="text-2xl font-bold">Edit Pool Details</h1>
        </div>

        <form id="editPoolForm" onSubmit={handleSubmit} className="mt-6">
          <PoolImageUpload
            imagePreview={imagePreview}
            isUploadingImage={isUploadingImage}
            onImageSelect={handleImageSelect}
            onRemoveImage={handleRemoveImage}
            placeholderText={poolName || "Edit Pool"}
          />

          <div className="mt-8 space-y-6 pb-12 md:pb-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Description</h2>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Write your story..."
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Public URL</h2>
              <div className="flex items-center bg-[#FFFFFF14] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#836EF9]">
                <span className="px-4 py-4 text-gray-400 bg-gray-700 border-r border-gray-600">
                  app.stage.fun/
                </span>
                <input
                  id="poolSlug"
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  onBlur={validateSlugOnBlur}
                  placeholder="your-unique-url"
                  className={`w-full p-4 bg-transparent text-white placeholder-gray-400 focus:outline-none ${
                    slugError ? "border-red-500" : ""
                  }`}
                  maxLength={32}
                />
              </div>
              {slugError ? (
                <p className="mt-2 text-sm text-red-500">{slugError}</p>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Customize your pool's public link (letters, numbers, hyphens
                  only). Minimum 3 characters.
                </p>
              )}
            </div>

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
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setLocation(e.target.value)
                  }
                  className="w-full p-4 pl-16 bg-[#FFFFFF14] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#836EF9]"
                />
              </div>
            </div>

            <div>
              <SocialLinksInput value={socialLinks} onChange={setSocialLinks} />
            </div>
          </div>
        </form>

        <div className="fixed bottom-0 left-0 right-0 md:static md:mt-8 bg-[#15161a] z-10">
          <div className="px-4 py-6 md:p-0 max-w-6xl mx-auto">
            <button
              type="submit"
              form="editPoolForm"
              className="w-full py-4 bg-[#836EF9] hover:bg-[#7058E8] rounded-full text-white font-medium text-lg transition-colors"
              disabled={isSubmitting || isPoolLoading || !!slugError}
            >
              {isSubmitting ? "Updating..." : "Update Pool Details"}
            </button>
            <div className="h-8 md:h-12"></div>
          </div>
        </div>
      </div>

      <GetTokensModal
        isOpen={showGetTokensModal}
        onClose={() => setShowGetTokensModal(false)}
      />
    </>
  );
}
