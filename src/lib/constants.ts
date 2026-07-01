export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const ACCEPTED_EXTENSIONS = ".png,.jpg,.jpeg,.webp";

export const SITE_URL = "https://clearimg.net";
export const SITE_NAME = "ClearImg";

export type QualityLevel = "preview" | "hd";
export type EdgeMode = "default" | "matting";

export const SIZE_PRESETS = [
  { id: "original", label: "Original", maxEdge: null },
  { id: "2048", label: "Large", maxEdge: 2048 },
  { id: "1080", label: "Social", maxEdge: 1080 },
  { id: "512", label: "Thumbnail", maxEdge: 512 },
] as const;

export type SizePresetId = (typeof SIZE_PRESETS)[number]["id"];

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Is ClearImg really free?",
    a: "Yes. Upload a photo, remove the background in HD, fine-tune it, and download every size you need — no signup, no watermark, no credit card.",
  },
  {
    q: "How does the background remover work?",
    a: "Your photo is processed on our own servers by a state-of-the-art AI segmentation model that traces the subject down to individual hair strands, then a refinement pass cleans the edges at full resolution. Nothing runs in your browser, so it is fast even on older devices.",
  },
  {
    q: "Which files and sizes are supported?",
    a: "PNG, JPG, and WebP images up to 20MB. The transparent result keeps the original resolution, and you can export extra sizes — large, social, and thumbnail — in one click.",
  },
  {
    q: "What happens to my photos?",
    a: "Images are processed in memory and are not stored. Once your cutout is delivered, the upload is gone from our servers.",
  },
  {
    q: "How do I get the cleanest cutout?",
    a: "Use HD quality (the default). For portraits, pets, or anything with fine hair, switch Edges to “Soft” — it runs a slower matting pass that keeps wispy details. You can also touch up any spot with the Erase and Restore brushes.",
  },
  {
    q: "Can I change the background or fix the colors?",
    a: "Yes. Pick a transparent, white, black, or any custom color backdrop, add a soft studio shadow, and adjust brightness, contrast, and saturation before you download.",
  },
];
