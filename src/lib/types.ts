import type { OutputFormat, QualityLevel } from "./constants";

export type ProcessingStatus =
  | "idle"
  | "uploading"
  | "processing"
  | "done"
  | "error";

export interface ProcessOptions {
  format: OutputFormat;
  quality: QualityLevel;
  bgColor?: string;
}

export interface ProcessResult {
  blob: Blob;
  url: string;
  filename: string;
}
