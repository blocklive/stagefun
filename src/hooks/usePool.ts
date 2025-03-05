import { useState, useEffect } from "react";
import { poolService, PoolWithDetails } from "@/lib/services/pool-service";

export function usePool(poolId: string) {
  const [pool, setPool] = useState<PoolWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadPool() {
      try {
        setIsLoading(true);
        const data = await poolService.getPool(poolId);
        setPool(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load pool"));
      } finally {
        setIsLoading(false);
      }
    }

    if (poolId) {
      loadPool();
    }
  }, [poolId]);

  const refreshPool = async () => {
    try {
      const data = await poolService.getPool(poolId);
      setPool(data);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to refresh pool")
      );
    }
  };

  return { pool, isLoading, error, refreshPool };
}

export function usePools() {
  const [pools, setPools] = useState<PoolWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadPools() {
      try {
        setIsLoading(true);
        const data = await poolService.getAllPools();
        setPools(data);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load pools")
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadPools();
  }, []);

  return { pools, isLoading, error };
}
