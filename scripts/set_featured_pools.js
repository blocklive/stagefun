// This script sets featured flags on some pools for testing
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setFeaturedPools() {
  try {
    // Get some recent pools to set as featured
    const { data: pools, error } = await supabase
      .from("pools")
      .select("id, name, image_url")
      .eq("display_public", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    if (!pools || pools.length === 0) {
      console.log("No pools found to set as featured");
      return;
    }

    console.log(`Found ${pools.length} pools to set as featured:`);

    // Update each pool with a featured value (1, 2, 3, etc.)
    for (let i = 0; i < pools.length; i++) {
      const pool = pools[i];
      const featuredValue = i + 1;

      const { error: updateError } = await supabase
        .from("pools")
        .update({ featured: featuredValue })
        .eq("id", pool.id);

      if (updateError) {
        console.error(`Error updating pool ${pool.id}:`, updateError);
        continue;
      }

      console.log(
        `Set pool "${pool.name}" (${pool.id}) as featured #${featuredValue}`
      );
    }

    console.log("Finished setting featured pools");
  } catch (err) {
    console.error("Error setting featured pools:", err);
  }
}

// Run the script
setFeaturedPools();
