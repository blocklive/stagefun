import React from "react";

interface Fee {
  fee: number;
  displayName: string;
  description: string;
}

interface FeeDisplayProps {
  fee: Fee;
}

export function FeeDisplay({ fee }: FeeDisplayProps) {
  return (
    <div className="mb-4">
      <label className="text-sm text-gray-400 block mb-2">Fee</label>
      <div className="w-full flex items-center bg-gray-800 p-3 rounded-lg border border-gray-700">
        <div className="flex-1">
          <div className="flex items-center">
            <span className="text-white font-medium mr-2">
              {fee.displayName}
            </span>
            <span className="bg-blue-900/40 text-blue-400 text-xs px-2 py-1 rounded border border-blue-800/40">
              Standard
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">{fee.description}</p>
        </div>
      </div>
    </div>
  );
}
