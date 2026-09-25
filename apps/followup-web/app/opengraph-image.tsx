import { ImageResponse } from "next/og";

export const alt = "FollowUp — Never lose a lead again";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0b1220 0%, #132238 50%, #1a1030 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #38bdf8, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            F
          </div>
          <span style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>
            FollowUp
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Never lose a lead again.
          </div>
          <div style={{ fontSize: 28, lineHeight: 1.4, color: "rgba(255,255,255,0.75)" }}>
            Automated WhatsApp &amp; email follow-ups for sales teams
          </div>
        </div>

        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)" }}>
          followup.curvvtech.com
        </div>
      </div>
    ),
    { ...size },
  );
}
