"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/contexts/SupabaseContext";
import { getPoolById, updatePool } from "@/lib/services/pool-service";

export default function EditPoolPage({ params }: { params: { id: string } }) {
  const { dbUser } = useSupabase();
  const router = useRouter();
  const [pool, setPool] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPool() {
      try {
        const poolData = await getPoolById(params.id);
        setPool(poolData);
        setIsLoading(false);

        // Application-level access control
        if (poolData && dbUser && poolData.creator_id !== dbUser.id) {
          console.error("Unauthorized: You can only edit your own pools");
          router.push(`/pools/${params.id}`);
        }
      } catch (error) {
        console.error("Error fetching pool:", error);
        setIsLoading(false);
      }
    }

    if (dbUser) {
      fetchPool();
    }
  }, [params.id, dbUser, router]);

  // Rest of the component...
}
