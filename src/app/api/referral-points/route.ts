import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/services/supabase-admin";
import { withAuth } from "@/lib/auth/server";
import { AuthContext } from "@/lib/auth/types";
import { awardReferralPoints } from "@/lib/services/points.service";

export const POST = withAuth(
  async (request: NextRequest, auth: AuthContext) => {
    try {
      const supabase = getSupabaseAdmin();
      const body = await request.json();

      const { referrerTwitterUsername, poolAddress, amount, txHash } = body;

      // Validate required fields
      if (!referrerTwitterUsername || !poolAddress || !amount || !txHash) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      // Award referral points
      const result = await awardReferralPoints({
        referrerTwitterUsername,
        poolAddress,
        amount,
        txHash,
        supabase,
      });

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: "Referral points awarded successfully",
        });
      } else {
        return NextResponse.json(
          { error: result.error || "Failed to award referral points" },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("Error in referral points API:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
