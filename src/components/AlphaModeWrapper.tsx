"use client";

import { useAlphaMode } from "@/hooks/useAlphaMode";
import React, { ReactNode } from "react";

/**
 * Component that conditionally renders alpha content based on user's alpha mode setting.
 * Uses SWR under the hood via the useAlphaMode hook for fast cached access.
 */
export function AlphaModeWrapper({
  children,
  alphaContent,
}: {
  children: ReactNode;
  alphaContent: ReactNode;
}) {
  const { isAlphaMode } = useAlphaMode();

  // Render alpha content if alpha mode is enabled, otherwise render children
  return isAlphaMode ? alphaContent : children;
}
