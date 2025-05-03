import React from "react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export function RemoveLiquidityForm() {
  return (
    <div className="p-4 text-center">
      <p className="text-gray-400 mb-6">
        To remove liquidity, please select your LP position from the Positions
        tab.
      </p>

      <PrimaryButton
        onClick={() => (window.location.href = "/positions")}
        fullWidth
      >
        Go to Positions
      </PrimaryButton>
    </div>
  );
}
