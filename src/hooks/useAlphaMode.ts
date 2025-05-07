"use client";

import { useSearchParams } from "next/navigation";

export function useAlphaMode(): boolean {
  const searchParams = useSearchParams();
  return searchParams.get("stage_alpha") === "true";
}
