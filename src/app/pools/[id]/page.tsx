"use client";

import { useState } from "react";
import { usePool } from "@/hooks/usePool";
import { usePoolInteraction } from "@/hooks/usePoolInteraction";
import { PoolDetailsView } from "@/components/pools/PoolDetailsView";
import { DepositForm } from "@/components/pools/DepositForm";

export default function PoolDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const {
    pool,
    isLoading: isLoadingPool,
    error: poolError,
    refreshPool,
  } = usePool(params.id);
  const {
    deposit,
    isLoading: isDepositing,
    error: depositError,
  } = usePoolInteraction();
  const [depositAmount, setDepositAmount] = useState("1");

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      await deposit(params.id, amount);
      await refreshPool();
      alert("Successfully deposited to the pool!");
    } catch (error: any) {
      console.error("Error during deposit:", error);
      alert(`Transaction failed: ${error.message || "Unknown error"}`);
    }
  };

  if (isLoadingPool) {
    return <div>Loading...</div>;
  }

  if (poolError || !pool) {
    return <div>Error loading pool: {poolError?.message}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PoolDetailsView pool={pool} />
      <DepositForm
        amount={depositAmount}
        onAmountChange={setDepositAmount}
        onSubmit={handleDeposit}
        isLoading={isDepositing}
        error={depositError}
      />
    </div>
  );
}
