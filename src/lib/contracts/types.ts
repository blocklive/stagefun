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
  FAILED = 5, // Status for when end time is reached without meeting target
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
      failed: PoolStatus.FAILED,
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
