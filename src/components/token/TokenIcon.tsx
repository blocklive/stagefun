import React from "react";
import Image from "next/image";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Official token addresses for verification
const OFFICIAL_USDC_ADDRESS =
  CONTRACT_ADDRESSES.monadTestnet.usdc.toLowerCase();
const OFFICIAL_WMON_ADDRESS =
  CONTRACT_ADDRESSES.monadTestnet.officialWmon.toLowerCase();

// Known token icons map by symbol
export const TOKEN_ICONS: Record<string, string> = {
  USDC: "/icons/usdc-logo.svg",
  MON: "/icons/mon-logo.svg",
  WMON: "/icons/mon-logo.svg",
  // Add more tokens as needed
};

// Token display name mapping
export const TOKEN_DISPLAY_NAMES: Record<string, string> = {
  USDC: "USD Coin",
  MON: "Monad",
  WMON: "Wrapped MON",
  // Add more token display name mappings as needed
};

// Check if a token is a known token
export const isKnownToken = (symbol: string): boolean => {
  return TOKEN_ICONS[symbol] !== undefined;
};

interface TokenIconProps {
  symbol: string;
  logoURI?: string;
  address?: string | null; // Add contract address to verify tokens
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TokenIcon({
  symbol,
  logoURI,
  address,
  size = "md",
  className = "",
}: TokenIconProps) {
  // Determine icon dimensions based on size
  const dimensions = {
    sm: { container: "w-6 h-6", image: 24 },
    md: { container: "w-8 h-8", image: 32 },
    lg: { container: "w-12 h-12", image: 48 },
  }[size];

  // Font size for the fallback letter
  const fontSize = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }[size];

  // Check if we should use a known logo based on address
  const addressLower = address?.toLowerCase();
  let iconPath = logoURI;

  // Override with our verified token icons if the address matches
  if (addressLower === OFFICIAL_USDC_ADDRESS) {
    iconPath = "/icons/usdc-logo.svg";
  } else if (addressLower === OFFICIAL_WMON_ADDRESS) {
    iconPath = "/icons/mon-logo.svg";
  } else if (symbol === "MON" && !address) {
    // Native MON token
    iconPath = "/icons/mon-logo.svg";
  } else if (TOKEN_ICONS[symbol] && !logoURI) {
    // Fallback to symbol-based lookup only if no logoURI provided
    iconPath = TOKEN_ICONS[symbol];
  }

  return (
    <div
      className={`${dimensions.container} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ${className}`}
      style={{ backgroundColor: "#2A2640" }}
    >
      {iconPath ? (
        <Image
          src={iconPath}
          alt={symbol}
          width={dimensions.image}
          height={dimensions.image}
          className="object-contain"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center text-gray-400 font-semibold ${fontSize}`}
        >
          {symbol.charAt(0)}
        </div>
      )}
    </div>
  );
}
