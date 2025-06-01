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

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#15161a",
            backgroundImage:
              "linear-gradient(135deg, #15161a 0%, #1a1b23 100%)",
            fontSize: 32,
            fontWeight: 600,
            color: "white",
            position: "relative",
            padding: "80px",
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage:
                "radial-gradient(circle at 25% 25%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255, 99, 132, 0.1) 0%, transparent 50%)",
            }}
          />

          {/* Main Card with 2-Column Layout */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#0000008C",
              borderRadius: "24px",
              border: "1px solid #0000008C",
              padding: "60px",
              maxWidth: "900px",
              width: "100%",
              gap: "60px",
              zIndex: 1,
            }}
          >
            {/* Left Column - Pool Image Thumbnail */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: "0 0 auto",
              }}
            >
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
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    alt="Pool thumbnail"
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
                    fontWeight: "700",
                    background:
                      "linear-gradient(135deg, #7877c6 0%, #ff6384 100%)",
                    color: "white",
                  }}
                >
                  🎉
                </div>
              )}

              {/* Stats Row below thumbnail */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "30px",
                  alignItems: "center",
                  marginTop: "30px",
                }}
              >
                {/* Raised */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "700",
                      color: "#7877c6",
                    }}
                  >
                    {raised}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#a1a1aa",
                    }}
                  >
                    Raised
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    width: "100px",
                    height: "6px",
                    backgroundColor: "#27272a",
                    borderRadius: "3px",
                    overflow: "hidden",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(parseInt(percentage), 100)}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, #7877c6 0%, #ff6384 100%)",
                      borderRadius: "3px",
                    }}
                  />
                </div>

                {/* Target */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "700",
                      color: "#ff6384",
                    }}
                  >
                    {target}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#a1a1aa",
                    }}
                  >
                    Target
                  </div>
                </div>
              </div>

              {/* Percentage */}
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#e4e4e7",
                  marginTop: "15px",
                }}
              >
                {percentage}% Funded
              </div>
            </div>

            {/* Right Column - Pool Name Centered */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                flex: "1",
                textAlign: "center",
                height: "250px", // Match the thumbnail height for alignment
              }}
            >
              {/* Pool Title - Centered in middle */}
              <div style={{ flex: "1", display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    fontSize: "48px",
                    fontWeight: "700",
                    color: "white",
                    lineHeight: 1.2,
                    maxWidth: "400px",
                  }}
                >
                  {title}
                </div>
              </div>

              {/* StageFun Logo - Centered at bottom */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    color: "#7877c6",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  {/* Logo placeholder - you can replace with actual logo */}
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background:
                        "linear-gradient(135deg, #7877c6 0%, #ff6384 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                    }}
                  >
                    🎭
                  </div>
                  StageFun
                </div>
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
