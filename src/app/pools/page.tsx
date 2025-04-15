"use client";

import { usePrivy } from "@privy-io/react-auth";
import PoolsListPage from "../components/PoolsListPage";

export default function PoolsPage() {
  const { authenticated } = usePrivy();

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-125px)]">
      <PoolsListPage />
    </div>
  );
}
