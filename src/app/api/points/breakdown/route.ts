import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, getSupabaseAdmin } from "@/lib/auth/server";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = authResult.userId;
    const supabaseAdmin = getSupabaseAdmin();

    // Get user's current points totals
    const { data: userPoints, error: pointsError } = await supabaseAdmin
      .from("user_points")
      .select("funded_points, raised_points, onboarding_points, checkin_points")
      .eq("user_id", userId)
      .single();

    if (pointsError) {
      console.error("Error fetching user points:", pointsError);
      return NextResponse.json(
        { error: "Failed to fetch user points" },
        { status: 500 }
      );
    }

    // Get all point transactions with metadata
    const { data: transactions, error: transactionsError } = await supabaseAdmin
      .from("point_transactions")
      .select("amount, action_type, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (transactionsError) {
      console.error("Error fetching transactions:", transactionsError);
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    // Calculate breakdown by analyzing transactions
    const breakdown = {
      funded: { base: 0, bonus: 0, total: 0 },
      raised: { base: 0, bonus: 0, total: 0 },
      onboarding: { base: 0, bonus: 0, total: 0 },
      checkin: { base: 0, bonus: 0, total: 0 },
    };

    let totalBase = 0;
    let totalBonus = 0;

    transactions?.forEach((transaction) => {
      const amount = Number(transaction.amount) || 0;
      const actionType = (transaction.action_type as string) || "";
      const metadata = (transaction.metadata as any) || {};

      // Determine point type from action_type
      let pointType: keyof typeof breakdown;
      if (actionType.startsWith("funded:")) {
        pointType = "funded";
      } else if (actionType.startsWith("raised:")) {
        pointType = "raised";
      } else if (actionType.startsWith("onboarding:")) {
        pointType = "onboarding";
      } else if (actionType.startsWith("checkin:")) {
        pointType = "checkin";
      } else {
        // Default to onboarding for unknown types
        pointType = "onboarding";
      }

      // Check if transaction has base/bonus breakdown in metadata
      if (
        metadata.base_amount !== undefined &&
        metadata.bonus_amount !== undefined
      ) {
        // New format with multiplier breakdown
        const baseAmount = Number(metadata.base_amount) || 0;
        const bonusAmount = Number(metadata.bonus_amount) || 0;

        breakdown[pointType].base += baseAmount;
        breakdown[pointType].bonus += bonusAmount;
        breakdown[pointType].total += amount;

        totalBase += baseAmount;
        totalBonus += bonusAmount;
      } else {
        // Legacy format - treat all as base points
        breakdown[pointType].base += amount;
        breakdown[pointType].total += amount;
        totalBase += amount;
      }
    });

    const totalPoints = totalBase + totalBonus;

    console.log("breakdown", breakdown, totalPoints, totalBase, totalBonus);
    return NextResponse.json({
      totalPoints,
      basePoints: totalBase,
      bonusPoints: totalBonus,
      breakdown,
    });
  } catch (error) {
    console.error("Error in points breakdown API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
