export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.webp";

export type OutputFormat = "png" | "jpg" | "webp";
export type QualityLevel = "preview" | "hd";

export const FORMAT_LABELS: Record<OutputFormat, string> = {
  png: "Transparent PNG",
  jpg: "JPG (white background)",
  webp: "WebP",
};

export const QUALITY_LABELS: Record<QualityLevel, string> = {
  preview: "Preview (fast)",
  hd: "HD (sharp edges)",
};
