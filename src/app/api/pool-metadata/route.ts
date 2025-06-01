import { NextRequest, NextResponse } from "next/server";
import { getPoolMetadataBySlug } from "../../../lib/services/pool-metadata-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    const pool = await getPoolMetadataBySlug(slug);

    if (!pool) {
      return NextResponse.json({ error: "Pool not found" }, { status: 404 });
    }

    return NextResponse.json(pool);
  } catch (error) {
    console.error("Error fetching pool metadata:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
