/**
 * VideoProject Layout Analyzer
 *
 * Runs spatial diagnostics on a VideoProject and prints a structured report.
 * Catches coordinate bugs, label misalignment, off-canvas animations, and
 * layer conflicts that are invisible when reading raw JSON.
 *
 * Usage:
 *   npm run analyze                    → analyzes bigDemoProject
 *   npm run analyze -- --project demo  → analyzes demoProject
 */

import { buildProjectFromBrief } from "../lib/agent/brief/buildProjectFromBrief";

const bigDemoProject = buildProjectFromBrief({
  layout: "two-column" as const,
  title: "Client-Server System Layout",
  subtitle: "Web Request Flow Sequence",
  palette: "midnight",
  style: "modern",
  leftHeader: "CLIENT",
  rightHeader: "SERVER",
  leftRows: ["User Browser", "DOM State", "Fetch Client"],
  rightRows: ["Load Balancer", "API Router", "SQL Store"],
  flow: true,
  requestLabel: "POST /auth",
  responseLabel: "201 Created",
  processingSteps: ["Hash Password", "INSERT INTO users"],
  closingLine: "Dynamic Web Sequence Analysis Done.",
}, 15);

const demoProject = buildProjectFromBrief({
  layout: "single-column" as const,
  title: "Simple Architecture Overview",
  blocks: [
    { heading: "Web Layer", description: "Vibrant and interactive client views" },
    { heading: "Service Layer", description: "Microservices orchestration and caching" },
  ],
  palette: "midnight",
  style: "modern",
}, 10);
import type {
  AnimatedValue,
  VideoProject,
  TimelineEvent,
  ShapeEvent,
  TextEvent,
} from "../lib/ui/renderer/types";
import {
  isKeyframed,
  resolveAnimatedBounds,
  isLowOpacityFill,
  getStaticEventBounds,
  getEventBounds,
  type Bounds,
} from "../lib/ui/renderer/geometry";

// ── ANSI colours ──────────────────────────────────────────────────────────────
const R = "\x1b[31m";   // red
const G = "\x1b[32m";   // green
const Y = "\x1b[33m";   // yellow
const B = "\x1b[34m";   // blue
const C = "\x1b[36m";   // cyan
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function ok(msg: string) { return `  ${G}✓${RESET} ${msg}`; }
function warn(msg: string) { return `  ${Y}⚠${RESET} ${msg}`; }
function err(msg: string) { return `  ${R}✗${RESET} ${msg}`; }
function info(msg: string) { return `  ${DIM}ℹ${RESET} ${DIM}${msg}${RESET}`; }

// ── AnimatedValue helpers (thin adapters over the shared geometry seam) ───────

function getAnimRange(av: AnimatedValue | undefined): { min: number; max: number } | null {
  if (!av) return null;
  return resolveAnimatedBounds(av, 0);
}

function describeAV(name: string, av: AnimatedValue | undefined): string | null {
  if (!av) return null;
  if (isKeyframed(av)) {
    const vals = av.keyframes.map((k) => `${k.value}@${k.time}s`).join(" → ");
    return `${name}: keyframes [${vals}]`;
  }
  return `${name}:${av.from}→${av.to} [${av.easing}]`;
}

// ── Bounding box helpers ──────────────────────────────────────────────────────
//
// Delegate to the renderer's geometry module so bounds are computed in one
// place. Particles are the one case the geometry seam excludes (returns null),
// so the analyser keeps a particle-specific branch for its spread-based bbox.

type BBox = { x1: number; y1: number; x2: number; y2: number };

function toBBox(b: Bounds): BBox {
  return { x1: b.left, y1: b.top, x2: b.right, y2: b.bottom };
}

/** Static bounding box — ignores animations. */
function staticBBox(event: TimelineEvent): BBox | null {
  if (event.type === "particle") {
    return {
      x1: event.origin.x - event.spread.x,
      y1: event.origin.y - event.spread.y,
      x2: event.origin.x + event.spread.x,
      y2: event.origin.y + event.spread.y,
    };
  }
  const b = getStaticEventBounds(event);
  return b ? toBBox(b) : null;
}

