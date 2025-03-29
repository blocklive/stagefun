import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { testService, TestEntry } from "@/lib/services/test-service";
import { useAuthToken } from "@/lib/auth/client";

export type { TestEntry } from "@/lib/services/test-service";

export function useTestEntries() {
  const privy = usePrivy();
  const { token, loading: isTokenLoading } = useAuthToken();
  const [entries, setEntries] = useState<TestEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = !!token && privy.authenticated;

  // Fetch all test entries
  const fetchEntries = useCallback(async () => {
    if (!isAuthenticated || !privy.user) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await testService.getEntries();
      setEntries(data);
    } catch (error) {
      console.error("Error fetching test entries:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch test entries"
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, privy.user]);

  // Create a new test entry
  const createEntry = useCallback(
    async (size: string) => {
      if (!isAuthenticated || !privy.user) {
        setError("You must be authenticated to create a test entry");
        return null;
      }

      try {
        setError(null);

        const newEntry = await testService.createEntry(size);

        // Update the local entries state
        setEntries((prev) => [...prev, newEntry]);

        return newEntry;
      } catch (error) {
        console.error("Error creating test entry:", error);
        setError(
          error instanceof Error ? error.message : "Failed to create test entry"
        );
        return null;
      }
    },
    [isAuthenticated, privy.user]
  );

  // Update a test entry
  const updateEntry = useCallback(
    async (id: string, size: string) => {
      if (!isAuthenticated || !privy.user) {
        setError("You must be authenticated to update a test entry");
        return null;
      }

      try {
        setError(null);

        const updatedEntry = await testService.updateEntry(id, size);

        // Update the local entries state
        setEntries((prev) =>
          prev.map((entry) => (entry.id === id ? updatedEntry : entry))
        );

        return updatedEntry;
      } catch (error) {
        console.error("Error updating test entry:", error);
        setError(
          error instanceof Error ? error.message : "Failed to update test entry"
        );
        return null;
      }
    },
    [isAuthenticated, privy.user]
  );

  // Delete a test entry
  const deleteEntry = useCallback(
    async (id: string) => {
      if (!isAuthenticated || !privy.user) {
        setError("You must be authenticated to delete a test entry");
        return false;
      }

      try {
        setError(null);

        await testService.deleteEntry(id);

        // Update the local entries state
        setEntries((prev) => prev.filter((entry) => entry.id !== id));

        return true;
      } catch (error) {
        console.error("Error deleting test entry:", error);
        setError(
          error instanceof Error ? error.message : "Failed to delete test entry"
        );
        return false;
      }
    },
    [isAuthenticated, privy.user]
  );

  // Fetch debug information
  const fetchDebugInfo = useCallback(async () => {
    if (!isAuthenticated || !privy.user) {
      return null;
    }

    try {
      return await testService.getDebugInfo();
    } catch (error) {
      console.error("Error fetching debug info:", error);
      return { error: "Failed to fetch debug info" };
    }
  }, [isAuthenticated, privy.user]);

  // Fetch entries when authenticated
  useEffect(() => {
    if (!isTokenLoading && isAuthenticated) {
      fetchEntries();
    }
  }, [isTokenLoading, isAuthenticated, fetchEntries]);

  return {
    entries,
    isLoading: isLoading || isTokenLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    refreshEntries: fetchEntries,
    fetchDebugInfo,
  };
}
