import { createClient } from "@supabase/supabase-js";

let supabaseAdmin: ReturnType<typeof createClient>;

/**
 * Gets a Supabase admin client with full access to the database
 */
export const getSupabaseAdmin = () => {
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return supabaseAdmin;
};