/**
 * Animated extremes — the absolute min/max canvas footprint the element can
 * occupy across its full animation range.
 */
function animatedBBox(event: TimelineEvent): BBox | null {
  if (event.type === "particle") {
    const x1 = event.origin.x - event.spread.x;
    const y1 = event.origin.y - event.spread.y;
    const x2 = event.origin.x + event.spread.x;
    const y2 = event.origin.y + event.spread.y;
    const txRange = getAnimRange(event.translateX);
    const tyRange = getAnimRange(event.translateY);
    return {
      x1: x1 + (txRange?.min ?? 0),
      y1: y1 + (tyRange?.min ?? 0),
      x2: x2 + (txRange?.max ?? 0),
      y2: y2 + (tyRange?.max ?? 0),
    };
  }
  const b = getEventBounds(event);
  return b ? toBBox(b) : null;
}

// ── Checks ────────────────────────────────────────────────────────────────────

function checkCanvasBounds(event: TimelineEvent, project: VideoProject): string[] {
  const issues: string[] = [];
  const animated = animatedBBox(event);
  const stat = staticBBox(event);
  if (!animated || !stat) return issues;

  const W = project.width;
  const H = project.height;

  // Static position check
  if (stat.x1 < 0) issues.push(err(`static x1 (${Math.round(stat.x1)}) is OFF-CANVAS left`));
  if (stat.x2 > W) issues.push(err(`static x2 (${Math.round(stat.x2)}) is OFF-CANVAS right (canvas: ${W})`));
  if (stat.y1 < 0) issues.push(err(`static y1 (${Math.round(stat.y1)}) is OFF-CANVAS top`));
  if (stat.y2 > H) issues.push(err(`static y2 (${Math.round(stat.y2)}) is OFF-CANVAS bottom (canvas: ${H})`));

  // Animated extremes
  if (animated.x1 < 0) issues.push(warn(`animation drives x1 to ${Math.round(animated.x1)} (off-canvas left at peak)`));
  if (animated.x2 > W) issues.push(warn(`animation drives x2 to ${Math.round(animated.x2)} (off-canvas right at peak)`));
  if (animated.y1 < 0) issues.push(warn(`animation drives y1 to ${Math.round(animated.y1)} (off-canvas top at peak)`));
  if (animated.y2 > H) issues.push(warn(`animation drives y2 to ${Math.round(animated.y2)} (off-canvas bottom at peak)`));

  if (issues.length === 0) {
    issues.push(ok("within canvas bounds (including animation extremes)"));
  }
  return issues;
}

function checkTextFitsInRect(
  textEvent: TextEvent,
  rects: Array<ShapeEvent & { shapeType: "rect" }>,
): string[] {
  const issues: string[] = [];

  // Find any rect that could plausibly contain this text (time overlap + tight padding match).
  // We require text.x to be within [rect.x, rect.x + 80] — i.e. the text starts inside
  // the rect near the left edge. This prevents large background rects from being falsely
  // matched as "parents" of standalone titles or overlay labels.
  const overlapping = rects.filter((r) => {
    const timeOverlap = textEvent.start < r.end && textEvent.end > r.start;
    const spatialOverlap =
      textEvent.x >= r.x &&               // text starts at or after rect left
      textEvent.x <= r.x + 80 &&          // text starts within 80px of rect left (label padding zone)
      textEvent.y >= r.y &&               // text y is within rect vertical bounds (strict)
      textEvent.y <= r.y + r.height - (textEvent.fontSize / 2) &&  // text top within rect
      Math.abs(textEvent.start - r.start) <= 0.5;  // text and rect appear within 0.5s of each other
    return timeOverlap && spatialOverlap;
  });

  if (overlapping.length === 0) return issues; // no parent rect to check against

  const parent = overlapping[0];
  const issues2: string[] = [];

  // Horizontal: does text end before rect right?
  const textRight = textEvent.x + textEvent.maxWidth;
  if (textEvent.x < parent.x) {
    issues2.push(err(`text x (${textEvent.x}) starts LEFT of parent rect x (${parent.x}) by ${parent.x - textEvent.x}px → [${parent.id}]`));
  } else {
    issues2.push(ok(`left-aligned inside [${parent.id}] (padding: ${textEvent.x - parent.x}px)`));
  }
  if (textRight > parent.x + parent.width) {
    issues2.push(warn(`maxWidth (${textEvent.maxWidth}) extends to x:${textRight}, rect ends at x:${parent.x + parent.width} — text may overflow`));
  }

  // Vertical centering quality
  const rectCenterY = parent.y + parent.height / 2;
  const textCenterY = textEvent.y + textEvent.fontSize / 2;
  const centerOffset = Math.abs(rectCenterY - textCenterY);
  if (centerOffset <= 10) {
    issues2.push(ok(`vertically centered (offset: ${Math.round(centerOffset)}px)`));
  } else if (centerOffset <= 25) {
    issues2.push(warn(`not perfectly centered (offset: ${Math.round(centerOffset)}px from rect center)`));
  } else {
    issues2.push(err(`poorly centered (offset: ${Math.round(centerOffset)}px from rect center — expected ~${Math.round(rectCenterY - textEvent.fontSize / 2)})`));
  }

  return issues2;
}

