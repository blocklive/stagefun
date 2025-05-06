import React from "react";
import Image from "next/image";

// Known token icons map
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
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TokenIcon({
  symbol,
  logoURI,
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

  return (
    <div
      className={`${dimensions.container} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ${className}`}
      style={{ backgroundColor: "#2A2640" }}
    >
      {TOKEN_ICONS[symbol] ? (
        <Image
          src={TOKEN_ICONS[symbol]}
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
