import { getAuthHeaders } from "@/lib/auth/client";

export interface TestEntry {
  id: string;
  user_id: string;
  size: string;
  created_at: string;
  updated_at: string;
}

/**
 * API client for test entries
 */
export class TestService {
  private apiUrl = "/api/test";

  /**
   * Get all test entries for the current user
   */
  async getEntries(): Promise<TestEntry[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(this.apiUrl, { headers });

      if (!response.ok) {
        throw new Error(`Error fetching test entries: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error("Failed to fetch test entries:", error);
      throw error;
    }
  }

  /**
   * Create a new test entry
   */
  async createEntry(size: string): Promise<TestEntry> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ size }),
      });

      if (!response.ok) {
        throw new Error(`Error creating test entry: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Failed to create test entry:", error);
      throw error;
    }
  }

  /**
   * Update a test entry
   */
  async updateEntry(id: string, size: string): Promise<TestEntry> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ size }),
      });

      if (!response.ok) {
        throw new Error(`Error updating test entry: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("Failed to update test entry:", error);
      throw error;
    }
  }

  /**
   * Delete a test entry
   */
  async deleteEntry(id: string): Promise<void> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${this.apiUrl}/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Error deleting test entry: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to delete test entry:", error);
      throw error;
    }
  }

  /**
   * Get debug information about the current authentication
   */
  async getDebugInfo(): Promise<any> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${this.apiUrl}/debug`, { headers });

      if (!response.ok) {
        throw new Error(`Error fetching debug info: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error("Failed to fetch debug info:", error);
      throw error;
    }
  }
}

// Create a singleton instance
export const testService = new TestService();
