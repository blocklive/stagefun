import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = page * limit;

    const supabase = getSupabaseAdmin();

    // Fetch transactions for the authenticated user
    const { data: transactions, error } = await supabase
      .from("point_transactions")
      .select("*")
      .eq("user_id", authResult.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching transactions:", error);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    // Get unique pool addresses from metadata
    const poolAddresses = new Set<string>();
    transactions?.forEach((transaction) => {
      const metadata = (transaction.metadata as any) || {};
      if (metadata.poolAddress) {
        poolAddresses.add(metadata.poolAddress);
      }
    });

    // Fetch all pool names using case-insensitive queries
    let poolsMap = new Map<string, { name: string; slug: string }>();
    if (poolAddresses.size > 0) {
      // Use case-insensitive search for all addresses
      const addressArray = Array.from(poolAddresses);
      let allPools: any[] = [];

      // Query each address with ilike (case-insensitive)
      for (const address of addressArray) {
        const { data: pools } = await supabase
          .from("pools")
          .select("contract_address, name, slug")
          .ilike("contract_address", address);

        if (pools && pools.length > 0) {
          allPools.push(...pools);
        }
      }

      allPools.forEach((pool: any) => {
        if (pool.contract_address) {
          // Map using the original metadata address (lowercase) as key
          const matchingAddress = addressArray.find(
            (addr) => addr.toLowerCase() === pool.contract_address.toLowerCase()
          );
          if (matchingAddress) {
            poolsMap.set(matchingAddress.toLowerCase(), {
              name: pool.name,
              slug: pool.slug,
            });
          }
        }
      });
    }

    // Attach pool data to transactions
    const processedTransactions = transactions?.map((transaction) => {
      const metadata = (transaction.metadata as any) || {};
      if (metadata.poolAddress) {
        const poolData = poolsMap.get(metadata.poolAddress.toLowerCase());
        if (poolData) {
          return {
            ...transaction,
            pool: poolData,
          };
        }
      }
      return transaction;
    });

    // Check if there are more transactions
    const { count } = await supabase
      .from("point_transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", authResult.userId);

    const hasMore = offset + limit < (count || 0);

    return NextResponse.json({
      transactions: processedTransactions || [],
      hasMore,
      total: count || 0,
    });
  } catch (error) {
    console.error("Error in transactions API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
