// Client-side export pipeline: corrections + backdrop + shadow + resize + encode.
// Pixel math instead of ctx.filter — Safari has no CanvasRenderingContext2D.filter.

export type OutputFormat = "png" | "jpg" | "webp";

export interface Adjustments {
  brightness: number; // -100..100, 0 = neutral
  contrast: number; // -100..100
  saturation: number; // -100..100
}

export const NEUTRAL_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
};

export function isNeutral(a: Adjustments): boolean {
  return a.brightness === 0 && a.contrast === 0 && a.saturation === 0;
}

/** CSS filter string for live preview — mirrors applyAdjustments visually. */
export function adjustmentsToCss(a: Adjustments): string {
  if (isNeutral(a)) return "none";
  const b = 1 + a.brightness / 100;
  const c = 1 + a.contrast / 100;
  const s = 1 + a.saturation / 100;
  return `brightness(${b}) contrast(${c}) saturate(${s})`;
}

export function applyAdjustments(data: ImageData, a: Adjustments): void {
  if (isNeutral(a)) return;
  const px = data.data;
  const b = 1 + a.brightness / 100;
  const c = 1 + a.contrast / 100;
  const s = 1 + a.saturation / 100;

  // One LUT covers brightness+contrast for all channels
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    lut[i] = Math.max(0, Math.min(255, (i * b - 128) * c + 128));
  }

  for (let i = 0; i < px.length; i += 4) {
    let r = lut[px[i]];
    let g = lut[px[i + 1]];
    let bl = lut[px[i + 2]];
    if (s !== 1) {
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      r = luma + (r - luma) * s;
      g = luma + (g - luma) * s;
      bl = luma + (bl - luma) * s;
    }
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = bl;
  }
}

export interface ExportOptions {
  format: OutputFormat;
  /** Longest-edge target in px; null = original size */
  maxEdge: number | null;
  /** null/"transparent" = keep alpha (PNG/WebP); hex color otherwise */
  background: string | null;
  adjustments: Adjustments;
  /** 0 = off, 1 = subtle, 2 = strong */
  shadow: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = url;
  });
}

/**
 * Render the cutout to a canvas with all export options applied.
 * Steps: resize -> adjustments -> optional soft shadow -> optional backdrop.
 */
export async function renderExport(
  cutoutUrl: string,
  opts: ExportOptions
): Promise<HTMLCanvasElement> {
  const img = await loadImage(cutoutUrl);
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (opts.maxEdge && Math.max(w, h) > opts.maxEdge) {
    const scale = opts.maxEdge / Math.max(w, h);
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));
  }

  // Subject layer (with corrections baked in)
  const subject = document.createElement("canvas");
  subject.width = w;
  subject.height = h;
  const sctx = subject.getContext("2d")!;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(img, 0, 0, w, h);
  if (!isNeutral(opts.adjustments)) {
    const data = sctx.getImageData(0, 0, w, h);
    applyAdjustments(data, opts.adjustments);
    sctx.putImageData(data, 0, 0);
  }

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;

  const transparent = !opts.background || opts.background === "transparent";
  if (!transparent || opts.format === "jpg") {
    ctx.fillStyle = transparent ? "#FFFFFF" : opts.background!;
    ctx.fillRect(0, 0, w, h);
  }

  if (opts.shadow > 0) {
    const blur = Math.max(6, Math.round(Math.max(w, h) * 0.02)) * opts.shadow;
    const offsetY = Math.max(2, Math.round(Math.max(w, h) * 0.008)) * opts.shadow;
    ctx.save();
    ctx.shadowColor =
      opts.shadow >= 2 ? "rgba(20, 15, 40, 0.45)" : "rgba(20, 15, 40, 0.28)";
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = offsetY;
    ctx.drawImage(subject, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(subject, 0, 0);
  }

  return out;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: OutputFormat
): Promise<Blob> {
  const mime =
    format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed."))),
      mime,
      format === "png" ? undefined : 0.93
    );
  });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
