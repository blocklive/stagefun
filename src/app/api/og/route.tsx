import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title");

    // Health check - if no title provided, return a simple response
    if (!title) {
      return new Response(
        "OG Image API is working. Add ?title=YourTitle to generate an image.",
        {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        }
      );
    }

    const raised = searchParams.get("raised") || "$0";
    const target = searchParams.get("target") || "$0";
    const percentage = searchParams.get("percentage") || "0";
    const poolImageUrl = searchParams.get("imageUrl");
    const tokenSymbol = searchParams.get("tokenSymbol") || "";
    const twitterHandle = searchParams.get("twitterHandle") || "";

    // Log for debugging
    console.log("OG Image generation:", {
      title,
      poolImageUrl,
      tokenSymbol,
      twitterHandle,
      allSearchParams: Object.fromEntries(searchParams.entries()),
    });

    // Get dynamic base URL from the request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const logoUrl = `${baseUrl}/stagefunheader.png`;

    // Ensure title has a value
    const displayTitle = title || "Pool";

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            backgroundColor: "#15161a",
            fontSize: 32,
            fontWeight: 600,
            color: "white",
            padding: "80px",
          }}
        >
          {/* Simple 2-Column Layout */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              background: "linear-gradient(180deg, #0b0123 0%, #190241 100%)",
              borderRadius: "24px",
              padding: "60px",
              width: "100%",
              gap: "60px",
            }}
          >
            {/* Left Column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Thumbnail */}
              {poolImageUrl ? (
                <div
                  style={{
                    width: "400px",
                    height: "320px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    backgroundColor: "#1a1b23",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={poolImageUrl}
                    alt="Pool image"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "400px",
                    height: "320px",
                    borderRadius: "16px",
                    backgroundColor: "#1a1b23",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "64px",
                    background:
                      "linear-gradient(135deg, #7877c6 0%, #ff6384 100%)",
                    color: "white",
                  }}
                >
                  🎉
                </div>
              )}
            </div>

            {/* Right Column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
                flex: 1,
                paddingTop: "20px",
                paddingBottom: "20px",
              }}
            >
              {/* STAGE.FUN Branding */}
              <div
                style={{
                  fontSize: "36px",
                  fontWeight: "900",
                  color: "#FFFFFF",
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  display: "flex",
                }}
              >
                STAGE.FUN
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: "48px",
                  fontWeight: "700",
                  color: "white",
                  textAlign: "center",
                  lineHeight: "1.2",
                  marginTop: "20px",
                  display: "flex",
                }}
              >
                {displayTitle}
              </div>

              {/* Twitter Handle - always render container */}
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "500",
                  color: "#cccccc",
                  marginTop: "30px",
                  display: twitterHandle ? "flex" : "none",
                }}
              >
                @{twitterHandle ? twitterHandle.replace("@", "") : ""}
              </div>

              {/* Token Symbol - always render container */}
              <div
                style={{
                  display: tokenSymbol ? "flex" : "none",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: "700",
                  color: "white",
                  backgroundColor: "#333333",
                  padding: "12px 24px",
                  borderRadius: "12px",
                  marginTop: "30px",
                }}
              >
                ${tokenSymbol}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error("OG Image generation error:", e.message);
    return new Response(`Failed to generate the image: ${e.message}`, {
      status: 500,
    });
  }
}
