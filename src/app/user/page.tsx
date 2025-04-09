"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "../../contexts/SupabaseContext";

export default function UserHomePage() {
  const router = useRouter();
  const { dbUser, isLoadingUser } = useSupabase();

  useEffect(() => {
    if (!isLoadingUser) {
      if (dbUser?.username) {
        // Redirect to the user's own profile by username
        router.push(`/user/${dbUser.username}`);
      } else if (dbUser) {
        // Fallback to ID-based route if no username
        router.push(`/profile/${dbUser.id}`);
      } else {
        // Not logged in, redirect to home
        router.push("/");
      }
    }
  }, [dbUser, isLoadingUser, router]);

  return (
    <div className="flex items-center justify-center h-screen bg-[#121212]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  );
}
