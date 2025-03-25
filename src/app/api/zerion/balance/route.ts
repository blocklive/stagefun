import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ZERION_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Zerion API key not configured" },
        { status: 500 }
      );
    }

    // Get wallet positions from Zerion API
    // Using chain_id=monad-test-v2 for Monad testnet
    const response = await fetch(
      `https://api.zerion.io/v1/wallets/${address}/positions/?filter[chain_ids]=monad-test-v2`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString(
            "base64"
          )}`,
          "Content-Type": "application/json",
          "X-Env": "testnet",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Zerion API error details:", errorData);
      throw new Error(`Zerion API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Find the native MON balance from the positions
    const nativePosition = data.data?.find(
      (position: any) => position.id === "base-monad-test-v2-asset-asset"
    );

    const balance =
      nativePosition?.attributes?.quantity?.float?.toString() || "0";

    return NextResponse.json({ balance });
  } catch (error) {
    console.error("Error fetching Zerion balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
