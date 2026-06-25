import {
  captureCanvasToBlob,
  extensionForMimeType,
  pickMimeType,
} from "@/lib/core/MediaRecorderExporter";
import { captureCanvasToGif } from "@/lib/core/GifExporter";
import { renderProjectFrame } from "@/lib/renderer";
import type { VideoProject } from "@/lib/renderer";

// ── Shared types ──────────────────────────────────────────────────────────────

export type ExportFormat = "video" | "gif";

export type ExportOptions = {
  /** "video" = MP4/WebM via MediaRecorder. "gif" = animated GIF. */
  format?: ExportFormat;
  /** Frames per second. Default 30 for video, 12 for GIF. */
  fps?: number;
  /**
   * GIF only: output width in pixels (height scales proportionally).
   * Default 480.
   */
  gifWidth?: number;
  /** GIF only: colour palette size 2–256. Default 256. */
  gifColors?: number;
  /** Progress callback receiving 0–1. */
  onProgress?: (progress: number) => void;
};

// ── Main export function ──────────────────────────────────────────────────────

/**
 * Exports a VideoProject to an animated file and triggers a browser download.
 *
 * format = "video" → MP4 (Safari) or WebM (Chrome/Firefox) via MediaRecorder
 * format = "gif"   → Animated GIF via gifenc
 */
export async function exportVideo(
  project: VideoProject,
  options: ExportOptions = {},
): Promise<void> {
  const {
    format = "video",
    onProgress,
  } = options;

  const safeName =
    project.name.replace(/[^a-z0-9_\- ]/gi, "_").trim() || "video";

  let blob: Blob;
  let filename: string;

  if (format === "gif") {
    const fps = options.fps ?? 12;
    const gifWidth = options.gifWidth ?? 480;
    const gifColors = options.gifColors ?? 256;

    blob = await captureCanvasToGif({
      renderFn: (ctx, t) => renderProjectFrame(ctx, project, t),
      srcWidth: project.width,
      srcHeight: project.height,
      duration: project.duration,
      fps,
      outWidth: gifWidth,
      colors: gifColors,
      onProgress,
    });

    filename = `${safeName}.gif`;
  } else {
    const fps = options.fps ?? 30;

    blob = await captureCanvasToBlob({
      renderFn: (ctx, t) => renderProjectFrame(ctx, project, t),
      width: project.width,
      height: project.height,
      duration: project.duration,
      fps,
      onProgress,
    });

    const mimeType = pickMimeType();
    const ext = extensionForMimeType(mimeType);
    filename = `${safeName}.${ext}`;
  }

  // ── Trigger download ──────────────────────────────────────────────────────
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
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

// ── Re-export helpers for use in UI ──────────────────────────────────────────
export { pickMimeType, extensionForMimeType } from "@/lib/core/MediaRecorderExporter";
