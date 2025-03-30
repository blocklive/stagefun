"use client";

import React from "react";
import { Toaster } from "react-hot-toast";
import { toasterOptions } from "@/utils/toast";

// Custom Toaster component to ensure client-side rendering
export default function CustomToaster() {
  return (
    <Toaster
      position={toasterOptions.position}
      toastOptions={toasterOptions.toastOptions}
    />
  );
}
