import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get("title") || "Pool";
    const raised = searchParams.get("raised") || "$0";
    const target = searchParams.get("target") || "$0";
    const percentage = searchParams.get("percentage") || "0";
    const poolImageUrl = searchParams.get("imageUrl");
    const tokenSymbol = searchParams.get("tokenSymbol") || "";

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
              }}
            >
              {/* Thumbnail */}
              {poolImageUrl ? (
                <div
                  style={{
                    width: "300px",
                    height: "250px",
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
                    width: "300px",
                    height: "250px",
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

              {/* Token Symbol */}
              {tokenSymbol && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "30px",
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#7877c6",
                    backgroundColor: "#FFFFFF10",
                    padding: "12px 24px",
                    borderRadius: "12px",
                  }}
                >
                  ${tokenSymbol}
                </div>
              )}
            </div>

            {/* Right Column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                  fontWeight: "700",
                  color: "white",
                  textAlign: "center",
                }}
              >
                {title}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "80px",
                }}
              >
                <img
                  src={`${
                    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3066"
                  }/stagefunheader.png`}
                  alt="StageFun Logo"
                  width="48"
                  height="48"
                  style={{
                    width: "48px",
                    height: "48px",
                    imageRendering: "crisp-edges",
                  }}
                />
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
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
