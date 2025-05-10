"use client";

import { useAlphaMode } from "@/hooks/useAlphaMode";
import React, { Suspense, ReactNode } from "react";

// Component that checks alpha mode and renders children accordingly
function AlphaModeChecker({
  children,
  alphaContent,
}: {
  children: ReactNode;
  alphaContent: ReactNode;
}) {
  const isAlphaMode = useAlphaMode();
  return isAlphaMode ? alphaContent : children;
}

// Exported component that wraps the checker in Suspense
export function AlphaModeWrapper({
  children,
  alphaContent,
}: {
  children: ReactNode;
  alphaContent: ReactNode;
}) {
  return (
    <Suspense fallback={<div className="h-8 w-full animate-pulse"></div>}>
      <AlphaModeChecker alphaContent={alphaContent}>
        {children}
      </AlphaModeChecker>
    </Suspense>
  );
}
