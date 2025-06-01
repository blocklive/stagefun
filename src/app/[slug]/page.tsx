import { notFound } from "next/navigation";
import ClientPoolDetailsPage from "./client-pool-details-page";
import { getPoolWithFullDataBySlug } from "../../lib/services/pool-metadata-service";

interface PoolDetailsPageProps {
  params: { slug: string };
}

export default async function PoolDetailsPage({
  params,
}: PoolDetailsPageProps) {
  const { slug } = params;

  try {
    // Use service to fetch pool data
    const pool = await getPoolWithFullDataBySlug(slug);

    if (!pool) {
      notFound();
    }

    // Process the data for client component (add empty commitments that will be filled by hook)
    const processedPool = {
      ...pool,
      tiers:
        pool.tiers?.map((tier: any) => ({
          ...tier,
          commitments: [], // Will be filled by client-side hook with real-time data
        })) || [],
    };

    return <ClientPoolDetailsPage slug={slug} initialPool={processedPool} />;
  } catch (error) {
    console.error("Error fetching pool data:", error);
    notFound();
  }
}
