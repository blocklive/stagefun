import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TransformedPool } from "../../../hooks/useUserFundedPools";

interface PoolListProps {
  pools: TransformedPool[];
  isLoading: boolean;
  error: Error | null;
  isUsingCache?: boolean;
  emptyMessage: string;
  getPoolStatus: (pool: TransformedPool) => {
    text: string;
    colorClass: string;
  };
  isOwnProfile?: boolean;
  profileName?: string;
}

export default function PoolList({
  pools,
  isLoading,
  error,
  isUsingCache = false,
  emptyMessage,
  getPoolStatus,
  isOwnProfile = true,
  profileName = "User",
}: PoolListProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div
          className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
          style={{ borderColor: "#836EF9" }}
        ></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p>Error loading pools. Please try again.</p>
        {isUsingCache && (
          <p className="text-sm mt-1">Using cached data if available.</p>
        )}
      </div>
    );
  }

  if (pools.length === 0) {
    return <div className="text-center py-8 text-gray-400">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-4">
      {pools.map((pool) => (
        <div
          key={pool.id}
          className="bg-[#FFFFFF0A] rounded-xl overflow-hidden cursor-pointer hover:bg-[#2A2640] transition-colors p-4"
          onClick={() => router.push(`/pools/${pool.id}`)}
        >
          <div className="flex items-center">
            <div
              className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: "#2A2640" }}
            >
              {pool.image_url ? (
                <Image
                  src={pool.image_url}
                  alt={pool.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized={true}
                />
              ) : null}
            </div>
            <div className="ml-4 flex-1">
              <h3 className="font-bold">{pool.name}</h3>
              <div className="flex items-center text-sm">
                <span className={`text-gray-400 flex items-center`}>
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      getPoolStatus(pool).colorClass
                    }`}
                  ></span>
                  {getPoolStatus(pool).text}
                </span>
              </div>
            </div>
            {pool.commitment_amount && (
              <div className="text-right">
                <span className="text-purple-400 font-semibold">
                  {pool.commitment_amount.toFixed(2)} USDC
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
