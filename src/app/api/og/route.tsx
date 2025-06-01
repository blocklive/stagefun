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
              backgroundColor: "#0000008C",
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

              {/* Stats */}
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  marginTop: "20px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "20px", color: "#7877c6" }}>
                    {raised}
                  </div>
                  <div style={{ fontSize: "12px", color: "#a1a1aa" }}>
                    Raised
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: "20px", color: "#ff6384" }}>
                    {target}
                  </div>
                  <div style={{ fontSize: "12px", color: "#a1a1aa" }}>
                    Target
                  </div>
                </div>
              </div>
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
                  gap: "10px",
                  marginTop: "40px",
                  fontSize: "24px",
                  color: "#7877c6",
                }}
              >
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
