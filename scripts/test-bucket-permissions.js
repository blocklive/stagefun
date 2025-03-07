const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const fetch = require("node-fetch");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

// Create Supabase clients
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testBucketPermissions() {
  try {
    console.log("Testing bucket permissions...");

    // Check if the bucket exists
    console.log("Checking if bucket exists...");
    const { data: buckets, error: bucketsError } =
      await supabaseAdmin.storage.listBuckets();

    if (bucketsError) {
      throw bucketsError;
    }

    const userImagesBucket = buckets.find(
      (bucket) => bucket.name === "user-images"
    );

    if (!userImagesBucket) {
      console.log("Bucket does not exist, creating it...");
      const { data: newBucket, error: createError } =
        await supabaseAdmin.storage.createBucket("user-images", {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });

      if (createError) {
        throw createError;
      }

      console.log("Bucket created successfully:", newBucket);
    } else {
      console.log("Bucket exists:", userImagesBucket);

      // Update bucket to ensure it's public
      const { error: updateError } = await supabaseAdmin.storage.updateBucket(
        "user-images",
        {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        }
      );

      if (updateError) {
        throw updateError;
      }

      console.log("Bucket settings updated successfully");
    }

    // Test upload with admin client
    console.log("\nTesting upload with admin client...");
    const testFileAdmin = Buffer.from("Test file content - admin");
    const testFilePathAdmin = `test-admin-${Date.now()}.txt`;

    const { data: uploadDataAdmin, error: uploadErrorAdmin } =
      await supabaseAdmin.storage
        .from("user-images")
        .upload(testFilePathAdmin, testFileAdmin, {
          cacheControl: "3600",
          upsert: true,
        });

    if (uploadErrorAdmin) {
      console.error("Admin upload failed:", uploadErrorAdmin);
    } else {
      console.log("Admin upload successful:", uploadDataAdmin);

      // Get public URL
      const {
        data: { publicUrl: adminPublicUrl },
      } = supabaseAdmin.storage
        .from("user-images")
        .getPublicUrl(testFilePathAdmin);

      console.log("Admin public URL:", adminPublicUrl);

      // Clean up test file
      const { error: deleteErrorAdmin } = await supabaseAdmin.storage
        .from("user-images")
        .remove([testFilePathAdmin]);

      if (deleteErrorAdmin) {
        console.log("Could not delete admin test file:", deleteErrorAdmin);
      } else {
        console.log("Admin test file deleted successfully");
      }
    }

    // Test upload with anon client
    console.log("\nTesting upload with anon client...");
    const testFileAnon = Buffer.from("Test file content - anon");
    const testFilePathAnon = `test-anon-${Date.now()}.txt`;

    const { data: uploadDataAnon, error: uploadErrorAnon } =
      await supabaseAnon.storage
        .from("user-images")
        .upload(testFilePathAnon, testFileAnon, {
          cacheControl: "3600",
          upsert: true,
        });

    if (uploadErrorAnon) {
      console.error("Anon upload failed:", uploadErrorAnon);
      console.log(
        "This indicates there may be permission issues with the bucket."
      );

      // Try to fix the permissions
      console.log("\nAttempting to fix permissions...");

      // Create policies using admin client
      const policies = [
        {
          name: "Anyone can view user images",
          definition: "SELECT",
          roles: ["anon", "authenticated"],
          check: "bucket_id = 'user-images'",
        },
        {
          name: "Anyone can upload user images",
          definition: "INSERT",
          roles: ["anon", "authenticated"],
          check: "bucket_id = 'user-images'",
        },
        {
          name: "Anyone can update user images",
          definition: "UPDATE",
          roles: ["anon", "authenticated"],
          check: "bucket_id = 'user-images'",
        },
        {
          name: "Anyone can delete user images",
          definition: "DELETE",
          roles: ["anon", "authenticated"],
          check: "bucket_id = 'user-images'",
        },
      ];

      for (const policy of policies) {
        try {
          console.log(`Creating policy: ${policy.name}`);
          // Note: This is a simplified version as the actual API might differ
          // You may need to use SQL directly for this
        } catch (policyError) {
          console.error(`Error creating policy ${policy.name}:`, policyError);
        }
      }

      console.log(
        "\nPlease manually set the following policies in the Supabase dashboard:"
      );
      console.log("1. Go to Storage > Policies in your Supabase dashboard");
      console.log('2. For the "user-images" bucket, add these policies:');
      console.log(
        "   - SELECT: Allow public access (bucket_id = 'user-images')"
      );
      console.log(
        "   - INSERT: Allow public access (bucket_id = 'user-images')"
      );
      console.log(
        "   - UPDATE: Allow public access (bucket_id = 'user-images')"
      );
      console.log(
        "   - DELETE: Allow public access (bucket_id = 'user-images')"
      );
    } else {
      console.log("Anon upload successful:", uploadDataAnon);

      // Get public URL
      const {
        data: { publicUrl: anonPublicUrl },
      } = supabaseAnon.storage
        .from("user-images")
        .getPublicUrl(testFilePathAnon);

      console.log("Anon public URL:", anonPublicUrl);

      // Clean up test file
      const { error: deleteErrorAnon } = await supabaseAnon.storage
        .from("user-images")
        .remove([testFilePathAnon]);

      if (deleteErrorAnon) {
        console.log("Could not delete anon test file:", deleteErrorAnon);
      } else {
        console.log("Anon test file deleted successfully");
      }
    }

    // Test direct fetch upload
    console.log("\nTesting direct fetch upload...");
    const testFileFetch = Buffer.from("Test file content - fetch");
    const testFilePathFetch = `test-fetch-${Date.now()}.txt`;

    try {
      // Create form data for fetch
      const FormData = require("form-data");
      const form = new FormData();
      form.append("file", testFileFetch, {
        filename: testFilePathFetch,
        contentType: "text/plain",
      });

      const fetchResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/user-images/${testFilePathFetch}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseAnonKey}`,
            ...form.getHeaders(),
          },
          body: form,
        }
      );

      const responseText = await fetchResponse.text();

      if (!fetchResponse.ok) {
        console.error("Fetch upload failed:", responseText);
        console.log(
          "This indicates there may be issues with the direct fetch upload method."
        );
      } else {
        console.log("Fetch upload successful!", responseText);

        // Get public URL
        const fetchPublicUrl = `${supabaseUrl}/storage/v1/object/public/user-images/${testFilePathFetch}`;
        console.log("Fetch public URL:", fetchPublicUrl);

        // Clean up test file
        const { error: deleteErrorFetch } = await supabaseAdmin.storage
          .from("user-images")
          .remove([testFilePathFetch]);

        if (deleteErrorFetch) {
          console.log("Could not delete fetch test file:", deleteErrorFetch);
        } else {
          console.log("Fetch test file deleted successfully");
        }
      }
    } catch (fetchError) {
      console.error("Error with fetch upload:", fetchError);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

testBucketPermissions();
