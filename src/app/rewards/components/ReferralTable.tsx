"use client";

import React, { useState } from "react";
import UserAvatar from "@/app/components/UserAvatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReferralCode } from "@/hooks/useReferrals";
import { FiCopy } from "react-icons/fi";
import showToast from "@/utils/toast";
import { FaCheck } from "react-icons/fa";
import { colors } from "@/lib/theme";

interface ReferralTableProps {
  codes: ReferralCode[];
  isLoading: boolean;
}

export default function ReferralTable({
  codes,
  isLoading,
}: ReferralTableProps) {
  // Function to copy referral link to clipboard
  const copyReferralLink = async (code: string) => {
    try {
      // Extract just the 6-character part from the SF-XXXXXX code
      const codeWithoutPrefix = code.startsWith("SF-")
        ? code.substring(3)
        : code;

      // Create the referral link with the code as a query parameter
      const baseUrl = window.location.origin;
      const referralLink = `${baseUrl}?ref=${codeWithoutPrefix}`;

      await navigator.clipboard.writeText(referralLink);
      showToast.success("Referral link copied!");
    } catch (error) {
      console.error("Failed to copy referral link:", error);
      showToast.error("Failed to copy link");
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[#FFFFFF0A] rounded-lg border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-800">
              <TableHead className="text-gray-400 py-3">Code</TableHead>
              <TableHead className="text-gray-400 py-3">Status</TableHead>
              <TableHead className="text-gray-400 py-3">User</TableHead>
              <TableHead className="text-gray-400 py-3">Date Joined</TableHead>
              <TableHead className="text-gray-400 py-3">
                Points Earned
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(2)
              .fill(null)
              .map((_, index) => (
                <TableRow key={index} className="border-gray-800">
                  <TableCell className="py-3">
                    <div className="h-4 w-20 bg-gray-700 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="h-4 w-20 bg-gray-700 rounded animate-pulse"></div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (codes.length === 0) {
    return (
      <div className="bg-[#FFFFFF0A] rounded-lg border border-gray-800 p-8 text-center">
        <p className="text-gray-400">No referral codes generated yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF0A] rounded-lg border border-gray-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800">
            <TableHead className="text-gray-400 py-3">Code</TableHead>
            <TableHead className="text-gray-400 py-3">Status</TableHead>
            <TableHead className="text-gray-400 py-3">User</TableHead>
            <TableHead className="text-gray-400 py-3">Date Joined</TableHead>
            <TableHead className="text-gray-400 py-3">Points Earned</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {codes.map((code) => (
            <TableRow
              key={code.id}
              className="border-gray-800 hover:bg-[#FFFFFF05]"
            >
              <TableCell className="py-3">
                <div className="flex items-center gap-2">
                  <span className="text-white">{code.code}</span>
                  <button
                    onClick={() => copyReferralLink(code.code)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors opacity-60 hover:opacity-100"
                    title="Copy referral link"
                  >
                    <FiCopy size={14} className="text-gray-400" />
                  </button>
                </div>
              </TableCell>

              <TableCell className="py-3">
                {code.used_by_user_id ? (
                  <span style={{ color: colors.purple.DEFAULT }}>Used</span>
                ) : (
                  <span className="text-gray-400">Unused</span>
                )}
              </TableCell>

              <TableCell className="py-3">
                {code.used_by_user ? (
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={code.used_by_user.name || "Anonymous"}
                      avatarUrl={code.used_by_user.avatar_url || undefined}
                      size={24}
                    />
                    <span className="text-white truncate max-w-[120px]">
                      {code.used_by_user.name || "Anonymous"}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </TableCell>

              <TableCell className="text-gray-400 py-3">
                {code.used_at ? formatDate(code.used_at) : "-"}
              </TableCell>

              <TableCell className="py-3">
                {code.used_by_user_id ? (
                  <span style={{ color: colors.purple.DEFAULT }}>3000</span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
