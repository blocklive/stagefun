import { NextResponse } from "next/server";
import { ZerionSDK } from "../../../../lib/zerion/ZerionSDK";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const chainId = searchParams.get("chainId") || "monad-test-v2";
    const currency = searchParams.get("currency") || "usd";
    const sort = searchParams.get("sort") || "value";
    const onlySimple = searchParams.get("onlySimple") !== "false";
    const onlyNonTrash = searchParams.get("onlyNonTrash") !== "false";

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

    // Initialize the ZerionSDK (with useProxy=false since we're already in a server context)
    const zerionSDK = new ZerionSDK(apiKey, false);

    // Get wallet assets using the SDK
    const data = await zerionSDK.getWalletAssets(address, chainId, {
      onlySimple,
      currency,
      onlyNonTrash,
      sort,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Zerion assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet assets" },
      { status: 500 }
    );
  }
}
