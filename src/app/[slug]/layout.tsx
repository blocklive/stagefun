import { Metadata } from "next";
import { supabase } from "../../lib/supabase";
import ClientLayout from "./client-layout";

interface SlugLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

// Server-side metadata generation for Open Graph and Twitter Cards
export async function generateMetadata({
  params,
}: SlugLayoutProps): Promise<Metadata> {
  const { slug } = params;

  try {
    // Fetch pool data by slug
    const { data: pool, error } = await supabase
      .from("pools")
      .select(
        `
        *,
        creator:users!creator_id (
          id,
          name,
          avatar_url
        )
      `
      )
      .eq("slug", slug)
      .single();

    if (error || !pool) {
      // Return basic metadata if pool not found
      return {
        title: "Pool Not Found - StageFun",
        description: "This pool could not be found.",
      };
    }

    // Calculate percentage funded
    const percentage =
      pool.target_amount > 0
        ? Math.min(
            Math.round((pool.raised_amount / pool.target_amount) * 100),
            100
          )
        : 0;

    // Format raised amount for display
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    };

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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://app.stage.fun";
    const poolUrl = `${baseUrl}/${slug}`;

    // Use pool image or fallback to a default image
    const imageUrl =
      pool.image_url ||
      `${baseUrl}/api/og?title=${encodeURIComponent(
        pool.name || pool.title
      )}&raised=${raisedFormatted}&target=${targetFormatted}&percentage=${percentage}`;

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
        ],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
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
