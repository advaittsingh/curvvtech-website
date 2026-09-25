import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Curvvtech — Tech Agency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoData = await readFile(
    join(process.cwd(), "public/images/logo/curvvtech-logo-white.png"),
  );
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(120deg, #303d42 0%, #1B1D1E 42%, #443f32 100%)",
          color: "#FFFFFF",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Soft accent orbs — same palette as the site dark hero */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -160,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(48,61,66,0.95) 0%, rgba(48,61,66,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -240,
            right: -180,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(68,63,50,0.95) 0%, rgba(68,63,50,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 120,
            right: 160,
            width: 260,
            height: 260,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(73,40,253,0.28) 0%, rgba(73,40,253,0) 70%)",
          }}
        />

        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 80px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src={logoSrc}
              width={220}
              height={125}
              alt="Curvvtech"
              style={{ objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
              maxWidth: 920,
            }}
          >
            <div
              style={{
                fontSize: 58,
                fontWeight: 500,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                color: "#FFFFFF",
              }}
            >
              Innovative solutions for bold brands
            </div>
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.4,
                color: "rgba(255, 255, 255, 0.6)",
                fontWeight: 400,
              }}
            >
              Custom software · Web &amp; mobile apps · AI automation · SaaS
              products
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: 22,
                color: "rgba(255, 255, 255, 0.5)",
                fontWeight: 500,
              }}
            >
              curvvtech.com
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#4928FD",
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: 500,
                padding: "14px 28px",
                borderRadius: 9999,
              }}
            >
              Get Started
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
