import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import PoolHeader from "../components/PoolHeader";
import PoolTabs from "../components/PoolTabs";
import UpdatesList from "../components/pool-updates/UpdatesList";

export const dynamic = "force-dynamic";

interface UpdatesPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: UpdatesPageProps): Promise<Metadata> {
  // Fetch the pool data
  const { data: pool } = await supabase
    .from("pools")
    .select("name")
    .eq("id", params.id)
    .single();

  if (!pool) {
    return {
      title: "Pool Not Found",
    };
  }

  return {
    title: `${pool.name} - Updates | Stage.fun`,
    description: `Updates for ${pool.name} on Stage.fun`,
  };
}

export default async function PoolUpdatesPage({ params }: UpdatesPageProps) {
  // Get the pool data
  const { data: pool } = await supabase
    .from("pools")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!pool) {
    notFound();
  }

  // Get the current user
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id;

  // Check if current user is the creator
  const isCreator = currentUserId === pool.creator_id;

  return (
    <>
      <PoolHeader pool={pool} isCreator={isCreator} />

      <div className="container max-w-5xl mx-auto px-4 py-8">
        <PoolTabs
          poolId={params.id}
          activeTab="updates"
          isCreator={isCreator}
        />

        <UpdatesList
          poolId={params.id}
          isCreator={isCreator}
          userId={currentUserId}
        />
      </div>
    </>
  );
}
