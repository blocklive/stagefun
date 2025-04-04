/**
 * Enum representing the pool status that matches the on-chain enum
 * This should be kept in sync with the Solidity contract enum
 */
export enum PoolStatus {
  INACTIVE = 0,
  ACTIVE = 1,
  PAUSED = 2,
  CLOSED = 3,
  FUNDED = 4, // Status for when target is reached
  FULLY_FUNDED = 5, // When cap is reached (but might be deprecated)
  FAILED = 6, // Status for when end time is reached without meeting target
  EXECUTING = 7, // When pool is using funds to execute the event/project
  COMPLETED = 8,
  CANCELLED = 9,
}

/**
 * Helper function to convert numeric status to enum value
 */
export function getPoolStatusFromNumber(
  status: number | bigint | string
): PoolStatus {
  if (typeof status === "string") {
    // Try to parse the string as a number first
    const numStatus = parseInt(status);
    if (!isNaN(numStatus)) {
      return numStatus as PoolStatus;
    }

    // If it's a string like "FUNDED" or "funded", try to match it to the enum (case-insensitive)
    const statusUpperCase = status.toUpperCase();
    const enumKey = Object.keys(PoolStatus).find(
      (key) => key === statusUpperCase
    );

    if (enumKey) {
      return PoolStatus[enumKey as keyof typeof PoolStatus];
    }

    // Map specific lowercase strings to enum values
    const statusMap: Record<string, PoolStatus> = {
      inactive: PoolStatus.INACTIVE,
      active: PoolStatus.ACTIVE,
      paused: PoolStatus.PAUSED,
      closed: PoolStatus.CLOSED,
      funded: PoolStatus.FUNDED,
      fully_funded: PoolStatus.FULLY_FUNDED,
      failed: PoolStatus.FAILED,
      executing: PoolStatus.EXECUTING,
      completed: PoolStatus.COMPLETED,
      cancelled: PoolStatus.CANCELLED,
    };

    if (statusMap[status.toLowerCase()]) {
      return statusMap[status.toLowerCase()];
    }

    console.error(`Invalid pool status string: ${status}`);
    // Default to INACTIVE instead of throwing an error
    return PoolStatus.INACTIVE;
  }

  // Handle bigint by converting to number
  if (typeof status === "bigint") {
    return Number(status) as PoolStatus;
  }

  return status as PoolStatus;
}

/**
 * Helper function to get a human-readable status string
 */
export function getPoolStatusString(
  status: PoolStatus | number | bigint | string
): string {
  const enumStatus =
    typeof status === "number" ||
    typeof status === "bigint" ||
    typeof status === "string"
      ? getPoolStatusFromNumber(status)
      : status;

  return PoolStatus[enumStatus];
}

/**
 * Get the display status for a pool, taking into account both database status and end date
 * @param status - The status string from the database (e.g. "ACTIVE", "FUNDED", etc.)
 * @param endTime - The end timestamp from the database
 * @param raisedAmount - The amount raised so far
 * @param targetAmount - The target amount for the pool
 * @returns string - The status to display in the UI
 */
export function getDisplayStatus(
  status: string,
  endTime: string,
  raisedAmount: number,
  targetAmount: number
): string {
  // If the pool is already marked with these statuses, respect them
  if (
    [
      "FUNDED",
      "FULLY_FUNDED",
      "FAILED",
      "EXECUTING",
      "PAUSED",
      "CLOSED",
      "COMPLETED",
      "CANCELLED",
    ].includes(status)
  ) {
    return status;
  }

  // Check if the pool has ended
  const endTimeNum = new Date(endTime).getTime() / 1000;
  const now = Math.floor(Date.now() / 1000); // Current time in seconds

  // Check if the pool has ended
  if (now > endTimeNum) {
    // Pool has ended - check if it met its target
    return raisedAmount >= targetAmount ? "FUNDED" : "FAILED";
  }

  // If not ended, return the current status
  return status;
}
