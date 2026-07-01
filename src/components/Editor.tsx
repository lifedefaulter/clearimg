"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Adjustments,
  NEUTRAL_ADJUSTMENTS,
  adjustmentsToCss,
  canvasToBlob,
  isNeutral,
  renderExport,
  triggerDownload,
  type OutputFormat,
} from "@/lib/image";
import {
  SIZE_PRESETS,
  type EdgeMode,
  type QualityLevel,
  type SizePresetId,
} from "@/lib/constants";

type Status = "uploading" | "processing" | "done" | "error";
type View = "compare" | "result" | "touchup";

const BUSY_MSGS = [
  "Finding the edges…",
  "Snipping pixels…",
  "Polishing the cutout…",
  "Almost there…",
];

function fmtSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(1) + " MB"
    : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

function typeLabel(t: string): string {
  return (
    { "image/png": "PNG", "image/jpeg": "JPG", "image/webp": "WebP" }[t] ?? "Image"
  );
}

const SWATCHES: { value: string; label: string }[] = [
  { value: "transparent", label: "Transparent" },
  { value: "#FFFFFF", label: "White" },
  { value: "#111111", label: "Black" },
  { value: "#FF6B5E", label: "Coral" },
  { value: "#FFC53D", label: "Sunny" },
  { value: "#1FB389", label: "Mint" },
  { value: "#6C4CF1", label: "Violet" },
];

