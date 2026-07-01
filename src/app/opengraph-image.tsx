import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const alt =
  "ClearImg — free AI background remover with HD cutouts, backdrops, and multi-size downloads";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf6f0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 32,
              background: "#6c4cf1",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 700,
              transform: "rotate(-6deg)",
              boxShadow: "0 20px 40px -12px rgba(108,76,241,0.5)",
            }}
          >
            Ci
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 72, fontWeight: 700, color: "#251e3a" }}>
              ClearImg
            </div>
            <div style={{ fontSize: 30, color: "#6f6684" }}>
              backgrounds, begone
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 52,
            fontSize: 38,
            color: "#251e3a",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span
            style={{
              background: "#ffc53d",
              padding: "6px 26px",
              borderRadius: 18,
              transform: "rotate(-2deg)",
              fontWeight: 700,
            }}
          >
            Free
          </span>
          <span>AI background remover · HD · no signup</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
