"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LeaderboardSkeleton() {
  // Create an array of placeholder rows
  const skeletonRows = Array(10).fill(null);

  return (
    <div className="overflow-x-auto">
      <div className="rounded-md border border-gray-800 min-w-[1000px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">
                <div className="flex items-center">Rank</div>
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-right">Funded Points</TableHead>
              <TableHead className="text-right">Raised Points</TableHead>
              <TableHead className="text-right">Funded</TableHead>
              <TableHead className="text-right">Raised</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {skeletonRows.map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="h-6 w-8 bg-gray-700 rounded animate-pulse"></div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="h-5 w-32 bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-5 w-16 bg-gray-700 rounded animate-pulse ml-auto"></div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-5 w-16 bg-gray-700 rounded animate-pulse ml-auto"></div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-5 w-16 bg-gray-700 rounded animate-pulse ml-auto"></div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-5 w-20 bg-gray-700 rounded animate-pulse ml-auto"></div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="h-5 w-20 bg-gray-700 rounded animate-pulse ml-auto"></div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
