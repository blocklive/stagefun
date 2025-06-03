import React, { useState, useEffect } from "react";
import Image from "next/image";
import { User } from "@/lib/supabase";

// Define an array of colors for avatar backgrounds
const AVATAR_COLORS = [
  "#6E58DB", // Darker Purple (primary app color)
  "#D32F2F", // Darker Red
  "#3D5AFE", // Darker Blue
  "#E65100", // Darker Orange
  "#0277BD", // Darker Light Blue
  "#00A676", // Darker Mint Green
  "#9C27B0", // Darker Magenta
  "#F9A825", // Darker Gold
  "#C2185B", // Darker Pink
  "#00897B", // Darker Turquoise
  "#7B1FA2", // Darker Violet
  "#2E7D32", // Darker Green
];

// Function to deterministically generate a color based on a string
export function getAvatarColor(name: string): string {
  if (!name || name.length === 0) return AVATAR_COLORS[0];

  // Use a simple hash function to get a consistent color for the same name
  const charSum = name
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return AVATAR_COLORS[charSum % AVATAR_COLORS.length];
}

// Function to get the initials from a name (up to 2 characters)
export function getInitials(name: string): string {
  if (!name || name.length === 0) return "?";

  // Get the first character of the name
  // If there's a space, get the first character of the second part
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  // Otherwise just return the first character
  return name.charAt(0).toUpperCase();
}

// Function to sanitize image URL - simplified without cache busting
function sanitizeImageUrl(url: string): string {
  if (!url) return url;

  // Just return the original URL to allow proper caching
  return url;
}

interface UserAvatarProps {
  user?: User | null;
  name?: string; // Fallback if user is not provided
  avatarUrl?: string; // Fallback if user is not provided
  size?: number;
  className?: string;
}

export default function UserAvatar({
  user,
  name,
  avatarUrl,
  size = 40,
  className = "",
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Determine the avatar URL and display name
  const displayName = user?.name || name || "Anonymous";
  const rawImageUrl = user?.avatar_url || avatarUrl;
  const imageUrl = rawImageUrl ? sanitizeImageUrl(rawImageUrl) : null;

  // Determine background color based on the name
  const backgroundColor = getAvatarColor(displayName);

  // Get initials for fallback
  const initials = getInitials(displayName);

  // Font size should be proportional to the size of the avatar
  const fontSize = Math.max(Math.floor(size / 2.5), 10);

  // Reset image error when imageUrl changes
  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  return (
    <div
      className={`relative rounded-full overflow-hidden flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: !imageUrl ? backgroundColor : undefined,
      }}
    >
      {imageUrl && !imageError ? (
        <Image
          src={imageUrl}
          alt={displayName}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized={true}
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={(e) => {
            console.warn("Failed to load avatar image:", imageUrl);
            setImageError(true);
          }}
          onLoad={() => {
            // Reset error state on successful load
            setImageError(false);
          }}
        />
      ) : (
        <span
          className="font-bold text-white"
          style={{ fontSize: `${fontSize}px` }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
