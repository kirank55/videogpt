import { getAnimatedStyle } from "@/lib/ui/renderer/animation";
import type { ParticleEvent } from "@/lib/ui/renderer/types";

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Particle rendering ───────────────────────────────────────────────────────

export function drawParticles(
  context: CanvasRenderingContext2D,
  event: ParticleEvent,
  time: number,
) {
  const { opacity } = getAnimatedStyle(event, time);
  const eventDuration = Math.max(event.end - event.start, 0.0001);
  const elapsed = time - event.start;

  // Global opacity from event animation
  if (opacity <= 0) return;

  context.save();

  // Shadow / glow
  if (event.shadow) {
    context.shadowColor = event.shadow.color;
    context.shadowBlur = event.shadow.blur;
    context.shadowOffsetX = event.shadow.offsetX ?? 0;
    context.shadowOffsetY = event.shadow.offsetY ?? 0;
  }

  const opacityMin = event.particleOpacity?.min ?? 0.3;
  const opacityMax = event.particleOpacity?.max ?? 1.0;

  for (let i = 0; i < event.count; i++) {
    const rng = mulberry32(event.seed + i);

    // Derive per-particle properties
    const spawnOffsetX = (rng() - 0.5) * 2 * event.spread.x;
    const spawnOffsetY = (rng() - 0.5) * 2 * event.spread.y;
    const radius =
      event.particleRadius.min +
      rng() * (event.particleRadius.max - event.particleRadius.min);
    const particleBaseOpacity = opacityMin + rng() * (opacityMax - opacityMin);

    // Stagger spawn over first 30% of event lifetime
    const delay = rng() * eventDuration * 0.3;
    const particleElapsed = elapsed - delay;

    if (particleElapsed < 0) continue; // not spawned yet

    // Per-particle drift
    const driftScale = 0.5 + rng() * 1.0; // 50%–150% of base drift
    const px = event.origin.x + spawnOffsetX + event.drift.x * driftScale * particleElapsed;
    const py = event.origin.y + spawnOffsetY + event.drift.y * driftScale * particleElapsed;

    // Fade in over 0.3s from spawn, fade out over last 0.5s of event
    const fadeInEnd = 0.3;
    const fadeOutStart = eventDuration - delay - 0.5;
    let particleOpacity = particleBaseOpacity;

    if (particleElapsed < fadeInEnd) {
      particleOpacity *= particleElapsed / fadeInEnd;
    }
    if (particleElapsed > fadeOutStart && fadeOutStart > 0) {
      const fadeOutDuration = eventDuration - delay - fadeOutStart;
      particleOpacity *= Math.max(
        0,
        1 - (particleElapsed - fadeOutStart) / Math.max(fadeOutDuration, 0.0001),
      );
    }

    const finalOpacity = opacity * particleOpacity;
    if (finalOpacity <= 0) continue;

    context.globalAlpha = finalOpacity;
    context.fillStyle = event.color;
    context.beginPath();
    context.arc(px, py, radius, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}