function checkLayerConflicts(events: TimelineEvent[]): string[] {
  const issues: string[] = [];

  // Group opaque (non-background) events by layer
  const byLayer = new Map<number, TimelineEvent[]>();
  for (const e of events) {
    if (e.type === "background") continue;
    const list = byLayer.get(e.layer) ?? [];
    list.push(e);
    byLayer.set(e.layer, list);
  }

  for (const [layer, layerEvents] of byLayer) {
    for (let i = 0; i < layerEvents.length; i++) {
      for (let j = i + 1; j < layerEvents.length; j++) {
        const a = layerEvents[i];
        const b = layerEvents[j];
        const timeOverlap = a.start < b.end && a.end > b.start;
        if (!timeOverlap) continue;

        const bboxA = staticBBox(a);
        const bboxB = staticBBox(b);
        if (!bboxA || !bboxB) continue;

        // Skip line+circle conflicts — a packet (circle) travelling on a line is intentional
        const isLineCircle =
          (a.type === "shape" && (a as ShapeEvent).shapeType === "line" &&
           b.type === "shape" && (b as ShapeEvent).shapeType === "circle") ||
          (b.type === "shape" && (b as ShapeEvent).shapeType === "line" &&
           a.type === "shape" && (a as ShapeEvent).shapeType === "circle");
        if (isLineCircle) continue;

        // Skip rect+rect conflicts where one rect is clearly a semi-transparent overlay
        const isGlowOverlap =
          a.type === "shape" && b.type === "shape" &&
          (a as ShapeEvent).shapeType === "rect" && (b as ShapeEvent).shapeType === "rect" &&
          (isLowOpacityFill((a as ShapeEvent & { shapeType: "rect" }).fill) ||
           isLowOpacityFill((b as ShapeEvent & { shapeType: "rect" }).fill));
        if (isGlowOverlap) continue;

        // Skip particle events — they overlap everything by design
        if (a.type === "particle" || b.type === "particle") continue;

        const spatialOverlap =
          bboxA.x1 < bboxB.x2 && bboxA.x2 > bboxB.x1 &&
          bboxA.y1 < bboxB.y2 && bboxA.y2 > bboxB.y1;

        if (spatialOverlap) {
          const overlapStart = Math.max(a.start, b.start);
          const overlapEnd = Math.min(a.end, b.end);
          issues.push(warn(
            `Layer ${layer}: [${a.id}] and [${b.id}] overlap spatially during t:${overlapStart.toFixed(1)}–${overlapEnd.toFixed(1)}s — one will occlude the other`
          ));
        }
      }
    }
  }
  return issues;
}

