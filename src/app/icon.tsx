import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default async function Icon() {
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
          fontFamily: "Fredoka",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            background: "#6c4cf1",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 600,
            transform: "rotate(-6deg)",
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
