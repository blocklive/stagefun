import React from "react";

export function BalanceSkeleton() {
  return (
    <div className="flex items-center">
      <span className="mr-1">Balance:</span>
      <div className="h-4 w-12 bg-gray-700 rounded animate-pulse"></div>
    </div>
  );
}
