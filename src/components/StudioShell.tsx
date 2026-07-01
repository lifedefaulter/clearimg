"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Editor } from "./Editor";
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/constants";

type Theme = "light" | "dark";

/**
 * Client shell: owns the selected file and the landing/studio switch.
 * The SEO landing content is passed in server-rendered via `landing`.
 */
export function StudioShell({ landing }: { landing: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [file, setFile] = useState<File | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Sync with the pre-hydration theme set by the inline script in layout.tsx.
  // Must run post-hydration to avoid a server/client mismatch.
  useEffect(() => {
    if (document.documentElement.getAttribute("data-theme") === "dark") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("clearimg-theme", next);
    } catch {}
    setTheme(next);
  };

  const selectFile = useCallback((f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type as (typeof ACCEPTED_TYPES)[number])) {
      setPickError("That file type isn't supported — try PNG, JPG, or WebP.");
      setDragOver(false);
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setPickError("That image is over 20MB — try a smaller one.");
      setDragOver(false);
      return;
    }
    setPickError(null);
    setDragOver(false);
    setFile(f);
    window.scrollTo({ top: 0 });
  }, []);

  // Paste anywhere
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      for (const item of e.clipboardData?.items ?? []) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
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

  const openPicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED_EXTENSIONS;
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) selectFile(f);
    };
    input.click();
  };

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
          background: "color-mix(in srgb, var(--bg) 88%, transparent)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1.5px solid var(--line-soft)",
        }}
      >
        <div
          style={{
            maxWidth: 1380,
            margin: "0 auto",
            padding: "0 20px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setFile(null);
              window.scrollTo({ top: 0 });
            }}
            aria-label="ClearImg home"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <span
              aria-hidden
              className="font-display"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "var(--primary)",
                boxShadow: "0 6px 16px -6px var(--primary)",
                transform: "rotate(-6deg)",
                fontWeight: 700,
                fontSize: 17,
                color: "#FFFFFF",
              }}
            >
              Ci
            </span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span className="font-display" style={{ fontWeight: 600, fontSize: 19 }}>
                ClearImg
              </span>
              <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 500 }}>
                backgrounds, begone
              </span>
            </span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {file === null ? (
              <span className="ci-nav-links" style={{ display: "flex", gap: 2 }}>
                {[
                  ["#how-it-works", "How it works"],
                  ["#features", "Features"],
                  ["#faq", "FAQ"],
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    style={{
                      padding: "8px 13px",
                      borderRadius: 999,
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--muted)",
                      textDecoration: "none",
                    }}
                  >
                    {label}
                  </a>
                ))}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="ci-btn"
                style={{ padding: "8px 16px", fontSize: 13.5 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                New image
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="ci-btn"
              style={{ width: 38, height: 38, padding: 0 }}
            >
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </header>

      {file === null ? (
        <main style={{ flex: 1 }}>
          {/* Hero */}
          <section style={{ position: "relative", overflow: "hidden", padding: "60px 20px 72px" }}>
            <div aria-hidden style={{ position: "absolute", top: 84, left: "7%", width: 44, height: 44, borderRadius: "50%", background: "var(--coral)", opacity: 0.55, filter: "blur(2px)", animation: "ci-float 6s ease-in-out infinite" }} />
            <div aria-hidden style={{ position: "absolute", top: 190, right: "9%", width: 38, height: 38, background: "var(--sunny)", borderRadius: 10, opacity: 0.6, filter: "blur(1px)", ["--rot" as string]: "45deg", transform: "rotate(45deg)", animation: "ci-float 7s ease-in-out infinite 0.8s" }} />
            <div aria-hidden style={{ position: "absolute", bottom: 110, left: "13%", width: 30, height: 30, borderRadius: "50%", border: "7px solid var(--mint)", opacity: 0.5, animation: "ci-float 8s ease-in-out infinite 1.6s" }} />

            <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative" }}>
              <h1
                className="font-display"
                style={{ fontWeight: 600, fontSize: "clamp(36px, 5.6vw, 58px)", lineHeight: 1.1, margin: 0, letterSpacing: -0.5 }}
              >
                Remove image <span className="ci-hero-badge">backgrounds</span>
                <br />
                free, in HD, in seconds
              </h1>
              <p style={{ fontSize: 18, color: "var(--muted)", margin: "18px auto 0", maxWidth: 560, lineHeight: 1.6 }}>
                Upload a photo and get a crisp transparent cutout — then fix the
                lighting, pick a backdrop, and download every size you need.
                No signup, no watermark.
              </p>

              <div
                className="ci-dropzone"
                data-drag={dragOver}
                role="button"
                tabIndex={0}
                aria-label="Upload an image to remove its background"
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
                onClick={openPicker}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPicker();
                  }
                }}
                style={{ margin: "36px auto 0", maxWidth: 600, padding: "44px 28px" }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <div
                    aria-hidden
                    style={{ width: 68, height: 68, borderRadius: 20, background: "var(--primary-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 7.5 12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                  </div>
                  <span className="ci-btn ci-btn-primary font-display" style={{ padding: "13px 30px", fontSize: 17 }}>
                    Choose an image
                  </span>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--muted)", fontWeight: 500 }}>
                    …or drop it here, or paste from clipboard
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {["PNG", "JPG", "WebP", "up to 20MB", "free"].map((chip) => (
                      <span
                        key={chip}
                        style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999, background: "var(--bg2)", color: "var(--muted)" }}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {pickError && (
                <p
                  role="alert"
                  className="ci-pop"
                  style={{ margin: "16px auto 0", maxWidth: 600, padding: "10px 16px", borderRadius: 14, background: "var(--card)", border: "1.5px solid var(--coral)", color: "var(--coral)", fontSize: 14, fontWeight: 600 }}
                >
                  {pickError}
                </p>
              )}
            </div>
          </section>

          {landing}
        </main>
      ) : (
        <Editor
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          onReplace={openPicker}
        />
      )}
    </div>
  );
}
