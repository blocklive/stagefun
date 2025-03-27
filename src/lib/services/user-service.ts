import { supabase, User } from "../supabase";

export async function createOrUpdateUser(
  userData: Partial<User>
): Promise<User> {
  try {
    console.log("Creating or updating user with data:", userData);

    // Use the standard client for user operations since we might not have
    // an authenticated client yet during initial user creation
    const { data, error } = await supabase
      .from("users")
      .upsert(userData)
      .select()
      .single();

    if (error) {
      console.error("Error creating/updating user:", error);
      throw error;
    }

    console.log("User created/updated successfully:", data);
    return data as User;
  } catch (error) {
    console.error("Error in createOrUpdateUser:", error);
    throw error;
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned (user not found)
        return null;
      }
      console.error("Supabase error:", error);
      throw error;
    }

    return data as User;
  } catch (error) {
    console.error("Error in getUserById:", error);
    throw error;
  }
}

export async function getUserByWalletAddress(
  walletAddress: string
): Promise<User | null> {
  console.log("Getting user by wallet address:", walletAddress);

  try {
    // First check for embedded wallet match
    const { data: embeddedData, error: embeddedError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single();

    if (!embeddedError) {
      return embeddedData as User;
    }

    if (embeddedError && embeddedError.code !== "PGRST116") {
      console.error("Supabase error checking embedded wallet:", embeddedError);
      throw embeddedError;
    }

    // Then check for smart wallet match
    const { data: smartData, error: smartError } = await supabase
      .from("users")
      .select("*")
      .eq("smart_wallet_address", walletAddress)
      .single();

    if (smartError) {
      if (smartError.code === "PGRST116") {
        // No rows returned (user not found with either wallet type)
        console.log("User not found with any wallet address:", walletAddress);
        return null;
      }
      console.error("Supabase error checking smart wallet:", smartError);
      throw smartError;
    }

    return smartData as User;
  } catch (error) {
    console.error("Error in getUserByWalletAddress:", error);
    throw error;
  }
}

export async function getUserBySmartWalletAddress(
  smartWalletAddress: string
): Promise<User | null> {
  console.log("Getting user by smart wallet address:", smartWalletAddress);

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("smart_wallet_address", smartWalletAddress)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned (user not found)
        console.log(
          "User not found with smart wallet address:",
          smartWalletAddress
        );
        return null;
      }
      console.error("Supabase error:", error);
      throw error;
    }

    return data as User;
  } catch (error) {
    console.error("Error in getUserBySmartWalletAddress:", error);
    throw error;
  }
}
