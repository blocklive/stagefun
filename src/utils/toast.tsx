"use client";

import { toast, ToastOptions, ToastPosition } from "react-hot-toast";
import React from "react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FaCheck } from "react-icons/fa";

// Base toast style object to be used for all toast types
const baseToastStyle: ToastOptions = {
  style: {
    background: "#1C1C1E", // Dark background
    color: "#CCCCCC", // Slightly greyed out text
    padding: "16px", // More padding than default
    borderRadius: "12px", // Rounded corners
    border: "1px solid #2C2C2E", // Subtle border
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)", // Subtle shadow
    maxWidth: "350px", // Wider toast
    fontSize: "14px", // Slightly larger font
  },
  duration: 4000, // 4 seconds by default
  position: "bottom-right" as ToastPosition,
};

// Loading toast style (with custom spinner)
const loadingToastStyle: ToastOptions = {
  ...baseToastStyle,
  duration: Infinity, // Loading toasts stay until dismissed
  style: {
    ...baseToastStyle.style,
    display: "flex",
    alignItems: "center",
    background: "#1C1C1E",
    padding: "16px",
  },
  icon: undefined, // We'll use the custom renderer below
};

// Success toast style
const successToastStyle: ToastOptions = {
  ...baseToastStyle,
  style: {
    ...baseToastStyle.style,
    background: "#0F2417", // Darker green
    borderLeft: "4px solid #10B981", // Green accent
  },
  icon: "✓",
};

// Error toast style
const errorToastStyle: ToastOptions = {
  ...baseToastStyle,
  style: {
    ...baseToastStyle.style,
    background: "#2D1A1A", // Darker red
    borderLeft: "4px solid #EF4444", // Red accent
  },
  icon: "❌",
};

// Info toast style
const infoToastStyle: ToastOptions = {
  ...baseToastStyle,
  style: {
    ...baseToastStyle.style,
    background: "#1A2235", // Darker blue
    borderLeft: "4px solid #3B82F6", // Blue accent
  },
  icon: "ℹ️",
};

// Custom loading toast with spinner
const customLoadingToast = (message: string, options?: ToastOptions) => {
  return toast.custom(
    (t) => (
      <div
        className={`${t.visible ? "animate-enter" : "animate-leave"}`}
        style={{
          ...baseToastStyle.style,
          display: "flex",
          alignItems: "center",
          background: "#1C1C1E",
          padding: "16px",
        }}
      >
        <LoadingSpinner color="#836EF9" size={20} />
        <span style={{ marginLeft: "12px" }}>{message}</span>
      </div>
    ),
    {
      id: options?.id,
      duration: Infinity,
      position: "bottom-right",
    }
  );
};

// Custom success toast with clean checkmark icon
const customSuccessToast = (message: string, options?: ToastOptions) => {
  return toast.custom(
    (t) => (
      <div
        className={`${t.visible ? "animate-enter" : "animate-leave"}`}
        style={{
          ...baseToastStyle.style,
          display: "flex",
          alignItems: "center",
          background: "#0F2417",
          borderLeft: "4px solid #10B981",
          padding: "16px",
        }}
      >
        <FaCheck color="#10B981" size={16} />
        <span style={{ marginLeft: "12px" }}>{message}</span>
      </div>
    ),
    {
      id: options?.id,
      duration: 4000,
      position: "bottom-right",
    }
  );
};

// Custom toast functions to use the styled versions
export const showToast = {
  loading: (message: string, options?: ToastOptions) =>
    customLoadingToast(message, options),

  success: (message: string, options?: ToastOptions) =>
    customSuccessToast(message, options),

  error: (message: string, options?: ToastOptions) =>
    toast.error(message, {
      ...errorToastStyle,
      ...options,
    }),

  info: (message: string, options?: ToastOptions) =>
    toast(message, {
      ...infoToastStyle,
      ...options,
    }),

  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  remove: (toastId?: string) => {
    if (toastId) {
      toast.remove(toastId);
    } else {
      toast.remove();
    }
  },
};

// ToastOptions for the Toaster component
export const toasterOptions = {
  position: "bottom-right" as ToastPosition,
  toastOptions: {
    // Global options for all toasts
    className: "",
    style: {
      background: "#1C1C1E",
      color: "#CCCCCC", // Slightly greyed out text
    },
    // Customize specific toast types
    success: {
      style: successToastStyle.style,
      icon: "✓",
    },
    error: {
      style: errorToastStyle.style,
      icon: "❌",
    },
  },
};

export default showToast;
