import { NextResponse, NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // Redirect to the new endpoint
  const response = await fetch(
    new URL("/api/get-testnet-tokens", request.url),
    {
      method: "POST",
      headers: request.headers,
      body: request.body,
    }
  );

  // Return the response from the new endpoint
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
