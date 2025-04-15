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
  points: {
    total: number;
    funded: number;
    raised: number;
    onboarding: number;
    checkin: number;
  };
  fundedAmount: number; // Amount user has funded into pools
  raisedAmount: number; // Amount user has raised in their pools
  totalTally: number;
  isCurrentUser: boolean;
  rank: number; // This is the original rank from the API
}

interface LeaderboardTableProps {
  users: LeaderboardUser[];
  showHeader?: boolean; // Optional prop to control header visibility
}

type SortField =
  | "points"
  | "fundedAmount"
  | "raisedAmount"
  | "rank"
  | "fundedPoints"
  | "raisedPoints";
type SortDirection = "asc" | "desc";

export default function LeaderboardTable({
  users,
  showHeader = true,
}: LeaderboardTableProps) {
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

  // Ensure current user is at the top, then sort the rest
  const sortedUsers = [...users].sort((a, b) => {
    // If a is current user, it always goes first
    if (a.isCurrentUser) return -1;
    // If b is current user, it always goes first
    if (b.isCurrentUser) return 1;

    // Normal sorting for all other users
    let comparison = 0;

    if (sortField === "rank") {
      // Sort by totalTally for the rank column
      comparison = b.totalTally - a.totalTally;
    } else if (sortField === "points") {
      // Calculate total from all point types
      const aTotalPoints =
        a.points.funded +
        a.points.raised +
        a.points.onboarding +
        a.points.checkin;
      const bTotalPoints =
        b.points.funded +
        b.points.raised +
        b.points.onboarding +
        b.points.checkin;
      comparison = bTotalPoints - aTotalPoints;
    } else if (sortField === "fundedPoints") {
      comparison = b.points.funded - a.points.funded;
    } else if (sortField === "raisedPoints") {
      comparison = b.points.raised - a.points.raised;
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
        {showHeader && (
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
                onClick={() => handleSort("fundedPoints")}
              >
                <div className="flex items-center justify-end">
                  Funded Points
                  {sortField === "fundedPoints" && (
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
                onClick={() => handleSort("raisedPoints")}
              >
                <div className="flex items-center justify-end">
                  Raised Points
                  {sortField === "raisedPoints" && (
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
        )}

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
                      ⭐
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell className="text-right font-medium">
                {(
                  user.points.funded +
                  user.points.raised +
                  user.points.onboarding +
                  user.points.checkin
                ).toLocaleString()}
              </TableCell>

              <TableCell className="text-right font-medium">
                {user.points.funded.toLocaleString()}
              </TableCell>

              <TableCell className="text-right font-medium">
                {user.points.raised.toLocaleString()}
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
