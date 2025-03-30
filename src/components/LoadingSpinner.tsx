"use client";

import React from "react";

export const LoadingSpinner: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = "#836EF9",
}) => {
  return (
    <div className="loading-spinner-wrapper">
      <style jsx>{`
        .loading-spinner-wrapper {
          position: relative;
          width: ${size}px;
          height: ${size}px;
        }
        .spinner {
          box-sizing: border-box;
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          border: 2px solid transparent;
          border-top-color: ${color};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
      <div className="spinner"></div>
    </div>
  );
};
