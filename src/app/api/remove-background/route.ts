import { NextRequest, NextResponse } from "next/server";
import { ACCEPTED_TYPES, MAX_FILE_SIZE } from "@/lib/constants";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    if (
      file.type &&
      !ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])
    ) {
      return NextResponse.json(
        { error: "Please upload a PNG, JPG, or WebP image." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be under 20MB." },
        { status: 400 }
      );
    }

    const apiUrl = process.env.CLEARIMG_API_URL;
    const apiKey = process.env.CLEARIMG_API_KEY;

    if (!apiUrl) {
      return NextResponse.json(
        {
          error:
            "Background removal service is not configured. Set CLEARIMG_API_URL in your environment.",
        },
        { status: 503 }
      );
    }

    const upstream = new FormData();
    upstream.append("file", file, "upload");

    const format = formData.get("format");
    const quality = formData.get("quality");
    const bgColor = formData.get("bg_color");

    if (typeof format === "string") upstream.append("format", format);
    if (typeof quality === "string") upstream.append("quality", quality);
    if (typeof bgColor === "string") upstream.append("bg_color", bgColor);

    const headers: HeadersInit = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: upstream,
    });

    if (!response.ok) {
      let message = "Processing failed. Please try again.";
      try {
        const json = (await response.json()) as { error?: string; message?: string };
        message = json.error ?? json.message ?? message;
      } catch {
        // upstream may return non-JSON errors
      }
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") ??
      (format === "jpg" || format === "jpeg"
        ? "image/jpeg"
        : format === "webp"
          ? "image/webp"
          : "image/png");

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
