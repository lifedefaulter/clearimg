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
    a: "Yes. Upload a photo, remove the background in HD, fine-tune it, and download every size you need. No signup, no watermark, no credit card.",
  },
  {
    q: "How does the background remover work?",
    a: "Your image is processed on our own servers. Photographs go to a state-of-the-art AI segmentation model that traces the subject down to individual hair strands, then a refinement pass cleans the edges at full resolution. Signatures, handwriting, and lettering take a different route: a dedicated ink pipeline measures the paper or panel color across the whole page and reads the stroke as a departure from it, which is far more accurate on thin marks than any object model. Nothing runs in your browser, so it is fast even on older devices.",
  },
  {
    q: "Can I remove the background from a signature?",
    a: "Yes, and it is one of the things ClearImg is tuned for. Photograph or scan your signature, upload it, and you get a transparent PNG of just the ink, ready to paste into a contract, PDF, or email footer. Uneven lighting, shadows, paper texture, and show-through from the other side of the page are all handled, because the paper color is estimated per pixel rather than assumed to be white.",
  },
  {
    q: "Why did my text or signature have a faint white outline before?",
    a: "JPEG compression rings every dark stroke with a halo slightly brighter than the surrounding paper. That halo sits exactly as far from the paper color as faint ink does, so it used to be picked up as part of the stroke and shipped as a pale outline, most visible once you placed the cutout on a dark background. ClearImg now checks which side of the paper color each pixel falls on and keeps only genuine ink, then rebuilds the color of every soft edge pixel from the surrounding stroke instead of the paper. The outline is gone.",
  },
  {
    q: "Does it work on light text or white lettering?",
    a: "Yes. The ink pipeline runs in both directions, so white or light-colored lettering on a dark or colored panel is extracted the same way dark pen on white paper is, with the same clean edges and no colored fringe.",
  },
  {
    q: "Which files and sizes are supported?",
    a: "PNG, JPG, and WebP images up to 20MB. The transparent result keeps the original resolution, and you can export extra sizes (large, social, and thumbnail) in one click, as PNG, JPG, or WebP.",
  },
  {
    q: "What happens to my photos?",
    a: "Images are processed in memory and are not stored. Once your cutout is delivered, the upload is gone from our servers.",
  },
  {
    q: "How do I get the cleanest cutout?",
    a: "ClearImg starts with Best quality so your first cutout uses our strongest edge model. Fast draft remains available when speed matters more than fine detail. For portraits, pets, or anything with fine hair, switch Edges to Soft to keep wispy details. You can touch up any spot with the Erase and Restore brushes.",
  },
  {
    q: "Can I change the background or fix the colors?",
    a: "Yes. Pick a transparent, white, black, or any custom color backdrop, add a soft studio shadow, and adjust brightness, contrast, and saturation before you download.",
  },
];
