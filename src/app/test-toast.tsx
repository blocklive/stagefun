"use client";

import React from "react";
import showToast from "@/utils/toast";

export default function TestToast() {
  const handleLoadingToast = () => {
    const id = showToast.loading("Loading something...");
    setTimeout(() => {
      showToast.success("Successfully loaded!", { id });
    }, 2000);
  };

  const handleSuccessToast = () => {
    showToast.success("This is a success message!");
  };

  const handleErrorToast = () => {
    showToast.error("This is an error message!");
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Toast Test Page</h1>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleLoadingToast}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Show Loading Toast
        </button>
        <button
          onClick={handleSuccessToast}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Show Success Toast
        </button>
        <button
          onClick={handleErrorToast}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Show Error Toast
        </button>
      </div>
    </div>
  );
}
