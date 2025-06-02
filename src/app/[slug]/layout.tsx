import { Metadata } from "next";
import { headers } from "next/headers";
import ClientLayout from "./client-layout";
import {
  getPoolMetadataBySlug,
  formatCurrency,
  calculateFundingPercentage,
} from "../../lib/services/pool-metadata-service";

interface SlugLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

// Server-side metadata generation for Open Graph and Twitter Cards
export async function generateMetadata({
  params,
}: SlugLayoutProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Use service to fetch pool data
    const pool = await getPoolMetadataBySlug(slug);

    if (!pool) {
      // Return basic metadata if pool not found
      return {
        title: "Pool Not Found - StageFun",
        description: "This pool could not be found.",
      };
    }

    // Use service functions for calculations
    const percentage = calculateFundingPercentage(
      pool.raised_amount || 0,
      pool.target_amount || 0
    );
    const raisedFormatted = formatCurrency(pool.raised_amount || 0);
    const targetFormatted = formatCurrency(pool.target_amount || 0);

    // Construct title and description
    const title = `${pool.name || pool.title} - StageFun`;
    const description = pool.description
      ? `${pool.description.slice(0, 150)}${
          pool.description.length > 150 ? "..." : ""
        }`
      : `Join ${
          pool.creator?.name || "this creator"
        }'s pool on StageFun. ${raisedFormatted} raised of ${targetFormatted} target (${percentage}% funded).`;

    // Get the current host from headers for dynamic base URL
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") || "https";
    const baseUrl = host
      ? `${protocol}://${host}`
      : process.env.NEXT_PUBLIC_BASE_URL || "https://app.stage.fun";
    const poolUrl = `${baseUrl}/${slug}`;

    // Always use our OG image generator, but pass pool image as parameter
    const imageUrl = `${baseUrl}/api/og?title=${encodeURIComponent(
      pool.name || pool.title
    )}${
      pool.image_url ? `&imageUrl=${encodeURIComponent(pool.image_url)}` : ""
    }${
      pool.token_symbol
        ? `&tokenSymbol=${encodeURIComponent(pool.token_symbol)}`
        : ""
    }`;

    // Fallback image in case OG route is not accessible
    const fallbackImageUrl = `${baseUrl}/stagefun-og-default.png`;

    // Debug logging
    console.log("Generated OG image URL:", imageUrl);
    console.log("Base URL:", baseUrl);
    console.log("Pool data:", {
      name: pool.name,
      title: pool.title,
      token_symbol: pool.token_symbol,
    });

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: poolUrl,
        siteName: "StageFun",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: pool.name || pool.title,
          },
          // Fallback image
          {
            url: fallbackImageUrl,
            width: 1200,
            height: 630,
            alt: pool.name || pool.title,
          },
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl, fallbackImageUrl],
        creator: "@stagefunapp",
        site: "@stagefunapp",
      },
      alternates: {
        canonical: poolUrl,
      },
    };
  } catch (error) {
    console.error("Error generating metadata for slug:", slug, error);

    // Return fallback metadata
    return {
      title: "StageFun - Party Rounds",
      description:
        "Create and join funding pools for parties, events, and more on StageFun.",
    };
  }
}

export default function SlugLayout({ children }: SlugLayoutProps) {
  return <ClientLayout>{children}</ClientLayout>;
}
