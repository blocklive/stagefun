"use client";

import { usePools } from "@/hooks/usePool";
import { PoolsList } from "@/components/pools/PoolsList";
import Link from "next/link";

export default function PoolsPage() {
  const { pools, isLoading, error } = usePools();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading pools: {error.message}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Pools</h1>
        <Link
          href="/pools/create"
          className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
        >
          Create Pool
        </Link>
      </div>
      <PoolsList pools={pools} />
    </div>
  );
}
