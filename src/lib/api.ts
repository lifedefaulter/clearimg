import type { ProcessOptions, ProcessResult } from "./types";

export async function removeBackground(
  file: File,
  options: ProcessOptions,
  onUploadProgress?: (percent: number) => void
): Promise<ProcessResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("format", options.format);
  formData.append("quality", options.quality);
  if (options.bgColor) {
    formData.append("bg_color", options.bgColor);
  }

  // XMLHttpRequest for upload progress; fetch doesn't expose it cleanly
  const blob = await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/remove-background");
    xhr.responseType = "blob";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as Blob);
        return;
      }

      (xhr.response as Blob)
        .text()
        .then((text: string) => {
          try {
            const json = JSON.parse(text) as { error?: string };
            reject(new Error(json.error ?? "Processing failed. Please try again."));
          } catch {
            reject(new Error("Processing failed. Please try again."));
          }
        })
        .catch(() => reject(new Error("Processing failed. Please try again.")));
    };

    xhr.onerror = () => reject(new Error("Network error. Check your connection."));
    xhr.send(formData);
  });

  const ext = options.format === "jpg" ? "jpg" : options.format;
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const filename = `clearimg-${baseName}.${ext}`;
  const url = URL.createObjectURL(blob);

  return { blob, url, filename };
}
