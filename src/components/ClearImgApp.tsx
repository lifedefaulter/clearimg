"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "ready" | "uploading" | "processing" | "done" | "error";
type Screen = "landing" | "editor";
type View = "compare" | "result" | "erase";

const BUSY_MSGS = [
  "Finding the edgesâ€¦",
  "Snipping pixelsâ€¦",
  "Polishing the cutoutâ€¦",
  "Almost thereâ€¦",
];

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 20 * 1024 * 1024;

const CHECKER =
  "conic-gradient(var(--checker) 25%, transparent 0 50%, var(--checker) 0 75%, transparent 0) 0 0 / 22px 22px repeat, var(--bg2)";
const CHECKER_SM =
  "conic-gradient(var(--checker) 25%, transparent 0 50%, var(--checker) 0 75%, transparent 0) 0 0 / 12px 12px repeat, var(--card)";

const display: React.CSSProperties = {
  fontFamily: "var(--font-fredoka), sans-serif",
};

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "2px solid var(--line)",
  borderRadius: 20,
  boxShadow: "4px 4px 0 var(--hard)",
  padding: 16,
};

const stickerBtn: React.CSSProperties = {
  border: "2px solid var(--line)",
  boxShadow: "4px 4px 0 var(--hard)",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 600,
  ...display,
};

function fmtSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? (bytes / 1024 / 1024).toFixed(1) + " MB"
    : Math.max(1, Math.round(bytes / 1024)) + " KB";
}

function typeLabel(t: string): string {
  return (
    { "image/png": "PNG", "image/jpeg": "JPG", "image/webp": "WebP" }[t] ??
    "Image"
  );
}

