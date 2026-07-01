"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { removeBackground } from "@/lib/api";
import {
  FORMAT_LABELS,
  QUALITY_LABELS,
  type OutputFormat,
  type QualityLevel,
} from "@/lib/constants";
import type { ProcessingStatus } from "@/lib/types";
import { ComparisonSlider } from "./ComparisonSlider";
import { DropZone, FilePreview } from "./DropZone";

export function BackgroundTool() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFilename, setResultFilename] = useState<string | null>(null);
  const [format, setFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState<QualityLevel>("hd");
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultUrlRef = useRef<string | null>(null);

  const revokeResultUrl = useCallback(() => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = null;
    }
  }, []);

  const resetResult = useCallback(() => {
    revokeResultUrl();
    setResultUrl(null);
    setResultFilename(null);
    setStatus("idle");
    setError(null);
    setUploadProgress(0);
    setElapsed(0);
  }, [revokeResultUrl]);

  const handleFileSelect = useCallback(
    (selected: File) => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      revokeResultUrl();

      setFile(selected);
      setOriginalUrl(URL.createObjectURL(selected));
      setResultUrl(null);
      setResultFilename(null);
      setStatus("idle");
      setError(null);
    },
    [originalUrl, revokeResultUrl]
  );

  const handleClear = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    revokeResultUrl();
    setFile(null);
    setOriginalUrl(null);
    resetResult();
  }, [originalUrl, revokeResultUrl, resetResult]);

  const handleProcess = useCallback(async () => {
    if (!file) return;

    resetResult();
    setStatus("uploading");

    try {
      const result = await removeBackground(
        file,
        { format, quality },
        (percent) => setUploadProgress(percent)
      );

      resultUrlRef.current = result.url;
      setResultUrl(result.url);
      setResultFilename(result.filename);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }, [file, format, quality, resetResult]);

  useEffect(() => {
    if (status === "uploading" || status === "processing") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, [status]);

  useEffect(() => {
    if (status === "uploading" && uploadProgress >= 100) {
      setStatus("processing");
    }
  }, [status, uploadProgress]);

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      revokeResultUrl();
    };
  }, [originalUrl, revokeResultUrl]);

  const isBusy = status === "uploading" || status === "processing";
  const showResult = status === "done" && originalUrl && resultUrl;

  const handleDownload = () => {
    if (!resultUrl || !resultFilename) return;
    const anchor = document.createElement("a");
    anchor.href = resultUrl;
    anchor.download = resultFilename;
    anchor.click();
  };

  return (
    <div className="w-full">
      {!file ? (
        <DropZone onFileSelect={handleFileSelect} disabled={isBusy} />
      ) : (
        <div className="space-y-6">
          <FilePreview
            file={file}
            previewUrl={originalUrl!}
            onClear={handleClear}
          />

          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Controls */}
            <aside className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <p className="mb-3 text-sm font-medium text-slate-900">
                  Output format
                </p>
                <div className="space-y-2">
                  {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map((key) => (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        format === key
                          ? "border-teal-600 bg-teal-50 text-teal-900"
                          : "border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={key}
                        checked={format === key}
                        onChange={() => setFormat(key)}
                        disabled={isBusy}
                        className="accent-teal-700"
                      />
                      {FORMAT_LABELS[key]}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-slate-900">
                  Quality
                </p>
                <div className="space-y-2">
                  {(Object.keys(QUALITY_LABELS) as QualityLevel[]).map(
                    (key) => (
                      <label
                        key={key}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                          quality === key
                            ? "border-teal-600 bg-teal-50 text-teal-900"
                            : "border-slate-200 text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="quality"
                          value={key}
                          checked={quality === key}
                          onChange={() => setQuality(key)}
                          disabled={isBusy}
                          className="accent-teal-700"
                        />
                        {QUALITY_LABELS[key]}
                        {key === "hd" && (
                          <span className="ml-auto text-xs font-medium text-teal-700">
                            Recommended
                          </span>
                        )}
                      </label>
                    )
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleProcess}
                disabled={isBusy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? (
                  <>
                    <Spinner />
                    {status === "uploading"
                      ? `Uploading… ${uploadProgress}%`
                      : "Enhancing edges…"}
                  </>
                ) : showResult ? (
                  "Process again"
                ) : (
                  "Remove background"
                )}
              </button>

              {showResult && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Try another image
                  </button>
                </div>
              )}
            </aside>

            {/* Preview */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div
                className="mb-3 flex items-center justify-between"
                aria-live="polite"
                aria-atomic="true"
              >
                <StatusBadge status={status} />
                {isBusy && elapsed >= 5 && (
                  <span className="text-xs text-slate-500">
                    Usually under 10 seconds
                  </span>
                )}
              </div>

              {showResult ? (
                <ComparisonSlider
                  beforeSrc={originalUrl}
                  afterSrc={resultUrl}
                />
              ) : (
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={originalUrl!}
                    alt="Original upload"
                    className="h-full w-full object-contain"
                  />
                  {isBusy && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                      <Spinner large />
                      <p className="mt-4 text-sm font-medium text-slate-700">
                        {status === "uploading"
                          ? "Uploading your image…"
                          : "Processing on server…"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Enhancing edges for a sharp cutout
                      </p>
                      {status === "uploading" && (
                        <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-teal-600 transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                  <button
                    type="button"
                    onClick={handleProcess}
                    className="ml-2 font-medium underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky download bar */}
      {showResult && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white p-4 lg:hidden">
          <button
            type="button"
            onClick={handleDownload}
            className="flex w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white"
          >
            Download result
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ProcessingStatus }) {
  const labels: Record<ProcessingStatus, string> = {
    idle: "Ready",
    uploading: "Uploading",
    processing: "Processing",
    done: "Complete",
    error: "Error",
  };

  const colors: Record<ProcessingStatus, string> = {
    idle: "bg-slate-100 text-slate-600",
    uploading: "bg-amber-100 text-amber-800",
    processing: "bg-amber-100 text-amber-800",
    done: "bg-teal-100 text-teal-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors[status]}`}
    >
      {status === "processing" && <Spinner small />}
      {labels[status]}
    </span>
  );
}

function Spinner({
  small,
  large,
}: {
  small?: boolean;
  large?: boolean;
}) {
  const size = large ? "h-8 w-8" : small ? "h-3 w-3" : "h-4 w-4";
  return (
    <svg
      className={`${size} animate-spin text-current`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
