import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/services/supabase-admin";
import { withAuth } from "@/lib/auth/server";
import { AuthContext } from "@/lib/auth/types";

// Function to calculate max codes based on user level
function getMaxCodesForLevel(level: number): number {
  if (level <= 5) return 1; // levels 1-5 get 1 code
  return level - 4; // level 6+ gets level-4 codes (level 6 = 2, level 7 = 3, etc.)
}

// Function to calculate user level from points
function calculateUserLevel(totalPoints: number): number {
  const LEVELS = [
    { level: 1, min: 0, max: 1000 },
    { level: 2, min: 1001, max: 2500 },
    { level: 3, min: 2501, max: 4500 },
    { level: 4, min: 4501, max: 7500 },
    { level: 5, min: 7501, max: 12000 },
    { level: 6, min: 12001, max: 18000 },
    { level: 7, min: 18001, max: 26000 },
    { level: 8, min: 26001, max: 36000 },
    { level: 9, min: 36001, max: 49000 },
    { level: 10, min: 49001, max: 65000 },
    { level: 11, min: 65001, max: 85000 },
    { level: 12, min: 85001, max: 110000 },
    { level: 13, min: 110001, max: 142000 },
    { level: 14, min: 142001, max: 182000 },
    { level: 15, min: 182001, max: 233000 },
    { level: 16, min: 233001, max: 298000 },
    { level: 17, min: 298001, max: 381000 },
    { level: 18, min: 381001, max: 487000 },
    { level: 19, min: 487001, max: 622000 },
    { level: 20, min: 622001, max: Infinity },
  ];

  const currentLevelData =
    LEVELS.find(
      (level) => totalPoints >= level.min && totalPoints <= level.max
    ) || LEVELS[0];

  return currentLevelData.level;
}

// Function to generate a random code
function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const POST = withAuth(
  async (request: NextRequest, auth: AuthContext) => {
    try {
      const supabase = getSupabaseAdmin();

      // Get user's current points to determine level
      const { data: userPoints, error: pointsError } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", auth.userId)
        .single();

      if (pointsError) {
        console.error("Error fetching user points:", pointsError);
        return NextResponse.json(
          { error: "Failed to fetch user level" },
          { status: 500 }
        );
      }

      const totalPoints = (userPoints as any)?.total_points ?? 0;
      const userLevel = calculateUserLevel(totalPoints);
      const maxCodes = getMaxCodesForLevel(userLevel);

      // Check how many codes the user has already generated
      const { data: existingCodes, error: codesError } = await supabase
        .from("access_codes")
        .select("id")
        .eq("created_by_user_id", auth.userId);

      if (codesError) {
        console.error("Error fetching existing codes:", codesError);
        return NextResponse.json(
          { error: "Failed to check existing codes" },
          { status: 500 }
        );
      }

      const currentCodeCount = existingCodes?.length || 0;

      if (currentCodeCount >= maxCodes) {
        return NextResponse.json(
          {
            error: "Code limit reached",
            message: `You can only generate ${maxCodes} codes at level ${userLevel}`,
            currentCount: currentCodeCount,
            maxCodes: maxCodes,
            userLevel: userLevel,
          },
          { status: 400 }
        );
      }

      // Generate a unique code
      let newCode: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      while (!isUnique && attempts < maxAttempts) {
        newCode = generateReferralCode();
        const fullCodeToCheck = `SF-${newCode}`;

        // Check if code already exists
        const { data: existingCode } = await supabase
          .from("access_codes")
          .select("id")
          .eq("code", fullCodeToCheck)
          .single();

        if (!existingCode) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        return NextResponse.json(
          { error: "Failed to generate unique code. Please try again." },
          { status: 500 }
        );
      }

      // Create the new referral code with SF- prefix
      const fullCode = `SF-${newCode!}`;
      const { data: newReferralCode, error: createError } = await supabase
        .from("access_codes")
        .insert({
          code: fullCode,
          created_by_user_id: auth.userId,
          is_active: true,
          max_uses: 1,
          usage_count: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error("Error creating referral code:", createError);
        return NextResponse.json(
          { error: "Failed to create referral code" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        code: newReferralCode,
        currentCount: currentCodeCount + 1,
        maxCodes: maxCodes,
        userLevel: userLevel,
      });
    } catch (error) {
      console.error("Error in generate referral API:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);
