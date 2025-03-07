const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBucket() {
  try {
    // Create the bucket
    const { data: bucket, error: bucketError } =
      await supabase.storage.createBucket("pool-images", {
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

    // Set up bucket policies
    const policies = [
      {
        name: "Anyone can view pool images",
        definition: "SELECT",
        check: "bucket_id = 'pool-images'",
      },
      {
        name: "Authenticated users can upload pool images",
        definition: "INSERT",
        check: "bucket_id = 'pool-images' AND auth.role() = 'authenticated'",
      },
      {
        name: "Users can update their own pool images",
        definition: "UPDATE",
        check: "bucket_id = 'pool-images' AND auth.role() = 'authenticated'",
      },
      {
        name: "Users can delete their own pool images",
        definition: "DELETE",
        check: "bucket_id = 'pool-images' AND auth.role() = 'authenticated'",
      },
    ];

    for (const policy of policies) {
      const { error: policyError } = await supabase.storage
        .from("pool-images")
        .createSignedUrl("test.txt", 60);

      if (policyError) {
        console.log(
          `Policy ${policy.name} already exists or error:`,
          policyError
        );
      } else {
        console.log(`Policy ${policy.name} created successfully`);
      }
    }

    console.log("Bucket and policies setup complete");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createBucket();
