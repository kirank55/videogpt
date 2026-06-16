import {
  captureCanvasToBlob,
  extensionForMimeType,
  pickMimeType,
} from "@/lib/core/MediaRecorderExporter";
import { renderProjectFrame } from "@/lib/renderer";
import type { VideoProject } from "@/lib/renderer";

export type ExportOptions = {
  fps?: number;
  onProgress?: (progress: number) => void;
};

/**
 * Exports a VideoProject to a WebM (or MP4) file and triggers a browser
 * download.
 *
 * @param project  - The VideoProject to export.
 * @param options  - Optional: fps (default 30), onProgress callback.
 */
export async function exportVideo(
  project: VideoProject,
  options: ExportOptions = {},
): Promise<void> {
  const { fps = 30, onProgress } = options;

  const blob = await captureCanvasToBlob({
    renderFn: (ctx, t) => renderProjectFrame(ctx, project, t),
    width: project.width,
    height: project.height,
    duration: project.duration,
    fps,
    onProgress,
  });

  // ── Trigger download ──────────────────────────────────────────────────────
  const mimeType = pickMimeType();
  const ext = extensionForMimeType(mimeType);
  const safeName = project.name.replace(/[^a-z0-9_\- ]/gi, "_").trim() || "video";
  const filename = `${safeName}.${ext}`;

  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    // Revoke after a short delay to let the download start
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
