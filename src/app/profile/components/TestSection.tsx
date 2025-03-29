import { useState, useEffect } from "react";
import { useTestEntries, TestEntry } from "@/hooks/useTestEntries";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthToken } from "@/lib/auth/client";
import { setupGlobalPrivyTokenAccess } from "@/lib/auth/client";

export default function TestSection() {
  const {
    entries,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    refreshEntries,
    fetchDebugInfo,
  } = useTestEntries();

  const privy = usePrivy();
  const { token } = useAuthToken();

  const [newSize, setNewSize] = useState("");
  const [editingEntry, setEditingEntry] = useState<TestEntry | null>(null);
  const [editSize, setEditSize] = useState("");
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Setup global access to Privy token
  useEffect(() => {
    if (privy.getAccessToken) {
      // Create a wrapper that ensures we always return a string
      const getTokenWrapper = async () => {
        const token = await privy.getAccessToken();
        if (!token) throw new Error("No token available");
        return token;
      };

      setupGlobalPrivyTokenAccess(getTokenWrapper);
    }
  }, [privy.getAccessToken]);

  // Handle creating a new entry
  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSize.trim()) return;

    try {
      const result = await createEntry(newSize);
      setNewSize("");
      console.log("Entry created:", result);
    } catch (err) {
      console.error("Error creating entry:", err);
    }
  };

  // Start editing an entry
  const startEditing = (entry: TestEntry) => {
    setEditingEntry(entry);
    setEditSize(entry.size);
  };

  // Handle updating an entry
  const handleUpdateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || !editSize.trim()) return;

    await updateEntry(editingEntry.id, editSize);
    setEditingEntry(null);
    setEditSize("");
  };

  // Handle deleting an entry
  const handleDeleteEntry = async (id: string) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      await deleteEntry(id);
    }
  };

  // Debug token
  const debugToken = async () => {
    try {
      setDebugLoading(true);

      // First, let's collect some basic info about our auth state
      const localDebugInfo = {
        privyAuthenticated: privy.authenticated,
        privyUser: privy.user
          ? {
              id: privy.user.id,
              wallet: privy.user.wallet?.address,
            }
          : null,
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
      };

      // Extract token info for debugging
      let tokenInfo = null;
      if (token) {
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));

            tokenInfo = {
              header,
              audience: payload.aud,
              subject: payload.sub,
              issuer: payload.iss,
              expiresAt: payload.exp
                ? new Date(payload.exp * 1000).toLocaleString()
                : null,
              issuedAt: payload.iat
                ? new Date(payload.iat * 1000).toLocaleString()
                : null,
            };
          }
        } catch (e) {
          console.error("Error parsing token parts:", e);
          tokenInfo = { error: "Failed to parse token" };
        }
      }

      console.log("Local debug info:", localDebugInfo);
      console.log("Token info:", tokenInfo);

      // Now call the debug endpoint
      let serverDebugInfo = null;
      try {
        serverDebugInfo = await fetchDebugInfo();
      } catch (error) {
        console.error("Server debug error:", error);
        serverDebugInfo = {
          error: error instanceof Error ? error.message : String(error),
        };
      }

      // Combine the debug information
      setDebugInfo({
        client: localDebugInfo,
        tokenInfo,
        server: serverDebugInfo,
      });
    } catch (error) {
      console.error("Error debugging token:", error);
      setDebugInfo({ error: "Failed to debug token", details: String(error) });
    } finally {
      setDebugLoading(false);
    }
  };

  // Add this function to manually refresh everything
  const forceRefresh = async () => {
    console.log("Force refreshing...");

    try {
      // Get a fresh token
      if (privy.getAccessToken) {
        const freshToken = await privy.getAccessToken();
        console.log("Fresh token received:", freshToken ? "Yes" : "No");

        // Try the debug info
        try {
          const debugData = await fetchDebugInfo();
          console.log("Debug info:", debugData);
        } catch (debugError) {
          console.error("Debug fetch failed:", debugError);
        }

        // Try refreshing entries
        try {
          await refreshEntries();
          console.log("Entries refreshed");
        } catch (refreshError) {
          console.error("Refresh entries failed:", refreshError);
        }
      } else {
        console.error("getAccessToken is not available");
      }
    } catch (error) {
      console.error("Force refresh failed:", error);
    }
  };

  // Test token directly
  const testTokenDirectly = async () => {
    if (!token) {
      console.error("No token available to test");
      return;
    }

    console.log("Testing token directly...");
    setDebugLoading(true);

    try {
      // Call the debug endpoint with the token as a query parameter
      const response = await fetch(
        `/api/test/debug?token=${encodeURIComponent(token)}`
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Direct token test result:", data);

      // Set the debug info to show the direct test results
      setDebugInfo({
        directTest: data,
        token:
          token.substring(0, 20) + "..." + token.substring(token.length - 20),
      });
    } catch (error) {
      console.error("Direct token test failed:", error);
      setDebugInfo({
        directTestError: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDebugLoading(false);
    }
  };

  // Test mode - bypass auth for testing
  const testModeCreateEntry = async () => {
    try {
      console.log("Creating entry in test mode...");

      // Call the API endpoint directly with the test mode header
      const response = await fetch("/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-test-mode": "true",
        },
        body: JSON.stringify({
          size: "Test Entry " + new Date().toLocaleTimeString(),
          userId: "11111111-1111-1111-1111-111111111111", // Test user ID
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Test mode entry created:", result);

      // Refresh entries
      refreshEntries();

      return result;
    } catch (error) {
      console.error("Test mode create failed:", error);
    }
  };

  // Try to extract AppID from token for debug purposes
  const extractAppIdFromToken = (token: string | null) => {
    if (!token) return null;

    try {
      // JWT tokens are base64 encoded in 3 parts: header.payload.signature
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      // Decode the payload part (middle section)
      const payload = JSON.parse(atob(parts[1]));

      // Check for app ID in the audience field
      if (payload.aud) {
        console.log("Extracted App ID from token:", payload.aud);
        return payload.aud;
      }

      return null;
    } catch (e) {
      console.error("Error extracting AppID from token:", e);
      return null;
    }
  };

  // Show token info
  const showTokenInfo = () => {
    if (!token) {
      setDebugInfo({ error: "No token available" });
      return;
    }

    try {
      // Extract token parts
      const parts = token.split(".");
      if (parts.length !== 3) {
        setDebugInfo({ error: "Invalid JWT format" });
        return;
      }

      // Decode header and payload
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      // Extract useful info
      const appId = payload.aud;
      const subject = payload.sub;
      const issuer = payload.iss;
      const expiresAt = payload.exp
        ? new Date(payload.exp * 1000).toISOString()
        : null;
      const issuedAt = payload.iat
        ? new Date(payload.iat * 1000).toISOString()
        : null;

      // Set debug info with token details
      setDebugInfo({
        tokenDetails: {
          header,
          payload: {
            ...payload,
            exp: expiresAt,
            iat: issuedAt,
          },
          appId,
          subject,
          issuer,
        },
      });

      console.log("Token details:", {
        appId,
        subject,
        issuer,
        expiresAt,
        issuedAt,
      });
    } catch (e) {
      console.error("Error parsing token:", e);
      setDebugInfo({ error: "Error parsing token", details: String(e) });
    }
  };

  if (!privy.authenticated || !privy.user) {
    return (
      <div className="mt-8 p-6 bg-slate-800 rounded-lg shadow text-white">
        <h2 className="text-xl font-bold mb-4">JWT Auth Test</h2>
        <p>Please log in to test JWT authentication.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 bg-slate-800 rounded-lg shadow text-white">
      <h2 className="text-xl font-bold mb-4">JWT Auth Test</h2>
      <p className="mb-4 text-sm text-slate-300">
        This section demonstrates secure JWT-based authentication between Privy
        and your Supabase backend.
      </p>

      {/* Debug Panel */}
      <div className="mb-6">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="px-3 py-1 bg-purple-600 text-white rounded text-sm mb-2 hover:bg-purple-700"
        >
          {showDebug ? "Hide Debug Info" : "Show Debug Info"}
        </button>

        {showDebug && (
          <div className="bg-slate-700 p-4 rounded mb-4">
            <div className="flex justify-between mb-2">
              <h3 className="font-medium text-white">Debug Information</h3>
              <div className="flex space-x-2">
                <button
                  onClick={showTokenInfo}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                >
                  Show Token Info
                </button>
                <button
                  onClick={testModeCreateEntry}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                >
                  Create Test Entry
                </button>
                <button
                  onClick={testTokenDirectly}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  disabled={!token || debugLoading}
                >
                  Test Token
                </button>
                <button
                  onClick={forceRefresh}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Force Refresh
                </button>
                <button
                  onClick={debugToken}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  disabled={debugLoading}
                >
                  {debugLoading ? "Loading..." : "Refresh Debug Info"}
                </button>
              </div>
            </div>

            {token && (
              <div className="mb-2">
                <p className="text-sm font-medium text-slate-300">
                  Token Preview:
                </p>
                <p className="text-xs bg-slate-900 p-2 rounded overflow-auto text-slate-300">
                  {token.substring(0, 20)}...
                  {token.substring(token.length - 20)}
                </p>
                <p className="text-sm font-medium text-slate-300 mt-2">
                  App ID (from token):
                </p>
                <p className="text-xs bg-slate-900 p-2 rounded overflow-auto text-slate-300 font-bold">
                  {extractAppIdFromToken(token) || "Could not extract App ID"}
                </p>
              </div>
            )}

            {debugInfo && (
              <pre className="text-xs bg-slate-900 p-2 rounded overflow-auto text-slate-300">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 text-red-100 rounded">
          Error: {error}
        </div>
      )}

      {/* Create entry form */}
      <form onSubmit={handleCreateEntry} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            placeholder="Enter size"
            className="flex-grow px-3 py-2 border rounded bg-slate-700 text-white border-slate-600"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !newSize.trim()}
          >
            Add Entry
          </button>
        </div>
      </form>

      {/* List of entries */}
      <div className="border border-slate-600 rounded overflow-hidden">
        <div className="grid grid-cols-4 gap-4 bg-slate-700 p-3 font-medium">
          <div>ID</div>
          <div>Size</div>
          <div>Updated</div>
          <div>Actions</div>
        </div>

        {isLoading ? (
          <div className="p-4 text-center bg-slate-800">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-center text-slate-400 bg-slate-800">
            No entries yet
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-4 gap-4 p-3 border-t border-slate-600 bg-slate-800"
            >
              <div className="text-sm overflow-hidden text-ellipsis text-slate-300">
                {entry.id}
              </div>

              {editingEntry?.id === entry.id ? (
                <form
                  onSubmit={handleUpdateEntry}
                  className="col-span-3 flex gap-2"
                >
                  <input
                    type="text"
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    className="flex-grow px-2 py-1 border rounded bg-slate-700 text-white border-slate-600"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    disabled={!editSize.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingEntry(null)}
                    className="px-3 py-1 bg-slate-600 text-white rounded text-sm hover:bg-slate-500"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div className="text-slate-200">{entry.size}</div>
                  <div className="text-sm text-slate-400">
                    {new Date(entry.updated_at).toLocaleString()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEditing(entry)}
                      className="px-3 py-1 bg-blue-700 text-white rounded text-sm hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="px-3 py-1 bg-red-700 text-white rounded text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <button
        onClick={refreshEntries}
        className="mt-4 px-4 py-2 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
      >
        Refresh
      </button>
    </div>
  );
}
