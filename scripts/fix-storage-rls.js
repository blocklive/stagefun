const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

// Create a Supabase client with the service role key
// This has admin privileges and can bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStorageRLS() {
  try {
    console.log("Checking storage bucket...");

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

    // Now we need to execute SQL to fix the RLS policies
    console.log("Updating RLS policies...");

    // Execute SQL to disable RLS for storage.objects temporarily
    const { error: disableRlsError } = await supabase.rpc(
      "disable_storage_rls"
    );

    if (disableRlsError) {
      console.error("Error disabling RLS:", disableRlsError);
      console.log("Attempting to execute SQL directly...");

      // Try direct SQL execution
      const { error: sqlError } = await supabase
        .from("_exec_sql")
        .select("*")
        .eq(
          "query",
          `
        -- Disable RLS for storage.objects
        ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view pool images" ON storage.objects;
        DROP POLICY IF EXISTS "Authenticated users can upload pool images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update their own pool images" ON storage.objects;
        DROP POLICY IF EXISTS "Users can delete their own pool images" ON storage.objects;
        
        -- Create new policies
        CREATE POLICY "Anyone can view pool images"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'pool-images');
        
        CREATE POLICY "Anyone can upload pool images"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'pool-images');
        
        CREATE POLICY "Anyone can update pool images"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'pool-images');
        
        CREATE POLICY "Anyone can delete pool images"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'pool-images');
        
        -- Re-enable RLS
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      `
        );

      if (sqlError) {
        console.error("Error executing SQL:", sqlError);
        console.log(
          "Please manually update the RLS policies in the Supabase dashboard:"
        );
        console.log("1. Go to Storage > Policies in your Supabase dashboard");
        console.log('2. For the "pool-images" bucket, add these policies:');
        console.log(
          "   - SELECT: Allow public access (bucket_id = 'pool-images')"
        );
        console.log(
          "   - INSERT: Allow public access (bucket_id = 'pool-images')"
        );
        console.log(
          "   - UPDATE: Allow public access (bucket_id = 'pool-images')"
        );
        console.log(
          "   - DELETE: Allow public access (bucket_id = 'pool-images')"
        );
      } else {
        console.log("SQL executed successfully");
      }
    } else {
      console.log("RLS disabled successfully");
    }

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
        "This indicates there may still be permission issues with the bucket."
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

    console.log("\nIMPORTANT: If you continue to have issues, please:");
    console.log("1. Go to the Supabase dashboard");
    console.log("2. Navigate to Storage > Policies");
    console.log(
      '3. Make sure the "pool-images" bucket has public access policies'
    );
    console.log("4. If not, manually add the policies to allow public access");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Create a custom RPC function to disable RLS
async function createDisableRlsFunction() {
  try {
    console.log("Creating RPC function to disable RLS...");

    const { error } = await supabase.rpc("create_disable_rls_function", {
      sql: `
        CREATE OR REPLACE FUNCTION disable_storage_rls()
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          -- Disable RLS for storage.objects
          ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
          
          -- Drop existing policies
          DROP POLICY IF EXISTS "Anyone can view pool images" ON storage.objects;
          DROP POLICY IF EXISTS "Authenticated users can upload pool images" ON storage.objects;
          DROP POLICY IF EXISTS "Users can update their own pool images" ON storage.objects;
          DROP POLICY IF EXISTS "Users can delete their own pool images" ON storage.objects;
          
          -- Create new policies
          CREATE POLICY "Anyone can view pool images"
          ON storage.objects FOR SELECT
          USING (bucket_id = 'pool-images');
          
          CREATE POLICY "Anyone can upload pool images"
          ON storage.objects FOR INSERT
          WITH CHECK (bucket_id = 'pool-images');
          
          CREATE POLICY "Anyone can update pool images"
          ON storage.objects FOR UPDATE
          USING (bucket_id = 'pool-images');
          
          CREATE POLICY "Anyone can delete pool images"
          ON storage.objects FOR DELETE
          USING (bucket_id = 'pool-images');
          
          -- Re-enable RLS
          ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
        END;
        $$;
      `,
    });

    if (error) {
      console.error("Error creating RPC function:", error);
      return false;
    }

    console.log("RPC function created successfully");
    return true;
  } catch (error) {
    console.error("Error creating RPC function:", error);
    return false;
  }
}

async function run() {
  const success = await createDisableRlsFunction();
  if (success) {
    await fixStorageRLS();
  } else {
    console.log("Proceeding without RPC function...");
    await fixStorageRLS();
  }
}

run();
