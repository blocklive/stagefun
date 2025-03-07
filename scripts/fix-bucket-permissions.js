const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBucketPermissions() {
  try {
    console.log("Checking if bucket exists...");

    // List all buckets to check if pool-images exists
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      throw bucketsError;
    }

    const poolImagesBucket = buckets.find(
      (bucket) => bucket.name === "pool-images"
    );

    if (!poolImagesBucket) {
      console.log("Bucket does not exist, creating it...");
      const { data: newBucket, error: createError } =
        await supabase.storage.createBucket("pool-images", {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });

      if (createError) {
        throw createError;
      }

      console.log("Bucket created successfully:", newBucket);
    } else {
      console.log("Bucket already exists, updating settings...");

      // Update bucket to ensure it's public
      const { error: updateError } = await supabase.storage.updateBucket(
        "pool-images",
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

    console.log("\nBucket permissions setup complete!");
    console.log(
      "\nIMPORTANT: You need to manually set the following policies in the Supabase dashboard:"
    );
    console.log("1. Go to Storage > Policies in your Supabase dashboard");
    console.log('2. For the "pool-images" bucket, add these policies:');
    console.log("   - SELECT: Allow public access (bucket_id = 'pool-images')");
    console.log(
      "   - INSERT: Allow authenticated users (bucket_id = 'pool-images' AND auth.role() IN ('authenticated', 'anon'))"
    );
    console.log(
      "   - UPDATE: Allow authenticated users (bucket_id = 'pool-images' AND auth.role() IN ('authenticated', 'anon'))"
    );
    console.log(
      "   - DELETE: Allow authenticated users (bucket_id = 'pool-images' AND auth.role() IN ('authenticated', 'anon'))"
    );

    // Test upload to verify permissions
    console.log("\nTesting upload permissions...");
    const testFile = Buffer.from("Test file content");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("pool-images")
      .upload("test-permissions.txt", testFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Test upload failed:", uploadError);
      console.log(
        "This indicates there may be permission issues with the bucket."
      );
    } else {
      console.log("Test upload successful!");

      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from("pool-images")
        .remove(["test-permissions.txt"]);

      if (deleteError) {
        console.log("Could not delete test file:", deleteError);
      } else {
        console.log("Test file deleted successfully");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

fixBucketPermissions();
