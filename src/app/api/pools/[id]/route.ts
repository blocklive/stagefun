import { NextResponse } from "next/server";
import { getPoolById } from "../../../../lib/services/pool-service";
import { supabase } from "../../../../lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const pool = await getPoolById(params.id);
    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    // Calculate the percentage
    const target_amount = Number(pool.target_amount) || 0;
    const raised_amount = Number(pool.raised_amount) || 0;
    const percentage =
      target_amount > 0 ? (raised_amount / target_amount) * 100 : 0;

    // Even if blockchain data fetch fails, we can still return the pool with default values
    return NextResponse.json({
      pool,
      target_amount,
      raised_amount,
      percentage,
    });
  } catch (error: any) {
    console.error("Error fetching pool:", error);
    // If it's a blockchain error, return the pool data without blockchain info
    if (
      error.message?.includes("blockchain") ||
      error.code?.includes("NETWORK")
    ) {
      const { data: dbPool } = await supabase
        .from("pools")
        .select(
          `
          *,
          creator:creator_id (
            name,
            avatar_url
          )
        `
        )
        .eq("id", params.id)
        .single();

      if (dbPool) {
        const target_amount = Number(dbPool.target_amount) || 0;
        const raised_amount = 0; // Default to 0 if blockchain data is unavailable
        const percentage = 0;

        return NextResponse.json({
          pool: {
            ...dbPool,
            creator_name: dbPool.creator?.name || "Anonymous",
            creator_avatar_url: dbPool.creator?.avatar_url || null,
            raised_amount,
            status: dbPool.status,
          },
          target_amount,
          raised_amount,
          percentage,
        });
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch pool data" },
      { status: 500 }
    );
  }
}
