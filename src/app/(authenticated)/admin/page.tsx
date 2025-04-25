"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { usePrivy } from "@privy-io/react-auth";

interface BlockchainSyncRun {
  id: string;
  created_at: string;
  job_name: string;
  start_time: string;
  end_time: string | null;
  status: string;
  events_found: number;
  events_processed: number;
  events_skipped: number;
  events_failed: number;
  blocks_processed: number | null;
  start_block: number | null;
  end_block: number | null;
  duration_ms: number | null;
  error_message: string | null;
  source: string | null;
}

interface SyncStats {
  totalRuns: number;
  statusCounts: {
    running?: number;
    completed?: number;
    failed?: number;
  };
  last24Hours: {
    totalEventsFound: number;
    totalEventsProcessed: number;
    totalEventsSkipped: number;
    avgDurationMs: number;
    runCount: number;
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const [runs, setRuns] = useState<BlockchainSyncRun[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not authenticated
    if (authenticated === false) {
      router.push("/");
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);

        // Fetch stats
        const statsResponse = await fetch(
          "/api/admin/blockchain-syncs?action=stats"
        );

        if (statsResponse.status === 401 || statsResponse.status === 403) {
          setError("You are not authorized to view this page");
          setTimeout(() => router.push("/pools"), 2000);
          return;
        }

        if (!statsResponse.ok) {
          throw new Error(`Error fetching stats: ${statsResponse.statusText}`);
        }

        const statsData = await statsResponse.json();
        setStats(statsData.stats);

        // Fetch runs
        const runsResponse = await fetch(
          "/api/admin/blockchain-syncs?action=list&limit=10"
        );
        if (!runsResponse.ok) {
          throw new Error(`Error fetching runs: ${runsResponse.statusText}`);
        }
        const runsData = await runsResponse.json();
        setRuns(runsData.runs);

        setError(null);
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to fetch blockchain sync data");
      } finally {
        setLoading(false);
      }
    }

    // Only fetch if authenticated
    if (authenticated) {
      fetchData();
    }

    // Set up auto-refresh every 30 seconds
    const intervalId = setInterval(() => {
      if (authenticated) {
        fetchData();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [authenticated, router]);

  function formatDate(dateString: string | null) {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString();
  }

  function formatDuration(ms: number | null) {
    if (ms === null) return "—";

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  function getStatusClass(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  // Show loading while checking auth
  if (authenticated === null) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AppHeader
          title="ADMIN DASHBOARD"
          showBackButton={true}
          onBackClick={() => router.push("/pools")}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="p-8 text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader
        title="ADMIN DASHBOARD"
        showBackButton={true}
        onBackClick={() => router.push("/pools")}
      />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Blockchain Events Dashboard</h1>

        {error && (
          <div className="bg-red-900/50 border border-red-600 text-white px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-2">Total Events</h2>
              <div className="flex justify-between items-center">
                <div className="text-3xl font-bold">{stats.totalRuns}</div>
                <div className="flex flex-col text-sm">
                  <span className="text-green-400">
                    {stats.statusCounts.completed || 0} completed
                  </span>
                  <span className="text-blue-400">
                    {stats.statusCounts.running || 0} running
                  </span>
                  <span className="text-red-400">
                    {stats.statusCounts.failed || 0} failed
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-2">Last 24 Hours</h2>
              <div className="flex flex-col">
                <div className="text-2xl font-bold mb-2">
                  {stats.last24Hours.runCount} runs
                </div>
                <div className="text-sm">
                  <div>
                    <span className="text-blue-400">Found:</span>{" "}
                    {stats.last24Hours.totalEventsFound}
                  </div>
                  <div>
                    <span className="text-green-400">Processed:</span>{" "}
                    {stats.last24Hours.totalEventsProcessed}
                  </div>
                  <div>
                    <span className="text-amber-400">Skipped:</span>{" "}
                    {stats.last24Hours.totalEventsSkipped}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-lg font-semibold mb-2">Performance</h2>
              <div className="flex flex-col">
                <div className="text-2xl font-bold mb-2">
                  {formatDuration(stats.last24Hours.avgDurationMs)}
                </div>
                <div className="text-sm">Average run duration</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Runs Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          <h2 className="text-lg font-semibold p-4 border-b border-gray-800">
            Recent Blockchain Event Runs
          </h2>

          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : runs.length === 0 ? (
            <div className="p-8 text-center">No blockchain sync runs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="px-4 py-2 text-left text-sm">Time</th>
                    <th className="px-4 py-2 text-left text-sm">Source</th>
                    <th className="px-4 py-2 text-left text-sm">Status</th>
                    <th className="px-4 py-2 text-right text-sm">
                      Events Found
                    </th>
                    <th className="px-4 py-2 text-right text-sm">Processed</th>
                    <th className="px-4 py-2 text-right text-sm">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr
                      key={run.id}
                      className="border-t border-gray-800 hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 text-sm">
                        <div>{formatDate(run.start_time)}</div>
                        <div className="text-xs text-gray-400">
                          {run.job_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{run.source || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs ${getStatusClass(
                            run.status
                          )}`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {run.events_found}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {run.events_processed}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {run.duration_ms
                          ? formatDuration(run.duration_ms)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
