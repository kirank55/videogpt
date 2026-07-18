/**
 * GifExporter
 *
 * Renders a VideoProject frame-by-frame to an offscreen canvas and encodes
 * the result as an animated GIF using `gifenc` (pure JS, no WASM).
 *
 * GIF limitations:
 *   - 256 colours per frame (palette quantization)
 *   - Max practical fps is 10-15 for reasonable file size
 *   - No audio
 *
 * Default: 12fps, 480px wide (scaled down for size), palette size 256.
 */

export interface GifExportOptions {
  /** Frames per second (default 12 — balances size vs smoothness). */
  fps?: number;
  /** Output width in pixels. Height is scaled proportionally. (default 480) */
  width?: number;
  /** Colour palette size 2–256 (default 256). Lower = smaller file. */
  colors?: number;
  /** Progress callback receiving 0–1. */
  onProgress?: (progress: number) => void;
}

export async function captureCanvasToGif({
  renderFn,
  srcWidth,
  srcHeight,
  duration,
  fps = 12,
  outWidth = 480,
  colors = 256,
  onProgress,
}: {
  renderFn: (ctx: CanvasRenderingContext2D, t: number) => void;
  srcWidth: number;
  srcHeight: number;
  duration: number;
  fps?: number;
  outWidth?: number;
  colors?: number;
  onProgress?: (progress: number) => void;
}): Promise<Blob> {
  // Dynamic import — keeps gifenc out of the main bundle
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");

  // ── Offscreen source canvas (full res) ────────────────────────────────────
  const srcCanvas  = document.createElement("canvas");
  srcCanvas.width  = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext("2d")!;

  // ── Output canvas (scaled down) ───────────────────────────────────────────
  const scale      = outWidth / srcWidth;
  const outHeight  = Math.round(srcHeight * scale);
  const outCanvas  = document.createElement("canvas");
  outCanvas.width  = outWidth;
  outCanvas.height = outHeight;
  const outCtx     = outCanvas.getContext("2d")!;

  // ── GIF encoder ───────────────────────────────────────────────────────────
  const gif = GIFEncoder();
  const delayMs = Math.round(1000 / fps);
  const totalFrames = Math.ceil(duration * fps);

  for (let i = 0; i <= totalFrames; i++) {
    const t = Math.min(i / fps, duration);

    // Render frame at full resolution
    renderFn(srcCtx, t);

    // Scale down to output size
    outCtx.clearRect(0, 0, outWidth, outHeight);
    outCtx.drawImage(srcCanvas, 0, 0, outWidth, outHeight);

    // Extract pixel data
    const imageData = outCtx.getImageData(0, 0, outWidth, outHeight);
    const { data } = imageData;

    // Quantize to palette
    const palette = quantize(data, colors);
    const index   = applyPalette(data, palette);

    gif.writeFrame(index, outWidth, outHeight, {
      palette,
      delay: delayMs,
      dispose: 1,
    });

    onProgress?.(t / duration);

    // Yield to event loop every 5 frames to keep UI responsive
    if (i % 5 === 0) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  gif.finish();

  const bytes = gif.bytes();
  return new Blob([new Uint8Array(bytes)], { type: "image/gif" });
}
