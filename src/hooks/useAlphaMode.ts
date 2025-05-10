import { useSearchParams } from "next/navigation";

/**
 * Hook to check if alpha mode is enabled via the URL parameter "stage_alpha=true"
 * Returns false if searchParams are not available or the parameter is not set to "true"
 */
export function useAlphaMode(): boolean {
  const searchParams = useSearchParams();

  // If searchParams is null or undefined, return false
  if (!searchParams) {
    return false;
  }

  return searchParams.get("stage_alpha") === "true";
}
