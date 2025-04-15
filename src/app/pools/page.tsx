"use client";

import { usePrivy } from "@privy-io/react-auth";
import PoolsListPage from "../components/PoolsListPage";

export default function PoolsPage() {
  const { authenticated } = usePrivy();

  return (
    <div className="bg-[#15161A] min-h-screen text-white pb-6">
      {/* Main Content */}
      <PoolsListPage />
    </div>
  );
}
