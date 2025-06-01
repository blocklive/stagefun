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

          {/* Logo/Brand */}
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 40,
              display: "flex",
              alignItems: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "#7877c6",
            }}
          >
            StageFun
          </div>

          {/* Main Content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              maxWidth: "80%",
              zIndex: 1,
            }}
          >
            {/* Pool Title */}
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                marginBottom: 30,
                background: "linear-gradient(135deg, #7877c6 0%, #ff6384 100%)",
                backgroundClip: "text",
                color: "transparent",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>

            {/* Stats Container */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: 40,
                marginBottom: 20,
              }}
            >
              {/* Raised Amount */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: "#7877c6",
                  }}
                >
                  {raised}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: "#a1a1aa",
                  }}
                >
                  Raised
                </div>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: 2,
                  height: 60,
                  backgroundColor: "#3f3f46",
                }}
              />

              {/* Target Amount */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: "#ff6384",
                  }}
                >
                  {target}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    color: "#a1a1aa",
                  }}
                >
                  Target
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: 400,
                height: 8,
                backgroundColor: "#27272a",
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: `${Math.min(parseInt(percentage), 100)}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, #7877c6 0%, #ff6384 100%)",
                  borderRadius: 4,
                }}
              />
            </div>

            {/* Percentage */}
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "#e4e4e7",
              }}
            >
              {percentage}% Funded
            </div>
          </div>

          {/* Call to Action */}
          <div
            style={{
              position: "absolute",
              bottom: 40,
              right: 40,
              fontSize: 20,
              color: "#a1a1aa",
            }}
          >
            Join the Pool →
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
