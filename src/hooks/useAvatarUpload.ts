import { useState } from "react";
import showToast from "@/utils/toast";
import { User } from "../lib/supabase";

interface UseAvatarUploadResult {
  isUploading: boolean;
  uploadAvatar: (file: File) => Promise<string | null>;
  resetUpload: () => void;
}

/**
 * Custom hook to handle avatar uploads to Supabase storage
 *
 * @param dbUser The current database user
 * @param privyUser The current Privy user
 * @param onUploadSuccess Callback function to execute after successful upload
 * @returns Object with upload state and functions
 */
export function useAvatarUpload(
  dbUser: User | null,
  privyUser: any,
  onUploadSuccess?: () => Promise<void>
): UseAvatarUploadResult {
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Reset the upload state
   */
  const resetUpload = () => {
    setIsUploading(false);
  };

  /**
   * Upload an avatar image to Supabase storage
   * @param file The file to upload
   * @returns The public URL of the uploaded image, or null if upload failed
   */
  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!dbUser || !privyUser) {
      showToast.error("You must be logged in to upload an avatar");
      return null;
    }

    const loadingToast = showToast.loading("Uploading avatar...");

    try {
      setIsUploading(true);
      console.log("Starting avatar upload...");

      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${dbUser.id}_${Date.now()}.${fileExt}`;
      // Use just the filename without any prefix
      const filePath = fileName;

      console.log(`Uploading to path: ${filePath}`);

      // Get Supabase client from window object
      const supabase = (window as any).supabase;

      if (!supabase) {
        throw new Error("Supabase client not available");
      }

      // Try direct fetch upload first
      try {
        console.log("Trying direct fetch upload...");
        showToast.loading("Processing image...", { id: loadingToast });

        // Create a FormData object
        const formData = new FormData();
        formData.append("file", file);

        // Get the anon key from the environment
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!anonKey) {
          throw new Error("Supabase anon key not available");
        }

        // Use fetch API to upload directly to Supabase Storage REST API
        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/user-images/${filePath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${anonKey}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("Direct fetch upload failed:", errorText);
          throw new Error(`Upload failed: ${errorText}`);
        }

        console.log("Upload successful via direct fetch");

        // Get the public URL
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/user-images/${filePath}`;

        console.log("Generated public URL:", publicUrl);

        // Update the user record directly using Supabase client
        console.log("Updating user record directly with Supabase client");
        const { data: updateData, error: updateError } = await supabase
          .from("users")
          .update({ avatar_url: publicUrl })
          .eq("id", dbUser.id)
          .select()
          .single();

        if (updateError) {
          console.error("Direct update failed:", updateError);

          // Try the API route as a fallback
          try {
            console.log("Trying API route as fallback...");
            const updateResponse = await fetch("/api/update-user-avatar", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: dbUser.id,
                avatarUrl: publicUrl,
              }),
            });

            if (!updateResponse.ok) {
              const responseText = await updateResponse.text();
              console.error("API route update failed:", responseText);
              throw new Error(`API update failed: ${responseText}`);
            }

            console.log("User updated via API route");
          } catch (apiError) {
            console.error("API route update failed:", apiError);
            // Continue anyway since the image was uploaded
          }
        } else {
          console.log("User updated successfully:", updateData);
        }

        // Call the success callback if provided
        if (onUploadSuccess) {
          await onUploadSuccess();
        }

        // Show success message
        showToast.success("Avatar updated successfully!", { id: loadingToast });
        return publicUrl;
      } catch (fetchError) {
        console.error("Direct fetch upload failed:", fetchError);
        // Continue to try other methods
      }

      // Try to upload with the authenticated client
      try {
        console.log("Trying Supabase client upload...");
        showToast.loading("Processing image...", { id: loadingToast });

        const { data, error } = await supabase.storage
          .from("user-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true, // Overwrite if exists
          });

        if (error) {
          console.error("Supabase client upload error:", error);
          throw error;
        }

        console.log("Upload successful via Supabase client:", data);

        // Get the public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("user-images").getPublicUrl(filePath);

        console.log("Generated public URL:", publicUrl);

        // Update the user record directly using Supabase client
        console.log("Updating user record directly with Supabase client");
        const { data: updateData, error: updateError } = await supabase
          .from("users")
          .update({ avatar_url: publicUrl })
          .eq("id", dbUser.id)
          .select()
          .single();

        if (updateError) {
          console.error("Direct update failed:", updateError);

          // Try the API route as a fallback
          try {
            console.log("Trying API route as fallback...");
            const updateResponse = await fetch("/api/update-user-avatar", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: dbUser.id,
                avatarUrl: publicUrl,
              }),
            });

            if (!updateResponse.ok) {
              const responseText = await updateResponse.text();
              console.error("API route update failed:", responseText);
              throw new Error(`API update failed: ${responseText}`);
            }

            console.log("User updated via API route");
          } catch (apiError) {
            console.error("API route update failed:", apiError);
            // Continue anyway since the image was uploaded
          }
        } else {
          console.log("User updated successfully:", updateData);
        }

        // Call the success callback if provided
        if (onUploadSuccess) {
          await onUploadSuccess();
        }

        // Show success message
        showToast.success("Avatar updated successfully!", { id: loadingToast });
        return publicUrl;
      } catch (supabaseError) {
        console.error("Supabase client upload error:", supabaseError);
        showToast.error("Failed to upload avatar. Please try again.", {
          id: loadingToast,
        });
        return null;
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      showToast.error("Failed to upload avatar. Please try again.", {
        id: loadingToast,
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    uploadAvatar,
    resetUpload,
  };
}