function checkPacketTravelPath(event: TimelineEvent, project: VideoProject): string[] {
  const issues: string[] = [];
  if (event.type !== "shape" || event.shapeType !== "circle") return issues;
  if (!event.translateX) return issues;

  const txRange = getAnimRange(event.translateX);
  if (!txRange) return issues;

  const anchor = event.x;
  const startX = anchor + txRange.min;
  const endX = anchor + txRange.max;

  issues.push(info(`packet travel: x:${Math.round(startX)} → x:${Math.round(endX)}`));

  if (startX < 0) issues.push(err(`travel START x:${Math.round(startX)} is off-canvas left`));
  if (startX > project.width) issues.push(err(`travel START x:${Math.round(startX)} is off-canvas right (canvas: ${project.width})`));
  if (endX < 0) issues.push(err(`travel END x:${Math.round(endX)} is off-canvas left`));
  if (endX > project.width) issues.push(err(`travel END x:${Math.round(endX)} is off-canvas right (canvas: ${project.width})`));

  return issues;
}

function checkActCoverage(events: TimelineEvent[], duration: number): string[] {
  const lines: string[] = [];
  const resolution = 0.5;
  const W = 50;

  lines.push(`  ${DIM}Timeline activity (each cell = ${resolution}s):${RESET}`);

  // Collect event counts per time slice
  const slices = Math.ceil(duration / resolution);
  for (let s = 0; s < slices; s++) {
    const t = s * resolution;
    const active = events.filter(
      (e) => e.type !== "background" && e.start <= t && e.end > t
    );
    const density = active.length;
    const bar = "█".repeat(Math.min(density * 2, W));
    const tStr = t.toFixed(1).padStart(4);
    const dStr = String(density).padStart(2);
    const color = density === 0 ? R : density < 3 ? Y : G;
    lines.push(`  ${DIM}${tStr}s${RESET} ${color}${bar}${RESET}${DIM} (${dStr} events)${RESET}`);
  }

  return lines;
}

// ── Formatter ─────────────────────────────────────────────────────────────────

function describeEvent(event: TimelineEvent): string {
  if (event.type === "background") return "background";
  if (event.type === "particle") {
    return `particle (${event.count}) @ origin:(${event.origin.x},${event.origin.y}) spread:(${event.spread.x},${event.spread.y})`;
  }
  if (event.type === "text") {
    const e = event as TextEvent;
    return `text "${e.text.slice(0, 32)}${e.text.length > 32 ? "…" : ""}" @ x:${e.x} y:${e.y} fs:${e.fontSize}`;
  }
  const e = event as ShapeEvent;
  switch (e.shapeType) {
    case "rect": return `rect @ x:${e.x}–${e.x + e.width} y:${e.y}–${e.y + e.height} r:${e.radius ?? 0}`;
    case "circle": return `circle @ x:${e.x} y:${e.y} r:${e.radius}`;
    case "triangle": return `triangle @ x:${e.x}–${e.x + e.width} y:${e.y}–${e.y + e.height}`;
    case "line": return `line (${e.x1},${e.y1})→(${e.x2},${e.y2})`;
    default:     return `shape/${e.shapeType}`;
  }
}

function describeAnimations(event: TimelineEvent): string[] {
  const parts: string[] = [];
  const fields: [string, AnimatedValue | undefined][] = [
    ["opacity", event.opacity],
    ["translateX", event.translateX],
    ["translateY", event.translateY],
    ["scale", event.scale],
    ["rotate", event.rotate],
  ];

  for (const [name, av] of fields) {
    const desc = describeAV(name, av);
    if (desc) parts.push(desc);
  }

  return parts.map((p) => info(p));
}

// ── Main analyzer ─────────────────────────────────────────────────────────────

