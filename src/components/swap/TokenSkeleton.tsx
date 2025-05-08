import React from "react";

export function TokenSkeleton() {
  return (
    <div className="flex items-center animate-pulse">
      <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
      <div className="ml-2 h-5 w-12 bg-gray-700 rounded"></div>
    </div>
  );
}
