"use client";

import React from "react";
import showToast from "@/utils/toast";

export default function ToastTestPage() {
  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Toast Test Page</h1>

      <div className="space-y-4">
        <button
          onClick={() => {
            const id = showToast.loading("Processing your request...");

            // Simulate a request completion after 2 seconds
            setTimeout(() => {
              showToast.success("Operation completed successfully!", { id });
            }, 2000);
          }}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Show Loading → Success Toast
        </button>

        <button
          onClick={() => showToast.success("Operation completed successfully!")}
          className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
        >
          Show Success Toast
        </button>

        <button
          onClick={() =>
            showToast.error("An error occurred during the operation.")
          }
          className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors"
        >
          Show Error Toast
        </button>

        <button
          onClick={() => {
            const id = showToast.loading("Approving USDC...");

            setTimeout(() => {
              showToast.loading("Waiting for transaction confirmation...", {
                id,
              });

              setTimeout(() => {
                showToast.success("Transaction confirmed!", { id });
              }, 2000);
            }, 2000);
          }}
          className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Simulate Transaction Flow
        </button>
      </div>
    </div>
  );
}