function analyze(project: VideoProject): void {
  const rects = project.events.filter(
    (e): e is ShapeEvent & { shapeType: "rect" } =>
      e.type === "shape" && (e as ShapeEvent).shapeType === "rect"
  );

  let errorCount = 0;
  let warnCount = 0;

  console.log(`\n${BOLD}${C}════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  VideoProject Layout Analyzer${RESET}`);
  console.log(`${BOLD}${C}════════════════════════════════════════════════${RESET}`);
  console.log(`  Project : ${BOLD}${project.name}${RESET}`);
  console.log(`  Canvas  : ${project.width}×${project.height}`);
  console.log(`  Duration: ${project.duration}s`);
  console.log(`  Events  : ${project.events.length}`);
  console.log(`${DIM}  ──────────────────────────────────────────────${RESET}\n`);

  // ── Per-event analysis ────────────────────────────────────────────────────
  for (const event of project.events) {
    if (event.type === "background") {
      console.log(`${B}[${event.id}]${RESET} ${DIM}background layer:${event.layer} t:${event.start}–${event.end}${RESET}`);
      const bg = event.background;
      if (bg.kind === "solid") console.log(info(`solid color: ${bg.color}`));
      else console.log(info(`gradient: ${bg.from} → ${bg.to} @ ${bg.angle}°`));
      console.log();
      continue;
    }

    const bbox = staticBBox(event);
    const bboxStr = bbox
      ? `x:${Math.round(bbox.x1)}–${Math.round(bbox.x2)} y:${Math.round(bbox.y1)}–${Math.round(bbox.y2)}`
      : "";

    const duration = event.end - event.start;
    const durationColor = duration < 0.5 ? Y : RESET;

    console.log(`${BOLD}${B}[${event.id}]${RESET} ${DIM}${describeEvent(event)}${RESET}`);
    console.log(`  ${DIM}layer:${event.layer}  t:${event.start}–${event.end}  duration:${durationColor}${duration.toFixed(2)}s${RESET}${DIM}  bbox:${bboxStr}${RESET}`);

    // Animations
    const animLines = describeAnimations(event);
    animLines.forEach((l) => console.log(l));

    // Canvas bounds
    const boundsIssues = checkCanvasBounds(event, project);
    boundsIssues.forEach((l) => {
      console.log(l);
      if (l.includes("✗")) errorCount++;
      if (l.includes("⚠")) warnCount++;
    });

    // Text-in-rect alignment
    if (event.type === "text") {
      const alignIssues = checkTextFitsInRect(event as TextEvent, rects);
      alignIssues.forEach((l) => {
        console.log(l);
        if (l.includes("✗")) errorCount++;
        if (l.includes("⚠")) warnCount++;
      });
    }

    // Packet travel path
    const packetIssues = checkPacketTravelPath(event, project);
    packetIssues.forEach((l) => {
      console.log(l);
      if (l.includes("✗")) errorCount++;
      if (l.includes("⚠")) warnCount++;
    });

    // Short duration warning
    if (duration < 0.5) {
      console.log(warn(`very short duration (${duration.toFixed(2)}s) — may not be noticeable`));
      warnCount++;
    }

    console.log();
  }

  // ── Layer conflict analysis ───────────────────────────────────────────────
  console.log(`${BOLD}${C}── Layer Conflict Analysis ──────────────────────${RESET}`);
  const conflicts = checkLayerConflicts(project.events);
  if (conflicts.length === 0) {
    console.log(ok("No spatial layer conflicts detected"));
  } else {
    conflicts.forEach((l) => {
      console.log(l);
      warnCount++;
    });
  }
  console.log();

  // ── Timeline density ──────────────────────────────────────────────────────
  console.log(`${BOLD}${C}── Timeline Density ─────────────────────────────${RESET}`);
  const coverageLines = checkActCoverage(project.events, project.duration);
  coverageLines.forEach((l) => console.log(l));
  console.log();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`${BOLD}${C}════════════════════════════════════════════════${RESET}`);
  const summaryColor = errorCount > 0 ? R : warnCount > 0 ? Y : G;
  console.log(
    `${summaryColor}${BOLD}  Summary: ${errorCount} error(s)  ${warnCount} warning(s)${RESET}`
  );
  console.log(`${BOLD}${C}════════════════════════════════════════════════${RESET}\n`);
}

// ── Entry point ───────────────────────────────────────────────────────────────

const projectIndex = process.argv.indexOf("--project");
const projectArg = process.argv.find((a) => a.startsWith("--project="))?.split("=")[1]
  ?? (projectIndex !== -1 ? process.argv[projectIndex + 1] : undefined);

const project = projectArg === "demo" ? demoProject : bigDemoProject;
analyze(project);
