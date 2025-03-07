const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

// Create a Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserImagesRLS() {
  try {
    console.log("Reading SQL migration file...");
    const sqlContent = fs.readFileSync(
      "supabase/migrations/20240320000003_fix_user_images_rls.sql",
      "utf8"
    );

    console.log("Executing SQL to fix RLS policies...");

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    // Execute each statement
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc("exec_sql", { sql: statement });

        if (error) {
          console.error(`Error executing SQL statement: ${statement}`);
          console.error(error);
        }
      } catch (err) {
        console.error(`Error executing SQL statement: ${statement}`);
        console.error(err);
      }
    }

    console.log("SQL execution completed. Checking bucket status...");

    // Check if the bucket exists
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();

    if (bucketsError) {
      throw bucketsError;
    }

    const userImagesBucket = buckets.find(
      (bucket) => bucket.name === "user-images"
    );

    if (!userImagesBucket) {
      console.log("Bucket does not exist, creating it...");
      const { data: newBucket, error: createError } =
        await supabase.storage.createBucket("user-images", {
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
        "This indicates there may still be permission issues with the bucket."
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

    console.log("\nIMPORTANT: If you continue to have issues, please:");
    console.log("1. Go to the Supabase dashboard");
    console.log("2. Navigate to Storage > Policies");
    console.log(
      '3. Make sure the "user-images" bucket has public access policies'
    );
    console.log("4. If not, manually add the policies to allow public access");
  } catch (error) {
    console.error("Error:", error);
  }
}

fixUserImagesRLS();
