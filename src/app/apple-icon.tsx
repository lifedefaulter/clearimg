import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default async function AppleIcon() {
  const fredoka = await readFile(
    join(process.cwd(), "src/assets/Fredoka-SemiBold.ttf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#faf6f0",
          fontFamily: "Fredoka",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 34,
            background: "#6c4cf1",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 62,
            fontWeight: 600,
            transform: "rotate(-6deg)",
            boxShadow: "0 20px 40px -12px rgba(108,76,241,0.5)",
          }}
        >
          Ci
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Fredoka",
          data: fredoka,
          style: "normal",
          weight: 600,
        },
      ],
    }
  );
}
