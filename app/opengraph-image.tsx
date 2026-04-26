// Renders a 1200×630 social-preview image at /opengraph-image when any
// platform (Telegram, Facebook, LinkedIn, Slack, X) requests the link card.
// Next.js auto-injects the meta tags pointing at this file — see
// https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image

import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "MoEYS National Thesis Archive";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const sealPng = readFileSync(join(process.cwd(), "public/moeys-seal.png"));
  const sealDataUri = `data:image/png;base64,${sealPng.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          background: "#f5efe2",
          padding: "0 100px",
          fontFamily: "serif",
        }}
      >
        {/* Seal */}
        <img
          src={sealDataUri}
          width={300}
          height={406}
          style={{ marginRight: 70, objectFit: "contain" }}
        />

        {/* Vertical separator line */}
        <div
          style={{
            width: 1,
            height: 360,
            background: "#c9bfa8",
            marginRight: 70,
          }}
        />

        {/* Text block */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 580 }}>
          <div
            style={{
              fontSize: 24,
              color: "#7a6650",
              letterSpacing: 6,
              textTransform: "uppercase",
            }}
          >
            Kingdom of Cambodia
          </div>

          <div
            style={{
              fontSize: 78,
              fontWeight: 400,
              color: "#1a1a1a",
              lineHeight: 1.05,
              marginTop: 18,
              fontStyle: "italic",
            }}
          >
            National
          </div>
          <div
            style={{
              fontSize: 78,
              fontWeight: 500,
              color: "#1a1a1a",
              lineHeight: 1.05,
            }}
          >
            Thesis Archive
          </div>

          <div
            style={{
              fontSize: 24,
              color: "#7a6650",
              marginTop: 36,
              lineHeight: 1.4,
            }}
          >
            Ministry of Education, Youth and Sport
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#9d8a6f",
              marginTop: 6,
              fontFamily: "monospace",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Department of Research &amp; Innovation
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
