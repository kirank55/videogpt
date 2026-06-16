/**
 * MediaRecorderExporter
 *
 * Renders every frame of a VideoProject to an offscreen canvas using the
 * provided render function, captures the canvas stream with MediaRecorder,
 * and resolves with the resulting Blob.
 *
 * @param renderFn   - Called with (ctx, t) for each frame; must draw the
 *                     complete frame synchronously.
 * @param width      - Canvas width in pixels.
 * @param height     - Canvas height in pixels.
 * @param duration   - Total project duration in seconds.
 * @param fps        - Frames per second to render (default 30).
 * @param onProgress - Optional callback receiving [0, 1] progress.
 */
export async function captureCanvasToBlob({
  renderFn,
  width,
  height,
  duration,
  fps = 30,
  onProgress,
}: {
  renderFn: (ctx: CanvasRenderingContext2D, t: number) => void;
  width: number;
  height: number;
  duration: number;
  fps?: number;
  onProgress?: (progress: number) => void;
}): Promise<Blob> {
  // ── 1. Pick the best available MIME type ─────────────────────────────────
  const mimeType = pickMimeType();

  // ── 2. Create offscreen canvas ────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2D context from offscreen canvas.");
  }

  // ── 3. Capture the canvas as a media stream ───────────────────────────────
  // Use a high frame rate; MediaRecorder samples whenever we call requestFrame
  const stream = canvas.captureStream(fps);

  // ── 4. Set up MediaRecorder ───────────────────────────────────────────────
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000, // 8 Mbps — high quality for short clips
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // ── 5. Render frames synchronously, one per animation tick ───────────────
  const totalFrames = Math.ceil(duration * fps);
  const frameDuration = 1000 / fps; // ms per frame

  return new Promise<Blob>((resolve, reject) => {
    recorder.onerror = (e) => reject(e);

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };

    recorder.start();

    let frameIndex = 0;

    function renderNextFrame() {
      if (frameIndex > totalFrames) {
        recorder.stop();
        return;
      }

      const t = Math.min((frameIndex / fps), duration);

      renderFn(ctx!, t);

      onProgress?.(t / duration);

      frameIndex++;

      // Pace frames using setTimeout to avoid flooding the event loop and
      // to give MediaRecorder time to sample from the canvas stream.
      setTimeout(renderNextFrame, frameDuration);
    }

    renderNextFrame();
  });
}

/**
 * Returns the best supported WebM (or MP4) MIME type for MediaRecorder.
 */
export function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  // Fallback — let the browser decide; this may throw on unsupported platforms
  return "video/webm";
}

/**
 * Returns the file extension matching the given MIME type.
 */
export function extensionForMimeType(mimeType: string): string {
  if (mimeType.startsWith("video/mp4")) return "mp4";
  return "webm";
}
