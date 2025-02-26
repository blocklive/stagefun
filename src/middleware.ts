import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  // Get the Privy JWT from the request cookies or headers
  const privyToken = request.cookies.get("privy_token")?.value;

  if (!privyToken) {
    return NextResponse.next();
  }

  // Create a new Supabase client for each request
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Set the Privy JWT as the Supabase auth token
  const { error } = await supabase.auth.setSession({
    access_token: privyToken,
    refresh_token: "",
  });

  if (error) {
    console.error("Error setting Supabase session:", error);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/pools/:path*"],
};
