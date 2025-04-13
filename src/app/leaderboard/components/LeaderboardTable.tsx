"use client";

import { useState } from "react";
import UserAvatar from "@/app/components/UserAvatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";

// Define our own types to avoid circular dependencies
interface LeaderboardUser {
  id: string;
  name: string | null;
  wallet: string | null;
  avatar_url: string | null;
  points: number;
  fundedAmount: number; // Amount user has funded into pools
  raisedAmount: number; // Amount user has raised in their pools
  totalTally: number;
  isCurrentUser: boolean;
  rank: number; // This is the original rank from the API
}

interface LeaderboardTableProps {
  users: LeaderboardUser[];
}

type SortField = "points" | "fundedAmount" | "raisedAmount" | "rank";
type SortDirection = "asc" | "desc";

export default function LeaderboardTable({ users }: LeaderboardTableProps) {
  const [sortField, setSortField] = useState<SortField>("points");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Function to format USD amounts
  const formatUSD = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Function to handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Default to descending for new sort field
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sort the users based on current sort settings
  const sortedUsers = [...users].sort((a, b) => {
    let comparison = 0;

    if (sortField === "rank") {
      // Sort by totalTally for the rank column
      comparison = b.totalTally - a.totalTally;
    } else if (sortField === "points") {
      comparison = b.points - a.points;
    } else if (sortField === "fundedAmount") {
      comparison = b.fundedAmount - a.fundedAmount;
    } else if (sortField === "raisedAmount") {
      comparison = b.raisedAmount - a.raisedAmount;
    }

    // Reverse for ascending order
    return sortDirection === "asc" ? -comparison : comparison;
  });

  // Always display the original rank from the API
  // This maintains consistent ranks regardless of sorting
  return (
    <div className="rounded-md border border-gray-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="w-[80px] cursor-pointer"
              onClick={() => handleSort("rank")}
            >
              <div className="flex items-center">
                Rank
                {sortField === "rank" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? (
                      <FiArrowUp size={14} />
                    ) : (
                      <FiArrowDown size={14} />
                    )}
                  </span>
                )}
              </div>
            </TableHead>

            <TableHead>User</TableHead>

            <TableHead
              className="text-right cursor-pointer"
              onClick={() => handleSort("points")}
            >
              <div className="flex items-center justify-end">
                Points
                {sortField === "points" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? (
                      <FiArrowUp size={14} />
                    ) : (
                      <FiArrowDown size={14} />
                    )}
                  </span>
                )}
              </div>
            </TableHead>

            <TableHead
              className="text-right cursor-pointer"
              onClick={() => handleSort("fundedAmount")}
            >
              <div className="flex items-center justify-end">
                Funded
                {sortField === "fundedAmount" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? (
                      <FiArrowUp size={14} />
                    ) : (
                      <FiArrowDown size={14} />
                    )}
                  </span>
                )}
              </div>
            </TableHead>

            <TableHead
              className="text-right cursor-pointer"
              onClick={() => handleSort("raisedAmount")}
            >
              <div className="flex items-center justify-end">
                Raised
                {sortField === "raisedAmount" && (
                  <span className="ml-1">
                    {sortDirection === "asc" ? (
                      <FiArrowUp size={14} />
                    ) : (
                      <FiArrowDown size={14} />
                    )}
                  </span>
                )}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {sortedUsers.map((user) => (
            <TableRow
              key={user.id}
              className={user.isCurrentUser ? "bg-[#FFFFFF10]" : ""}
            >
              <TableCell className="font-medium">{user.rank}</TableCell>

              <TableCell>
                <div className="flex items-center space-x-3">
                  <UserAvatar
                    name={user.name || "Anonymous"}
                    avatarUrl={user.avatar_url || undefined}
                    size={32}
                  />
                  <span className="font-medium truncate max-w-[150px]">
                    {user.name || user.wallet}
                  </span>
                  {user.isCurrentUser && (
                    <span className="text-xs bg-[#FFFFFF20] px-2 py-0.5 rounded-full">
                      Your position
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell className="text-right font-medium">
                {user.points.toLocaleString()}
              </TableCell>

              <TableCell className="text-right font-medium">
                {formatUSD(user.fundedAmount)}
              </TableCell>

              <TableCell className="text-right font-medium">
                {formatUSD(user.raisedAmount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
