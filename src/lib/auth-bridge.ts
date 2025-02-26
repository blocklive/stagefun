import { supabase } from "./supabase";

/**
 * A simplified function that just returns true since we're not using Supabase auth
 */
export async function signInWithPrivy(privyUser: any): Promise<boolean> {
  // We're not using Supabase auth, so just return true
  return true;
}

/**
 * Gets the current user (always returns null since we're not using Supabase auth)
 */
export async function getCurrentUser() {
  // We're not using Supabase auth, so return null
  return null;
}
