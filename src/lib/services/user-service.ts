import { supabase, User } from "../supabase";

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
  try {
    console.log("Getting user by wallet address:", walletAddress);

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned (user not found)
        console.log("No user found with wallet address:", walletAddress);
        return null;
      }
      console.error("Supabase error when getting user by wallet:", error);
      throw error;
    }

    console.log("Found user by wallet address:", data?.id);
    return data as User;
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