export function Editor({
  file,
  onReplace,
}: {
  file: File;
  onReplace: () => void;
}) {
  // ---------- core state ----------
  const [status, setStatus] = useState<Status>("uploading");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrlState] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // settings
  const [quality, setQuality] = useState<QualityLevel>("hd");
  const [edges, setEdges] = useState<EdgeMode>("default");
  const [settingsDirty, setSettingsDirty] = useState(false);

  // studio
  const [backdrop, setBackdrop] = useState<string>("transparent");
  const [customBg, setCustomBg] = useState("#F3E8FF");
  const [shadow, setShadow] = useState(0);
  const [adjust, setAdjust] = useState<Adjustments>(NEUTRAL_ADJUSTMENTS);

  // view
  const [view, setView] = useState<View>("compare");
  const [zoomPct, setZoomPct] = useState(100);

  // touch-up
  const [brushMode, setBrushMode] = useState<"erase" | "restore">("erase");
  const [brushSize, setBrushSize] = useState(36);
  const [undoCount, setUndoCount] = useState(0);

  // export
  const [format, setFormat] = useState<OutputFormat>("png");
  const [sizes, setSizes] = useState<Set<SizePresetId>>(new Set(["original"]));
  const [downloading, setDownloading] = useState(false);

  const [narrow, setNarrow] = useState(false);

  // ---------- refs ----------
  // Single owner for the result object URL: revokes the previous URL on
  // every swap and keeps a ref in sync for event handlers.
  const resultUrlRef = useRef<string | null>(null);
  const setResultUrl = useCallback((url: string | null) => {
    if (resultUrlRef.current && resultUrlRef.current !== url) {
      URL.revokeObjectURL(resultUrlRef.current);
    }
    resultUrlRef.current = url;
    setResultUrlState(url);
  }, []);

  const stageRef = useRef<HTMLDivElement>(null);
  const zoomLayerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);

  const compareRef = useRef<HTMLDivElement>(null);
  const compareDragRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const origImgRef = useRef<HTMLImageElement | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  const isBusy = status === "uploading" || status === "processing";
  const isDone = status === "done";

  // Object URL owned by an effect so StrictMode remounts re-create it.
  // The setState here is intentional: the URL's lifecycle is tied to mount.
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // original image element for restore brush + dims
  useEffect(() => {
    if (!originalUrl) return;
    const img = new Image();
    img.onload = () => {
      origImgRef.current = img;
      setDims({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = originalUrl;
  }, [originalUrl]);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 960);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // busy timers (counters are reset in process())
  useEffect(() => {
    if (!isBusy) return;
    const t1 = setInterval(() => setElapsed((e) => e + 1), 1000);
    const t2 = setInterval(() => setMsgIdx((i) => (i + 1) % BUSY_MSGS.length), 2000);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [isBusy]);

  // ---------- zoom / pan (imperative for smoothness) ----------
  const applyTransform = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const layer = zoomLayerRef.current;
      if (!layer) return;
      const { x, y } = panRef.current;
      layer.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoomRef.current})`;
      const pct = Math.round(zoomRef.current * 100);
      setZoomPct((prev) => (prev === pct ? prev : pct));
    });
  }, []);

  const setZoom = useCallback(
    (next: number, cx?: number, cy?: number) => {
      const clamped = Math.max(0.2, Math.min(6, next));
      const stage = stageRef.current;
      if (stage && cx !== undefined && cy !== undefined) {
        // keep the point under the cursor fixed while zooming
        const rect = stage.getBoundingClientRect();
        const ox = cx - rect.left - rect.width / 2 - panRef.current.x;
        const oy = cy - rect.top - rect.height / 2 - panRef.current.y;
        const ratio = clamped / zoomRef.current;
        panRef.current = {
          x: panRef.current.x + ox - ox * ratio,
          y: panRef.current.y + oy - oy * ratio,
        };
      }
      zoomRef.current = clamped;
      applyTransform();
    },
    [applyTransform]
  );

  const resetViewport = useCallback(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    applyTransform();
  }, [applyTransform]);

  // native wheel listener (React's is passive; we need preventDefault)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (!resultUrlRef.current) return;
      e.preventDefault();
      const dir = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom(zoomRef.current * dir, e.clientX, e.clientY);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [setZoom, isDone]);

  // ---------- processing ----------
  const process = useCallback(() => {
    setStatus("uploading");
    setProgress(0);
    setElapsed(0);
    setMsgIdx(0);
    setError(null);
    setSettingsDirty(false);
    setUndoCount(0);
    undoStackRef.current = [];

    const fd = new FormData();
    fd.append("file", file);
    fd.append("format", "png"); // backdrop/format/corrections applied client-side
    fd.append("quality", quality);
    fd.append("edges", edges);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/remove-background");
    xhr.responseType = "blob";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        setProgress(pct);
        setStatus(pct >= 100 ? "processing" : "uploading");
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setResultUrl(URL.createObjectURL(xhr.response as Blob));
        setStatus("done");
        setView("compare");
        resetViewport();
        return;
      }
      const fallback = `The server returned an error (${xhr.status}). Please try again.`;
      const blob = xhr.response as Blob | null;
      if (blob?.text) {
        blob
          .text()
          .then((txt) => {
            let msg = fallback;
            try {
              const j = JSON.parse(txt) as { error?: string };
              if (j.error) msg = j.error;
            } catch {}
            setError(msg);
            setStatus("error");
          })
          .catch(() => {
            setError(fallback);
            setStatus("error");
          });
      } else {
        setError(fallback);
        setStatus("error");
      }
    };
    xhr.onerror = () => {
      setError("Network error — check your connection and try again.");
      setStatus("error");
    };
    xhr.send(fd);
  }, [file, quality, edges, resetViewport, setResultUrl]);

  // auto-process on mount
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    process();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // revoke result URL on unmount
  useEffect(
    () => () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    },
    []
  );

  // ---------- compare slider (imperative) ----------
  const setComparePos = (clientX: number) => {
    const el = compareRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    el.style.setProperty("--pos", `${pct}%`);
  };

  // ---------- touch-up ----------
  useEffect(() => {
    if (view !== "touchup" || !resultUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      ctxRef.current = ctx;
      undoStackRef.current = [];
      setUndoCount(0);
    };
    img.src = resultUrl;
    // reload only when entering the view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const canvasPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
      scale: canvas.width / rect.width,
    };
  };

  const strokeAt = (x: number, y: number, radius: number) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    if (brushMode === "erase") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (origImgRef.current) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(origImgRef.current, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  };

  const commitCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      setResultUrl(URL.createObjectURL(blob));
    }, "image/png");
  };

  const onBrushDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    try {
      undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undoStackRef.current.length > 12) undoStackRef.current.shift();
      setUndoCount(undoStackRef.current.length);
    } catch {}
    drawingRef.current = true;
    const p = canvasPoint(e);
    lastPtRef.current = p;
    strokeAt(p.x, p.y, (brushSize / 2) * p.scale);
  };

  const onBrushMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = canvasPoint(e);
    const r = (brushSize / 2) * p.scale;
    const last = lastPtRef.current ?? p;
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, r / 2)));
    for (let i = 1; i <= steps; i++) {
      strokeAt(
        last.x + (p.x - last.x) * (i / steps),
        last.y + (p.y - last.y) * (i / steps),
        r
      );
    }
    lastPtRef.current = p;
  };

  const onBrushUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    commitCanvas();
  };

  const undo = () => {
    const ctx = ctxRef.current;
    const stack = undoStackRef.current;
    if (!ctx || !stack.length) return;
    ctx.putImageData(stack.pop()!, 0, 0);
    setUndoCount(stack.length);
    commitCanvas();
  };

  // ---------- export ----------
  const effectiveBackdrop = backdrop === "custom" ? customBg : backdrop;

  const availableSizes = useMemo(() => {
    const longest = dims ? Math.max(dims.w, dims.h) : 0;
    return SIZE_PRESETS.filter((p) => p.maxEdge === null || p.maxEdge < longest).map(
      (p) => {
        if (!dims) return { ...p, dimsLabel: "" };
        const scale = p.maxEdge ? Math.min(1, p.maxEdge / Math.max(dims.w, dims.h)) : 1;
        const w = Math.round(dims.w * scale);
        const h = Math.round(dims.h * scale);
        return { ...p, dimsLabel: `${w} × ${h}` };
      }
    );
  }, [dims]);

  const toggleSize = (id: SizePresetId) => {
    setSizes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const download = async () => {
    const url = resultUrlRef.current;
    if (!url || downloading) return;
    setDownloading(true);
    try {
      const base = file.name.replace(/\.[^.]+$/, "") || "image";
      const chosen = availableSizes.filter((p) => sizes.has(p.id));
      for (let i = 0; i < chosen.length; i++) {
        const preset = chosen[i];
        const canvas = await renderExport(url, {
          format,
          maxEdge: preset.maxEdge,
          background: effectiveBackdrop === "transparent" ? null : effectiveBackdrop,
          adjustments: adjust,
          shadow,
        });
        const blob = await canvasToBlob(canvas, format);
        const suffix = preset.maxEdge ? `-${preset.maxEdge}` : "";
        triggerDownload(blob, `clearimg-${base}${suffix}.${format}`);
        if (i < chosen.length - 1) {
          await new Promise((r) => setTimeout(r, 350));
        }
      }
    } catch {
      setError("Export failed — please try again.");
      setStatus("error");
    } finally {
      setDownloading(false);
    }
  };

  // ---------- derived ----------
  const previewFilter = useMemo(() => {
    const parts: string[] = [];
    const adj = adjustmentsToCss(adjust);
    if (adj !== "none") parts.push(adj);
    if (shadow > 0) {
      parts.push(
        `drop-shadow(0 6px ${10 * shadow}px rgba(20, 15, 40, ${shadow >= 2 ? 0.45 : 0.28}))`
      );
    }
    return parts.length ? parts.join(" ") : "none";
  }, [adjust, shadow]);

  const stageBackground =
    effectiveBackdrop === "transparent" ? undefined : effectiveBackdrop;

  const statusChip = {
    uploading: { label: `Uploading ${progress}%`, bg: "var(--sunny)", color: "#251E3A" },
    processing: { label: "Processing", bg: "var(--sunny)", color: "#251E3A" },
    done: { label: "Done", bg: "var(--mint)", color: "#FFFFFF" },
    error: { label: "Error", bg: "var(--coral)", color: "#FFFFFF" },
  }[status];

  const fit: React.CSSProperties = {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    display: "block",
  };

  // ================= RENDER =================
  return (
    <main
      style={{
        flex: 1,
        width: "100%",
        maxWidth: 1380,
        margin: "0 auto",
        padding: 18,
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "296px minmax(0, 1fr)",
        gap: 18,
        alignItems: "start",
      }}
    >
      {/* ============ Left rail ============ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          order: narrow ? 2 : 1,
        }}
      >
        {/* File card */}
        <div className="ci-card" style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              role="img"
              aria-label="Uploaded thumbnail"
              className="ci-checker-sm"
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                border: "1.5px solid var(--line-soft)",
                backgroundImage: originalUrl ? `url("${originalUrl}")` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  fontWeight: 650,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {file.name}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                {typeLabel(file.type)} · {fmtSize(file.size)}
                {dims ? ` · ${dims.w} × ${dims.h}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onReplace}
              className="ci-btn"
              title="Replace image"
              style={{ padding: "7px 12px", fontSize: 12.5, flexShrink: 0 }}
            >
              Replace
            </button>
          </div>
        </div>

        {/* Cutout settings */}
        <div className="ci-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <p className="ci-label">Quality</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(
                [
                  ["preview", "Fast", "quick draft"],
                  ["hd", "HD", "sharpest edges"],
                ] as const
              ).map(([key, label, sub]) => (
                <button
                  key={key}
                  type="button"
                  className="ci-tile"
                  data-active={quality === key}
                  onClick={() => {
                    setQuality(key);
                    if (isDone && key !== quality) setSettingsDirty(true);
                  }}
                >
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{label}</span>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 500, marginTop: 2, opacity: 0.75 }}>
                    {sub}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="ci-label">Edges</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(
                [
                  ["default", "Crisp", "products, logos"],
                  ["matting", "Soft", "hair, fur"],
                ] as const
              ).map(([key, label, sub]) => (
                <button
                  key={key}
                  type="button"
                  className="ci-tile"
                  data-active={edges === key}
                  onClick={() => {
                    setEdges(key);
                    if (isDone && key !== edges) setSettingsDirty(true);
                  }}
                >
                  <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{label}</span>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 500, marginTop: 2, opacity: 0.75 }}>
                    {sub}
                  </span>
                </button>
              ))}
            </div>
          </div>
          {(settingsDirty || status === "error") && (
            <button
              type="button"
              onClick={process}
              disabled={isBusy}
              className="ci-btn ci-btn-primary font-display ci-pop"
              style={{ width: "100%", padding: 13, fontSize: 15.5 }}
            >
              {isBusy ? "Working…" : "Re-process"}
            </button>
          )}
        </div>

        {/* Studio */}
        <div className="ci-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <p className="ci-label">Backdrop</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {SWATCHES.map((sw) => (
                <button
                  key={sw.value}
                  type="button"
                  title={sw.label}
                  aria-label={`Backdrop: ${sw.label}`}
                  className={sw.value === "transparent" ? "ci-swatch ci-checker-sm" : "ci-swatch"}
                  data-active={backdrop === sw.value}
                  onClick={() => setBackdrop(sw.value)}
                  style={sw.value === "transparent" ? undefined : { background: sw.value }}
                />
              ))}
              <label
                title="Custom color"
                className="ci-swatch"
                data-active={backdrop === "custom"}
                style={{
                  position: "relative",
                  display: "inline-flex",
                  overflow: "hidden",
                  background:
                    backdrop === "custom"
                      ? customBg
                      : "conic-gradient(#FF6B5E, #FFC53D, #1FB389, #6C4CF1, #FF6B5E)",
                }}
              >
                <input
                  type="color"
                  value={customBg}
                  aria-label="Pick a custom backdrop color"
                  onChange={(e) => {
                    setCustomBg(e.target.value);
                    setBackdrop("custom");
                  }}
                  style={{ position: "absolute", inset: -8, opacity: 0, cursor: "pointer" }}
                />
              </label>
            </div>
          </div>

          <div>
            <p className="ci-label">Shadow</p>
            <div className="ci-seg">
              {(
                [
                  [0, "Off"],
                  [1, "Soft"],
                  [2, "Strong"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  data-active={shadow === value}
                  onClick={() => setShadow(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p className="ci-label" style={{ margin: 0 }}>
                Adjust
              </p>
              {!isNeutral(adjust) && (
                <button
                  type="button"
                  onClick={() => setAdjust(NEUTRAL_ADJUSTMENTS)}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--primary)",
                    fontSize: 12,
                    fontWeight: 650,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: 0,
                  }}
                >
                  Reset
                </button>
              )}
            </div>
            {(
              [
                ["brightness", "Brightness"],
                ["contrast", "Contrast"],
                ["saturation", "Saturation"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} style={{ display: "block", marginTop: 10 }}>
                <span
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--muted)",
                    marginBottom: 5,
                  }}
                >
                  {label}
                  <span style={{ color: "var(--ink)" }}>
                    {adjust[key] > 0 ? `+${adjust[key]}` : adjust[key]}
                  </span>
                </span>
                <input
                  type="range"
                  className="ci-slider"
                  min={-100}
                  max={100}
                  value={adjust[key]}
                  aria-label={label}
                  onChange={(e) =>
                    setAdjust((a) => ({ ...a, [key]: Number(e.target.value) }))
                  }
                />
              </label>
            ))}
          </div>
        </div>

        {/* Export */}
        {isDone && (
          <div className="ci-card ci-pop" style={{ padding: 16 }}>
            <p className="ci-label">Format</p>
            <div className="ci-seg" style={{ marginBottom: 14 }}>
              {(["png", "jpg", "webp"] as const).map((f) => (
                <button key={f} type="button" data-active={format === f} onClick={() => setFormat(f)}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            {format !== "png" && effectiveBackdrop === "transparent" && format === "jpg" && (
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                JPG has no transparency — a white backdrop will be used.
              </p>
            )}
            <p className="ci-label">Sizes</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {availableSizes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="ci-size-row"
                  data-active={sizes.has(p.id)}
                  onClick={() => toggleSize(p.id)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span className="tick" aria-hidden>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    {p.label}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>{p.dimsLabel}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={download}
              disabled={downloading || sizes.size === 0}
              className="ci-btn ci-btn-mint font-display"
              style={{ marginTop: 14, width: "100%", padding: 13, fontSize: 15.5 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v13m0 0 5-5m-5 5-5-5M4 21h16" />
              </svg>
              {downloading
                ? "Preparing…"
                : `Download ${sizes.size > 1 ? `${sizes.size} sizes` : format.toUpperCase()}`}
            </button>
          </div>
        )}
      </div>

      {/* ============ Stage ============ */}
      <div
        className="ci-card"
        style={{
          borderRadius: 22,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          minHeight: narrow ? "62vh" : "calc(100vh - 100px)",
          order: narrow ? 1 : 2,
        }}
      >
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "5px 13px",
                borderRadius: 999,
                background: statusChip.bg,
                color: statusChip.color,
                fontSize: 12.5,
                fontWeight: 700,
                transition: "background 0.3s var(--ease)",
              }}
            >
              {statusChip.label}
            </span>
            {isDone && (
              <div className="ci-seg" role="tablist" aria-label="Preview mode">
                {(
                  [
                    ["compare", "Compare"],
                    ["result", "Result"],
                    ["touchup", "Touch up"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={view === key}
                    data-active={view === key}
                    onClick={() => {
                      setView(key);
                      resetViewport();
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {isDone && view !== "compare" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <button type="button" aria-label="Zoom out" className="ci-btn" style={{ width: 30, height: 30, padding: 0, fontSize: 16 }} onClick={() => setZoom(zoomRef.current / 1.25)}>
                −
              </button>
              <button type="button" title="Reset zoom" className="ci-btn" style={{ minWidth: 54, height: 30, padding: "0 8px", fontSize: 12 }} onClick={resetViewport}>
                {zoomPct}%
              </button>
              <button type="button" aria-label="Zoom in" className="ci-btn" style={{ width: 30, height: 30, padding: 0, fontSize: 16 }} onClick={() => setZoom(zoomRef.current * 1.25)}>
                +
              </button>
            </div>
          )}
        </div>

        {/* Touch-up toolbar */}
        {isDone && view === "touchup" && (
          <div
            className="ci-pop"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              background: "var(--bg2)",
              border: "1.5px solid var(--line-soft)",
              borderRadius: 14,
              padding: "9px 12px",
            }}
          >
            <div className="ci-seg" style={{ background: "var(--card)" }}>
              {(
                [
                  ["erase", "Erase"],
                  ["restore", "Restore"],
                ] as const
              ).map(([key, label]) => (
                <button key={key} type="button" data-active={brushMode === key} onClick={() => setBrushMode(key)}>
                  {label}
                </button>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>
              Brush
              <input
                type="range"
                className="ci-slider"
                min={8}
                max={120}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                style={{ width: 110 }}
              />
              <span style={{ minWidth: 32, color: "var(--ink)" }}>{brushSize}px</span>
            </label>
            <button type="button" onClick={undo} disabled={undoCount === 0} className="ci-btn" style={{ padding: "6px 14px", fontSize: 12.5 }}>
              Undo
            </button>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
              Erase removes leftovers · Restore paints the original back
            </span>
          </div>
        )}

        {/* Canvas area */}
        <div
          ref={stageRef}
          className={effectiveBackdrop === "transparent" ? "ci-checker" : undefined}
          style={{
            position: "relative",
            flex: 1,
            minHeight: 360,
            borderRadius: 14,
            overflow: "hidden",
            border: "1.5px solid var(--line-soft)",
            background: stageBackground,
            transition: "background 0.25s var(--ease)",
          }}
        >
          {/* Original while busy */}
          {!isDone && originalUrl && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={originalUrl} alt="Your uploaded photo" style={{ ...fit, opacity: 0.7, filter: isBusy ? "saturate(0.7)" : undefined }} />
            </div>
          )}

          {/* Result view */}
          {isDone && view === "result" && resultUrl && (
            <div
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                panStartRef.current = {
                  x: e.clientX - panRef.current.x,
                  y: e.clientY - panRef.current.y,
                };
              }}
              onPointerMove={(e) => {
                if (panStartRef.current) {
                  panRef.current = {
                    x: e.clientX - panStartRef.current.x,
                    y: e.clientY - panStartRef.current.y,
                  };
                  applyTransform();
                }
              }}
              onPointerUp={() => (panStartRef.current = null)}
              onPointerCancel={() => (panStartRef.current = null)}
              style={{ position: "absolute", inset: 0, cursor: "grab", touchAction: "none" }}
            >
              <div
                ref={zoomLayerRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 18,
                  willChange: "transform",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt="Cutout with background removed" className="ci-pop" style={{ ...fit, filter: previewFilter }} draggable={false} />
              </div>
            </div>
          )}

          {/* Compare view */}
          {isDone && view === "compare" && resultUrl && (
            <div
              ref={compareRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                compareDragRef.current = true;
                setComparePos(e.clientX);
              }}
              onPointerMove={(e) => {
                if (compareDragRef.current) setComparePos(e.clientX);
              }}
              onPointerUp={() => (compareDragRef.current = false)}
              onPointerCancel={() => (compareDragRef.current = false)}
              style={{
                position: "absolute",
                inset: 0,
                touchAction: "none",
                userSelect: "none",
                cursor: "ew-resize",
                ["--pos" as string]: "50%",
              }}
            >
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultUrl} alt="After: background removed" style={{ ...fit, filter: previewFilter }} draggable={false} />
              </div>
              <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: "inset(0 calc(100% - var(--pos)) 0 0)" }}>
                <div style={{ position: "absolute", inset: 0, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
                  {originalUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={originalUrl} alt="Before: original photo" style={fit} draggable={false} />
                  )}
                </div>
              </div>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: "var(--pos)", width: 3, background: "var(--ink)", transform: "translateX(-50%)", zIndex: 5 }}>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--primary)",
                    boxShadow: "var(--shadow-lift)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <path d="M8 6l-4 6 4 6M16 6l4 6-4 6" />
                  </svg>
                </div>
              </div>
              <span style={{ position: "absolute", top: 12, left: 12, padding: "4px 12px", borderRadius: 999, background: "var(--ink)", color: "var(--card)", fontSize: 12, fontWeight: 700 }}>
                Before
              </span>
              <span style={{ position: "absolute", top: 12, right: 12, padding: "4px 12px", borderRadius: 999, background: "var(--primary)", color: "#FFFFFF", fontSize: 12, fontWeight: 700 }}>
                After
              </span>
            </div>
          )}

          {/* Touch-up view */}
          {isDone && view === "touchup" && (
            <div
              ref={zoomLayerRef}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 18,
                willChange: "transform",
              }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={onBrushDown}
                onPointerMove={onBrushMove}
                onPointerUp={onBrushUp}
                onPointerCancel={onBrushUp}
                style={{ maxWidth: "100%", maxHeight: "100%", touchAction: "none", cursor: "crosshair" }}
              />
            </div>
          )}

          {/* Busy overlay */}
          {isBusy && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                background: "var(--overlay)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", gap: 9 }}>
                {["var(--coral)", "var(--sunny)", "var(--mint)"].map((c, i) => (
                  <span
                    key={c}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: c,
                      animation: `ci-bounce 1s ease-in-out infinite ${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
              <p className="font-display" style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>
                {status === "uploading" ? "Beaming your image up…" : BUSY_MSGS[msgIdx]}
              </p>
              {status === "uploading" && (
                <div style={{ width: 210, height: 8, borderRadius: 999, background: "var(--bg2)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      background: "var(--primary)",
                      width: `${progress}%`,
                      transition: "width 0.2s var(--ease)",
                    }}
                  />
                </div>
              )}
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
                {elapsed >= 4 ? `${elapsed}s — HD usually takes under 10s` : " "}
              </p>
            </div>
          )}

          {/* Error overlay */}
          {status === "error" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                background: "var(--overlay)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
                overflow: "auto",
              }}
            >
              <div
                role="alert"
                className="ci-card ci-pop"
                style={{ maxWidth: 460, borderColor: "var(--coral)", padding: 24, textAlign: "center" }}
              >
                <p className="font-display" style={{ margin: 0, fontWeight: 600, fontSize: 19, color: "var(--coral)" }}>
                  Hmm, that didn&rsquo;t work
                </p>
                <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{error}</p>
                <button
                  type="button"
                  onClick={process}
                  className="ci-btn ci-btn-primary font-display"
                  style={{ marginTop: 16, padding: "10px 24px", fontSize: 14 }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
