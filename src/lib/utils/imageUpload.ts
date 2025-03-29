import { SupabaseClient } from "@supabase/supabase-js";

export async function uploadPoolImage(
  file: File,
  supabase: SupabaseClient,
  setIsUploadingImage?: (isUploading: boolean) => void
): Promise<string | null> {
  if (!supabase) {
    console.error("Supabase client not available");
    return null;
  }

  try {
    if (setIsUploadingImage) setIsUploadingImage(true);
    console.log("Starting image upload...");

    // Create a unique file name
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()
      .toString(36)
      .substring(2)}_${Date.now()}.${fileExt}`;
    // Use just the filename without the pool-images/ prefix since the bucket name is already pool-images
    const filePath = fileName;

    console.log(`Uploading to path: ${filePath}`);

    // Try to upload with the authenticated client first
    let data;
    let error;

    try {
      const result = await supabase.storage
        .from("pool-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      data = result.data;
      error = result.error;
    } catch (uploadError) {
      console.error("Initial upload attempt failed:", uploadError);
      error = uploadError;
    }

    // If there's an RLS error, try a different approach
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      (error.message.includes("security policy") ||
        error.message.includes("permission denied") ||
        error.message.includes("invalid algorithm"))
    ) {
      console.log("RLS policy error detected, trying alternative approach...");

      // Create a FormData object
      const formData = new FormData();
      formData.append("file", file);

      // Use fetch API to upload directly to Supabase Storage REST API
      try {
        // Get authentication token from user session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error("No authentication token available");
        }

        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/pool-images/${filePath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(`Upload failed: ${JSON.stringify(errorData)}`);
        }

        console.log("Upload successful via REST API");
        error = null;
      } catch (restError) {
        console.error("REST API upload failed:", restError);
        error = restError;
      }
    }

    if (error) {
      console.error("Supabase storage upload error:", error);
      throw error;
    }

    console.log("Upload successful:", data);

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("pool-images").getPublicUrl(filePath);

    console.log("Generated public URL:", publicUrl);
    return publicUrl;
  } catch (error: any) {
    console.error("Error uploading image:", error);

    // More detailed error message
    let errorMessage = "Failed to upload image. Please try again.";
    if (error?.message) {
      errorMessage += ` Error: ${error.message}`;
    }

    alert(errorMessage);
    return null;
  } finally {
    if (setIsUploadingImage) setIsUploadingImage(false);
  }
}

export async function uploadTierImage(
  file: File,
  tierName: string,
  supabase: SupabaseClient,
  setIsUploadingImage?: (isUploading: boolean) => void
): Promise<{ imageUrl: string | null; metadataUrl: string | null }> {
  if (!supabase) {
    console.error("Supabase client not available");
    return { imageUrl: null, metadataUrl: null };
  }

  try {
    if (setIsUploadingImage) setIsUploadingImage(true);
    console.log("Starting tier image upload...");

    // Create a unique file name
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()
      .toString(36)
      .substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = fileName;

    console.log(`Uploading to path: ${filePath}`);

    // Try to upload with the authenticated client first
    let data;
    let error;

    try {
      const result = await supabase.storage
        .from("pool-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      data = result.data;
      error = result.error;
    } catch (uploadError) {
      console.error("Initial upload attempt failed:", uploadError);
      error = uploadError;
    }

    // If there's an RLS error, try a different approach
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      (error.message.includes("security policy") ||
        error.message.includes("permission denied") ||
        error.message.includes("invalid algorithm"))
    ) {
      console.log("RLS policy error detected, trying alternative approach...");

      // Create a FormData object
      const formData = new FormData();
      formData.append("file", file);

      // Use fetch API to upload directly to Supabase Storage REST API
      try {
        // Get authentication token from user session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error("No authentication token available");
        }

        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/pool-images/${filePath}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(`Upload failed: ${JSON.stringify(errorData)}`);
        }

        console.log("Upload successful via REST API");
        error = null;
      } catch (restError) {
        console.error("REST API upload failed:", restError);
        error = restError;
      }
    }

    if (error) {
      console.error("Supabase storage upload error:", error);
      throw error;
    }

    console.log("Upload successful:", data);

    // Get the public URL for the image
    const {
      data: { publicUrl: imageUrl },
    } = supabase.storage.from("pool-images").getPublicUrl(filePath);

    // Generate and upload metadata JSON
    const metadata = {
      name: tierName,
      description: `${tierName} Tier NFT`,
      image: imageUrl,
      tier: tierName,
      attributes: [
        {
          trait_type: "Tier",
          value: tierName,
        },
      ],
    };

    const metadataFileName = `${Math.random()
      .toString(36)
      .substring(2)}_${Date.now()}_metadata.json`;
    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: "application/json",
    });
    const metadataFile = new File([metadataBlob], metadataFileName, {
      type: "application/json",
    });

    // Try standard upload for metadata
    let metadataData;
    let metadataError;

    try {
      const result = await supabase.storage
        .from("pool-images")
        .upload(metadataFileName, metadataFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: "application/json",
        });

      metadataData = result.data;
      metadataError = result.error;
    } catch (uploadError) {
      console.error("Initial metadata upload attempt failed:", uploadError);
      metadataError = uploadError;
    }

    // If there's an error, try the fallback approach
    if (
      metadataError &&
      typeof metadataError === "object" &&
      "message" in metadataError &&
      typeof metadataError.message === "string" &&
      (metadataError.message.includes("security policy") ||
        metadataError.message.includes("permission denied") ||
        metadataError.message.includes("invalid algorithm"))
    ) {
      console.log(
        "RLS policy error on metadata, trying alternative approach..."
      );

      // Create a FormData object for metadata
      const metadataForm = new FormData();
      metadataForm.append("file", metadataFile);

      // Use fetch API to upload directly to Supabase Storage REST API
      try {
        // Get authentication token from user session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error("No authentication token available");
        }

        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/pool-images/${metadataFileName}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: metadataForm,
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(
            `Metadata upload failed: ${JSON.stringify(errorData)}`
          );
        }

        console.log("Metadata upload successful via REST API");
        metadataError = null;
      } catch (restError) {
        console.error("REST API metadata upload failed:", restError);
        metadataError = restError;
      }
    }

    if (metadataError) {
      console.error("Failed to upload metadata:", metadataError);
      return { imageUrl, metadataUrl: null };
    }

    // Get the public URL for the metadata
    const {
      data: { publicUrl: metadataUrl },
    } = supabase.storage.from("pool-images").getPublicUrl(metadataFileName);

    console.log("Generated metadata URL:", metadataUrl);
    return { imageUrl, metadataUrl };
  } catch (error: any) {
    console.error("Error uploading tier image:", error);

    let errorMessage = "Failed to upload tier image. Please try again.";
    if (error?.message) {
      errorMessage += ` Error: ${error.message}`;
    }

    alert(errorMessage);
    return { imageUrl: null, metadataUrl: null };
  } finally {
    if (setIsUploadingImage) setIsUploadingImage(false);
  }
}