export function ClearImgApp() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [meta, setMeta] = useState<{
    name: string;
    type: string;
    size: number;
    w: number;
    h: number;
  } | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("ready");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [quality, setQuality] = useState<"preview" | "hd">("hd");
  const [bgChoice, setBgChoice] = useState<string>("transparent");
  const [customBg, setCustomBg] = useState("#F3E8FF");
  const [view, setView] = useState<View>("result");
  const [comparePos, setComparePos] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [brushMode, setBrushMode] = useState<"erase" | "restore">("erase");
  const [brushSize, setBrushSize] = useState(36);
  const [undoCount, setUndoCount] = useState(0);
  const [downloadFormat, setDownloadFormat] = useState<"png" | "jpg" | "webp">(
    "png"
  );
  const [narrow, setNarrow] = useState(false);

  const fileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const compareDraggingRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const origImgRef = useRef<HTMLImageElement | null>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const originalUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  originalUrlRef.current = originalUrl;
  resultUrlRef.current = resultUrl;

  const isBusy = status === "uploading" || status === "processing";
  const isDone = status === "done";

  // ---------- theme ----------
  useEffect(() => {
    if (document.documentElement.getAttribute("data-theme") === "dark") {
      setThemeState("dark");
    }
  }, []);

  const toggleTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("clearimg-theme", t);
    } catch {}
    setThemeState(t);
  };

  // ---------- timers ----------
  useEffect(() => {
    if (!isBusy) return;
    setElapsed(0);
    setMsgIdx(0);
    const t1 = setInterval(() => setElapsed((e) => e + 1), 1000);
    const t2 = setInterval(
      () => setMsgIdx((i) => (i + 1) % BUSY_MSGS.length),
      1800
    );
    return () => {
      clearInterval(t1);
      clearInterval(t2);
    };
  }, [isBusy]);

  // ---------- responsive ----------
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---------- paste ----------
  const selectFile = useCallback((f: File) => {
    if (!ACCEPTED.includes(f.type)) {
      setPickError("That file type isnâ€™t supported â€” try PNG, JPG, or WebP.");
      setDragOver(false);
      return;
    }
    if (f.size > MAX_SIZE) {
      setPickError("That image is over 20MB â€” try a smaller one.");
      setDragOver(false);
      return;
    }
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    const url = URL.createObjectURL(f);
    fileRef.current = f;
    undoStackRef.current = [];
    const img = new Image();
    img.onload = () => {
      origImgRef.current = img;
      setMeta({
        name: f.name,
        type: f.type,
        size: f.size,
        w: img.naturalWidth,
        h: img.naturalHeight,
      });
    };
    img.src = url;
    setMeta({ name: f.name, type: f.type, size: f.size, w: 0, h: 0 });
    setOriginalUrl(url);
    setResultUrl(null);
    setScreen("editor");
    setStatus("ready");
    setError(null);
    setPickError(null);
    setDragOver(false);
    setView("result");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setUndoCount(0);
    setProgress(0);
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items ?? [];
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) {
            selectFile(f);
            break;
          }
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [selectFile]);

  // ---------- processing ----------
  const finishResult = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setResultUrl(url);
    setStatus("done");
    setView("compare");
    setComparePos(50);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const process = () => {
    const f = fileRef.current;
    if (!f || isBusy) return;
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    setResultUrl(null);
    setStatus("uploading");
    setProgress(0);
    setError(null);
    setView("result");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setUndoCount(0);

    const fd = new FormData();
    fd.append("file", f);
    fd.append("format", "png"); // backdrop + format applied client-side at export
    fd.append("quality", quality);

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
        finishResult(xhr.response as Blob);
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
      setError("Network error â€” check your connection and try again.");
      setStatus("error");
    };
    xhr.send(fd);
  };

  // ---------- eraser ----------
  useEffect(() => {
    if (view !== "erase") return;
    const canvas = canvasRef.current;
    const url = resultUrlRef.current;
    if (!canvas || !url) return;
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
    img.src = url;
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
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      setResultUrl(URL.createObjectURL(blob));
    }, "image/png");
  };

  const onEraseDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    try {
      undoStackRef.current.push(
        ctx.getImageData(0, 0, canvas.width, canvas.height)
      );
      if (undoStackRef.current.length > 10) undoStackRef.current.shift();
      setUndoCount(undoStackRef.current.length);
    } catch {}
    drawingRef.current = true;
    const p = canvasPoint(e);
    lastPtRef.current = p;
    strokeAt(p.x, p.y, (brushSize / 2) * p.scale);
  };

  const onEraseMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = canvasPoint(e);
    const r = (brushSize / 2) * p.scale;
    const last = lastPtRef.current ?? p;
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    const steps = Math.max(1, Math.ceil(dist / (r / 2)));
    for (let i = 1; i <= steps; i++) {
      strokeAt(
        last.x + (p.x - last.x) * (i / steps),
        last.y + (p.y - last.y) * (i / steps),
        r
      );
    }
    lastPtRef.current = p;
  };

  const onEraseUp = () => {
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

  // ---------- compare ----------
  const updateCompare = (clientX: number) => {
    const el = compareRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setComparePos(
      Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
    );
  };

  // ---------- download ----------
  const download = () => {
    const url = resultUrlRef.current;
    if (!url) return;
    const base = (meta?.name ?? "image").replace(/\.[^.]+$/, "");
    const finish = (href: string, ext: string) => {
      const a = document.createElement("a");
      a.href = href;
      a.download = `clearimg-${base}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    const transparent = bgChoice === "transparent";
    if (downloadFormat === "png" && transparent) {
      finish(url, "png");
      return;
    }
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      if (!transparent || downloadFormat === "jpg") {
        ctx.fillStyle = transparent ? "#FFFFFF" : bgChoice;
        ctx.fillRect(0, 0, c.width, c.height);
      }
      ctx.drawImage(img, 0, 0);
      const mime =
        downloadFormat === "jpg"
          ? "image/jpeg"
          : downloadFormat === "webp"
            ? "image/webp"
            : "image/png";
      c.toBlob(
        (blob) => {
          if (blob) {
            const u = URL.createObjectURL(blob);
            finish(u, downloadFormat);
            setTimeout(() => URL.revokeObjectURL(u), 5000);
          }
        },
        mime,
        0.95
      );
    };
    img.src = url;
  };

  // ---------- reset ----------
  const clearAll = () => {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    fileRef.current = null;
    origImgRef.current = null;
    undoStackRef.current = [];
    setScreen("landing");
    setOriginalUrl(null);
    setResultUrl(null);
    setStatus("ready");
    setError(null);
    setPickError(null);
    setProgress(0);
    setMeta(null);
    setView("result");
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setUndoCount(0);
  };

  // ---------- derived ----------
  const stageBg = bgChoice === "transparent" ? CHECKER : bgChoice;
  const fitBg = (url: string | null): React.CSSProperties => ({
    width: "100%",
    height: "100%",
    backgroundImage: url ? `url("${url}")` : undefined,
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
  });

  const statusChip = {
    ready: { label: "Ready", bg: "var(--bg2)", color: "var(--muted)" },
    uploading: {
      label: `Uploading ${progress}%`,
      bg: "var(--sunny)",
      color: "#2B2440",
    },
    processing: { label: "Processing", bg: "var(--sunny)", color: "#2B2440" },
    done: { label: "Done", bg: "var(--mint)", color: "#FFFFFF" },
    error: { label: "Error", bg: "var(--coral)", color: "#FFFFFF" },
  }[status];

  const swatches: { v: string; label: string; bg: string }[] = [
    { v: "transparent", label: "Transparent", bg: CHECKER_SM },
    { v: "#FFFFFF", label: "White", bg: "#FFFFFF" },
    { v: "#111111", label: "Black", bg: "#111111" },
    { v: "#FF6B5E", label: "Coral", bg: "#FF6B5E" },
    { v: "#FFC53D", label: "Sunny", bg: "#FFC53D" },
    { v: "#22B58C", label: "Mint", bg: "#22B58C" },
    { v: "#6C4CF1", label: "Violet", bg: "#6C4CF1" },
    { v: customBg, label: `Custom: ${customBg}`, bg: customBg },
  ];

  const seg = (active: boolean): React.CSSProperties => ({
    border: `2px solid ${active ? "var(--line)" : "var(--soft)"}`,
    background: active ? "var(--bg2)" : "transparent",
    color: active ? "var(--ink)" : "var(--muted)",
    cursor: "pointer",
    fontFamily: "inherit",
  });

  // ================= RENDER =================
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      {/* Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--bg)",
          borderBottom: "2px solid var(--soft)",
        }}
      >
        <div
          style={{
            maxWidth: 1360,
            margin: "0 auto",
            padding: "0 20px",
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (!isBusy) clearAll();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--primary)",
                border: "2px solid var(--line)",
                boxShadow: "3px 3px 0 var(--hard)",
                transform: "rotate(-6deg)",
                fontWeight: 700,
                fontSize: 18,
                color: "#FFFFFF",
                ...display,
              }}
            >
              Ci
            </span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontWeight: 600, fontSize: 20, ...display }}>
                ClearImg
              </span>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                backgrounds, begone
              </span>
            </span>
          </a>
          <nav style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {screen === "landing" ? (
              <>
                <a
                  href="#how"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--muted)",
                    textDecoration: "none",
                  }}
                >
                  How it works
                </a>
                <a
                  href="#api"
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--muted)",
                    textDecoration: "none",
                  }}
                >
                  API
                </a>
              </>
            ) : (
              <button
                type="button"
                onClick={clearAll}
                className="btn-sticker"
                style={{
                  ...stickerBtn,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 16px",
                  fontSize: 14,
                  color: "var(--ink)",
                  background: "var(--card)",
                  boxShadow: "3px 3px 0 var(--hard)",
                  fontFamily: "inherit",
                  fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                New image
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="btn-sticker"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 999,
                background: "var(--card)",
                border: "2px solid var(--line)",
                boxShadow: "3px 3px 0 var(--hard)",
                cursor: "pointer",
                color: "var(--ink)",
              }}
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) selectFile(f);
          e.target.value = "";
        }}
      />

      {screen === "landing" ? (
        <main style={{ flex: 1 }}>
          {/* Hero */}
          <section style={{ position: "relative", overflow: "hidden", padding: "64px 20px 72px" }}>
            <div style={{ position: "absolute", top: 90, left: "6%", width: 52, height: 52, borderRadius: "50%", background: "var(--coral)", border: "2px solid var(--line)", opacity: 0.9, animation: "cc-float 5s ease-in-out infinite" }} />
            <div style={{ position: "absolute", top: 200, right: "8%", width: 44, height: 44, background: "var(--sunny)", border: "2px solid var(--line)", borderRadius: 10, ["--rot" as string]: "45deg", transform: "rotate(45deg)", animation: "cc-float 6s ease-in-out infinite 0.8s" }} />
            <div style={{ position: "absolute", bottom: 120, left: "12%", width: 36, height: 36, borderRadius: "50%", border: "8px solid var(--mint)", animation: "cc-float 7s ease-in-out infinite 1.6s" }} />
            <div style={{ position: "absolute", bottom: 90, right: "14%", width: 26, height: 26, borderRadius: "50%", background: "var(--primary)", border: "2px solid var(--line)", animation: "cc-float 5.5s ease-in-out infinite 0.4s" }} />

            <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative" }}>
              <h1 style={{ fontWeight: 600, fontSize: "clamp(38px, 6vw, 62px)", lineHeight: 1.08, margin: 0, letterSpacing: -0.5, ...display }}>
                Cut the{" "}
                <span style={{ display: "inline-block", background: "var(--sunny)", color: "#2B2440", padding: "2px 14px", borderRadius: 14, border: "2px solid var(--line)", transform: "rotate(-2deg)", boxShadow: "3px 3px 0 var(--hard)" }}>
                  background
                </span>
                .
                <br />
                Keep the magic.
              </h1>
              <p style={{ fontSize: 19, color: "var(--muted)", margin: "20px auto 0", maxWidth: 540, lineHeight: 1.55 }}>
                Upload a photo and get a crisp transparent cutout in seconds â€”
                processed on our servers, sharp down to the last hair.
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) selectFile(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  margin: "40px auto 0",
                  maxWidth: 620,
                  background: "var(--card)",
                  border: `3px dashed ${dragOver ? "var(--primary)" : "var(--soft)"}`,
                  borderRadius: 28,
                  boxShadow: "6px 6px 0 var(--hard)",
                  padding: "48px 28px",
                  cursor: "pointer",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
                  <div style={{ width: 76, height: 76, borderRadius: 22, background: "var(--bg2)", border: "2px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(3deg)" }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 7.5 12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <span
                    className="btn-sticker"
                    style={{ ...stickerBtn, display: "inline-block", padding: "14px 30px", background: "var(--primary)", color: "#FFFFFF", fontSize: 18 }}
                  >
                    Choose an image
                  </span>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>
                    â€¦or drop it here, or paste from clipboard
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {["PNG", "JPG", "WebP", "up to 20MB"].map((c) => (
                      <span key={c} style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999, background: "var(--bg2)", border: "1.5px solid var(--soft)", color: "var(--muted)" }}>
                        {c}
                      </span>
                    ))}
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999, background: "var(--mint)", border: "1.5px solid var(--line)", color: "#FFFFFF" }}>
                      free to try
                    </span>
                  </div>
                </div>
              </div>
              {pickError && (
                <p role="alert" style={{ margin: "16px auto 0", maxWidth: 620, padding: "10px 16px", borderRadius: 14, background: "var(--card)", border: "2px solid var(--coral)", color: "var(--coral)", fontSize: 14, fontWeight: 600 }}>
                  {pickError}
                </p>
              )}
            </div>
          </section>

          {/* How it works */}
          <section id="how" style={{ padding: "56px 20px", background: "var(--bg2)", borderTop: "2px solid var(--soft)", borderBottom: "2px solid var(--soft)" }}>
            <div style={{ maxWidth: 1000, margin: "0 auto" }}>
              <h2 style={{ fontWeight: 600, fontSize: 34, textAlign: "center", margin: 0, ...display }}>
                Three steps. Zero fuss.
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 22, marginTop: 40 }}>
                {[
                  { badge: "1 Â· Upload", color: "var(--coral)", text: "#FFFFFF", rot: "-3deg", copy: "Drop in any PNG, JPG, or WebP. Product shots, portraits, pets â€” all welcome." },
                  { badge: "2 Â· We snip", color: "var(--sunny)", text: "#2B2440", rot: "2deg", copy: "Our servers trace the edges in HD â€” no laggy in-browser processing, no quality tradeoffs." },
                  { badge: "3 Â· Download", color: "var(--mint)", text: "#FFFFFF", rot: "-2deg", copy: "Compare before & after, touch up edges, pick a backdrop color, and export." },
                ].map((s) => (
                  <div key={s.badge} style={{ ...card, borderRadius: 22, boxShadow: "5px 5px 0 var(--hard)", padding: 26, position: "relative" }}>
                    <span style={{ position: "absolute", top: -14, left: 22, padding: "3px 14px", borderRadius: 999, background: s.color, color: s.text, border: "2px solid var(--line)", fontWeight: 600, fontSize: 14, transform: `rotate(${s.rot})`, ...display }}>
                      {s.badge}
                    </span>
                    <p style={{ margin: "16px 0 0", color: "var(--muted)", fontSize: 15, lineHeight: 1.6 }}>{s.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* API */}
          <section id="api" style={{ padding: "64px 20px" }}>
            <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 36, alignItems: "center" }}>
              <div>
                <h2 style={{ fontWeight: 600, fontSize: 34, margin: 0, ...display }}>
                  Same magic, <span style={{ color: "var(--primary)" }}>by API</span>
                </h2>
                <p style={{ margin: "16px 0 0", color: "var(--muted)", fontSize: 16, lineHeight: 1.6 }}>
                  The exact engine behind this page. Send an image, get a sharp
                  cutout back â€” no client-side ML required.
                </p>
                <ul style={{ margin: "20px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    ["var(--coral)", "REST endpoint with multipart upload"],
                    ["var(--sunny)", "PNG, JPG & WebP output"],
                    ["var(--mint)", "HD edge refinement for tricky subjects"],
                  ].map(([c, t]) => (
                    <li key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 500 }}>
                      <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, border: "1.5px solid var(--line)", flexShrink: 0 }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: "var(--code-bg)", border: "2px solid var(--line)", borderRadius: 20, boxShadow: "6px 6px 0 var(--hard)", padding: 22, overflowX: "auto" }}>
                <pre style={{ margin: 0, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 13, lineHeight: 1.7, color: "#C9BEF0" }}>
{`POST /v1/remove-background
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data

file=@photo.jpg
format=png
quality=hd
`}
                  <span style={{ color: "#6EE7B7" }}>â†’ 200 image/png</span>
                </pre>
              </div>
            </div>
          </section>

          <footer style={{ borderTop: "2px solid var(--soft)", padding: "24px 20px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
              ClearImg Â· server-side background removal Â· api.clearimg.net
            </p>
          </footer>
        </main>
      ) : (
        /* ============ EDITOR (focus mode) ============ */
        <main
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 1360,
            margin: "0 auto",
            padding: 20,
            display: "grid",
            gridTemplateColumns: narrow ? "1fr" : "300px minmax(0, 1fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Left rail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  role="img"
                  aria-label="Uploaded thumbnail"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    border: "2px solid var(--soft)",
                    backgroundColor: "var(--bg2)",
                    backgroundImage: originalUrl ? `url("${originalUrl}")` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {meta?.name}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                    {meta ? `${typeLabel(meta.type)} Â· ${fmtSize(meta.size)}` : ""}
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
                <div style={{ background: "var(--bg2)", borderRadius: 12, padding: "8px 12px" }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Dimensions
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 600 }}>
                    {meta && meta.w ? `${meta.w} Ã— ${meta.h}` : "â€¦"}
                  </p>
                </div>
                <div style={{ background: "var(--bg2)", borderRadius: 12, padding: "8px 12px" }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Size
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 600 }}>
                    {meta ? fmtSize(meta.size) : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ marginTop: 12, width: "100%", padding: 9, borderRadius: 12, background: "transparent", border: "2px dashed var(--soft)", color: "var(--muted)", fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
              >
                Replace image
              </button>
            </div>

            {/* Settings */}
            <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)" }}>
                  Quality
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(
                    [
                      ["preview", "Fast", "quick preview"],
                      ["hd", "HD", "sharpest edges"],
                    ] as const
                  ).map(([key, label, sub]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setQuality(key)}
                      style={{ ...seg(quality === key), padding: "10px 8px", borderRadius: 14, textAlign: "center" }}
                    >
                      <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{label}</span>
                      <span style={{ display: "block", fontSize: 11, fontWeight: 500, marginTop: 2, opacity: 0.75 }}>{sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)" }}>
                  Backdrop
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {swatches.map((sw) => (
                    <button
                      key={sw.label}
                      type="button"
                      title={sw.label}
                      aria-label={sw.label}
                      onClick={() => setBgChoice(sw.v)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        cursor: "pointer",
                        background: sw.bg,
                        border: `2px solid ${bgChoice === sw.v ? "var(--line)" : "var(--soft)"}`,
                        boxShadow: bgChoice === sw.v ? "0 0 0 3px var(--sunny)" : "none",
                        padding: 0,
                      }}
                    />
                  ))}
                  <label
                    title="Custom color"
                    style={{ position: "relative", width: 34, height: 34, borderRadius: "50%", border: "2px dashed var(--muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "conic-gradient(#FF6B5E, #FFC53D, #22B58C, #6C4CF1, #FF6B5E)" }}
                  >
                    <input
                      type="color"
                      value={customBg}
                      onChange={(e) => {
                        setCustomBg(e.target.value);
                        setBgChoice(e.target.value);
                      }}
                      style={{ position: "absolute", inset: -8, opacity: 0, cursor: "pointer" }}
                    />
                  </label>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                  {bgChoice === "transparent"
                    ? "Transparent â€” perfect for stickers & products"
                    : `Solid backdrop ${bgChoice} (applied on export too)`}
                </p>
              </div>

              <button
                type="button"
                onClick={process}
                disabled={isBusy}
                className="btn-sticker"
                style={{ ...stickerBtn, width: "100%", padding: 15, background: "var(--primary)", color: "#FFFFFF", fontSize: 17, opacity: isBusy ? 0.6 : 1 }}
              >
                {isBusy ? "Workingâ€¦" : isDone ? "Process again" : "Remove background"}
              </button>
            </div>

            {/* Export */}
            {isDone && (
              <div style={{ ...card, animation: "cc-pop 0.25s ease" }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)" }}>
                  Export as
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {(["png", "jpg", "webp"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setDownloadFormat(f)}
                      style={{ ...seg(downloadFormat === f), padding: "9px 4px", borderRadius: 12, fontSize: 13, fontWeight: 700 }}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={download}
                  className="btn-sticker"
                  style={{ ...stickerBtn, marginTop: 12, width: "100%", padding: 14, background: "var(--mint)", color: "#FFFFFF", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 3v13m0 0 5-5m-5 5-5-5M4 21h16" />
                  </svg>
                  Download {downloadFormat.toUpperCase()}
                </button>
              </div>
            )}
          </div>

          {/* Stage */}
          <div
            style={{
              ...card,
              borderRadius: 24,
              boxShadow: "5px 5px 0 var(--hard)",
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: narrow ? "auto" : "calc(100vh - 116px)",
            }}
          >
            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 999, border: "2px solid var(--line)", background: statusChip.bg, color: statusChip.color, fontSize: 13, fontWeight: 700 }}>
                  {statusChip.label}
                </span>
                {isDone && (
                  <div style={{ display: "flex", gap: 6, background: "var(--bg2)", borderRadius: 999, padding: 4, border: "2px solid var(--soft)" }}>
                    {(
                      [
                        ["compare", "Compare"],
                        ["result", "Result"],
                        ["erase", "Touch up"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setView(key);
                          setZoom(1);
                          setPan({ x: 0, y: 0 });
                        }}
                        style={{
                          padding: "6px 16px",
                          borderRadius: 999,
                          border: "none",
                          background: view === key ? "var(--card)" : "transparent",
                          color: view === key ? "var(--ink)" : "var(--muted)",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          boxShadow: view === key ? "2px 2px 0 var(--hard)" : "none",
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isDone && view !== "compare" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.2, z / 1.25))} style={{ width: 32, height: 32, borderRadius: 10, border: "2px solid var(--soft)", background: "var(--bg2)", color: "var(--ink)", fontSize: 17, fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>
                    âˆ’
                  </button>
                  <button type="button" title="Reset zoom" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{ minWidth: 56, height: 32, borderRadius: 10, border: "2px solid var(--soft)", background: "var(--bg2)", color: "var(--ink)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    {Math.round(zoom * 100)}%
                  </button>
                  <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(5, z * 1.25))} style={{ width: 32, height: 32, borderRadius: 10, border: "2px solid var(--soft)", background: "var(--bg2)", color: "var(--ink)", fontSize: 17, fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>
                    +
                  </button>
                </div>
              )}
            </div>

            {/* Erase toolbar */}
            {isDone && view === "erase" && (
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "var(--bg2)", border: "2px solid var(--soft)", borderRadius: 16, padding: "10px 14px" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {(
                    [
                      ["erase", "Erase", "var(--coral)"],
                      ["restore", "Restore", "var(--mint)"],
                    ] as const
                  ).map(([key, label, activeBg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBrushMode(key)}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 999,
                        border: `2px solid ${brushMode === key ? "var(--line)" : "var(--soft)"}`,
                        background: brushMode === key ? activeBg : "var(--card)",
                        color: brushMode === key ? "#FFFFFF" : "var(--muted)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
                  Brush
                  <input type="range" min={8} max={120} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} style={{ width: 120, accentColor: "var(--primary)" }} />
                  <span style={{ minWidth: 34, color: "var(--ink)" }}>{brushSize}px</span>
                </label>
                <button type="button" onClick={undo} disabled={undoCount === 0} style={{ padding: "7px 16px", borderRadius: 999, border: "2px solid var(--soft)", background: "var(--card)", color: "var(--ink)", fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", opacity: undoCount === 0 ? 0.45 : 1 }}>
                  Undo
                </button>
                <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                  Erase removes leftovers Â· Restore paints the original back in
                </span>
              </div>
            )}

            {/* Canvas area */}
            <div style={{ position: "relative", flex: 1, minHeight: 380, borderRadius: 16, overflow: "hidden", border: "2px solid var(--soft)", background: stageBg }}>
              {!isDone && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <div role="img" aria-label="Original upload" style={fitBg(originalUrl)} />
                </div>
              )}

              {isDone && view === "result" && (
                <div
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
                    setPanning(true);
                  }}
                  onPointerMove={(e) => {
                    if (panning && panStartRef.current) {
                      setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y });
                    }
                  }}
                  onPointerUp={() => setPanning(false)}
                  onWheel={(e) => {
                    const dir = e.deltaY < 0 ? 1.1 : 0.9;
                    setZoom((z) => Math.max(0.2, Math.min(5, z * dir)));
                  }}
                  style={{ position: "absolute", inset: 0, cursor: panning ? "grabbing" : "grab", touchAction: "none" }}
                >
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center" }}>
                    <div role="img" aria-label="Cutout result" style={{ ...fitBg(resultUrl), animation: "cc-pop 0.3s ease" }} />
                  </div>
                </div>
              )}

              {isDone && view === "compare" && (
                <div
                  ref={compareRef}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    compareDraggingRef.current = true;
                    updateCompare(e.clientX);
                  }}
                  onPointerMove={(e) => {
                    if (compareDraggingRef.current) updateCompare(e.clientX);
                  }}
                  onPointerUp={() => {
                    compareDraggingRef.current = false;
                  }}
                  style={{ position: "absolute", inset: 0, touchAction: "none", userSelect: "none", cursor: "ew-resize" }}
                >
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                    <div role="img" aria-label="After" style={fitBg(resultUrl)} />
                  </div>
                  <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: `inset(0 ${100 - comparePos}% 0 0)` }}>
                    <div style={{ position: "absolute", inset: 0, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                      <div role="img" aria-label="Before" style={fitBg(originalUrl)} />
                    </div>
                  </div>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: `${comparePos}%`, width: 3, background: "var(--ink)", transform: "translateX(-50%)", zIndex: 5 }}>
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 42, height: 42, borderRadius: "50%", background: "var(--primary)", border: "2px solid var(--line)", boxShadow: "3px 3px 0 var(--hard)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                        <path d="M8 6l-4 6 4 6M16 6l4 6-4 6" />
                      </svg>
                    </div>
                  </div>
                  <span style={{ position: "absolute", top: 12, left: 12, padding: "4px 12px", borderRadius: 999, background: "var(--ink)", color: "var(--card)", fontSize: 12, fontWeight: 700 }}>
                    Before
                  </span>
                  <span style={{ position: "absolute", top: 12, right: 12, padding: "4px 12px", borderRadius: 999, background: "var(--primary)", color: "#FFFFFF", border: "1.5px solid var(--line)", fontSize: 12, fontWeight: 700 }}>
                    After
                  </span>
                </div>
              )}

              {isDone && view === "erase" && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, transform: `scale(${zoom})`, transformOrigin: "center" }}>
                  <canvas
                    ref={canvasRef}
                    onPointerDown={onEraseDown}
                    onPointerMove={onEraseMove}
                    onPointerUp={onEraseUp}
                    style={{ maxWidth: "100%", maxHeight: "100%", touchAction: "none", cursor: "crosshair" }}
                  />
                </div>
              )}

              {/* Busy overlay */}
              {isBusy && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "var(--overlay)", backdropFilter: "blur(3px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    {["var(--coral)", "var(--sunny)", "var(--mint)"].map((c, i) => (
                      <span key={c} style={{ width: 16, height: 16, borderRadius: "50%", background: c, border: "2px solid var(--line)", animation: `cc-bounce 1s ease-in-out infinite ${i * 0.15}s` }} />
                    ))}
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 19, ...display }}>
                    {status === "uploading" ? "Beaming your image upâ€¦" : BUSY_MSGS[msgIdx]}
                  </p>
                  {status === "uploading" && (
                    <div style={{ width: 220, height: 10, borderRadius: 999, background: "var(--bg2)", border: "2px solid var(--line)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 999, background: "var(--primary)", width: `${progress}%`, transition: "width 0.2s ease" }} />
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
                    {elapsed >= 4 ? `${elapsed}s â€” HD usually takes under 10s` : "\u00A0"}
                  </p>
                </div>
              )}

              {/* Error overlay */}
              {status === "error" && (
                <div style={{ position: "absolute", inset: 0, zIndex: 10, background: "var(--overlay)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "auto" }}>
                  <div role="alert" style={{ maxWidth: 480, background: "var(--card)", border: "2px solid var(--coral)", borderRadius: 20, boxShadow: "5px 5px 0 var(--hard)", padding: 24, textAlign: "center" }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 20, color: "var(--coral)", ...display }}>
                      Hmm, that didn&rsquo;t work
                    </p>
                    <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{error}</p>
                    <button
                      type="button"
                      onClick={process}
                      className="btn-sticker"
                      style={{ ...stickerBtn, marginTop: 18, padding: "10px 22px", background: "var(--primary)", color: "#FFFFFF", fontSize: 14, boxShadow: "3px 3px 0 var(--hard)" }}
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

