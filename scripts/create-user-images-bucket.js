const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUserImagesBucket() {
  try {
    console.log("Creating user-images bucket...");

    // Create the bucket
    const { data: bucket, error: bucketError } =
      await supabase.storage.createBucket("user-images", {
        public: true,
        fileSizeLimit: 52428800, // 50MB in bytes
      });

    if (bucketError) {
      if (bucketError.message.includes("already exists")) {
        console.log("Bucket already exists");
      } else {
        throw bucketError;
      }
    } else {
      console.log("Bucket created successfully:", bucket);
    }

    console.log(
      "\nIMPORTANT: You need to manually set the following policies in the Supabase dashboard:"
    );
    console.log("1. Go to Storage > Policies in your Supabase dashboard");
    console.log('2. For the "user-images" bucket, add these policies:');
    console.log("   - SELECT: Allow public access (bucket_id = 'user-images')");
    console.log("   - INSERT: Allow public access (bucket_id = 'user-images')");
    console.log("   - UPDATE: Allow public access (bucket_id = 'user-images')");
    console.log("   - DELETE: Allow public access (bucket_id = 'user-images')");

    // Test upload to verify permissions
    console.log("\nTesting upload permissions...");
    const testFile = Buffer.from("Test file content");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("user-images")
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
        .from("user-images")
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

createUserImagesBucket();
