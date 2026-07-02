"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import type { VideoProject, TimelineEvent } from "@/lib/ui/renderer";
import { visibleEvents } from "@/lib/ui/renderer";
import { getAnimatedStyle } from "@/lib/ui/renderer/animation";
import { drawText } from "@/lib/ui/renderer/text";
import { drawShape } from "@/lib/ui/renderer/shape";
import { drawBackground } from "@/lib/ui/renderer/background";
import { getEventCenter } from "@/lib/ui/renderer/geometry";

// ── Types ─────────────────────────────────────────────────────────────────────

type FabricCanvasProps = {
  project: VideoProject;
  currentTime: number;
  /** When true, foreground elements are selectable/draggable. */
  editable?: boolean;
  /** Called when the user repositions or resizes an element (edit mode). */
  onEventsChange?: (updatedEvents: TimelineEvent[]) => void;
  /** Called when the user clicks "Done" in the edit toolbar. */
  onDone?: () => void;
  isFullscreen?: boolean;
  className?: string;
};

// ── Helper: mutate a specific event's position fields ─────────────────────────

function applyPositionToEvent(
  event: TimelineEvent,
  left: number,
  top: number,
  scaleX: number,
  scaleY: number,
): TimelineEvent {
  const e = { ...event } as Record<string, unknown>;

  if (event.type === "text") {
    e.x = left;
    e.y = top;
  } else if (event.type === "shape") {
    const shape = event as Extract<TimelineEvent, { type: "shape" }>;
    if (shape.shapeType === "rect" || shape.shapeType === "triangle" || shape.shapeType === "progress") {
      e.x = left;
      e.y = top;
      if ("width" in shape) e.width = (shape.width as number) * scaleX;
      if ("height" in shape) e.height = (shape.height as number) * scaleY;
    } else if (shape.shapeType === "circle") {
      e.x = left;
      e.y = top;
      if ("radius" in shape) e.radius = (shape.radius as number) * Math.max(scaleX, scaleY);
    } else if (shape.shapeType === "line") {
      const dx = (shape as { x2: number; x1: number }).x2 - (shape as { x1: number }).x1;
      const dy = (shape as { y2: number; y1: number }).y2 - (shape as { y1: number }).y1;
      e.x1 = left;
      e.y1 = top;
      e.x2 = left + dx;
      e.y2 = top + dy;
    } else if (shape.shapeType === "icon" || shape.shapeType === "badge") {
      e.cx = left;
      e.cy = top;
    }
  }

  return e as TimelineEvent;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function FabricCanvas({
  project,
  currentTime,
  editable = false,
  onEventsChange,
  onDone,
  isFullscreen,
  className,
}: FabricCanvasProps) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef   = useRef<unknown>(null); // fabric.Canvas instance
  const eventsRef   = useRef<TimelineEvent[]>(project.events);
  const [objectCount, setObjectCount] = useState(0);
  const [fabricReady, setFabricReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Monitor parent container size dynamically
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({
          width: width || project.width,
          height: height || project.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [project.width, project.height]);

  // Keep eventsRef in sync when project changes from outside
  useEffect(() => {
    eventsRef.current = project.events;
  }, [project.events]);

  // Dynamically update canvas zoom when container dimensions change
  useEffect(() => {
    const fc = fabricRef.current as any;
    if (!fc || !dimensions.width) return;

    let zoom = 1;
    if (isFullscreen && dimensions.height > 0) {
      const zoomX = dimensions.width / project.width;
      const zoomY = dimensions.height / project.height;
      zoom = Math.min(zoomX, zoomY);
    } else {
      zoom = dimensions.width / project.width;
    }

    fc.setZoom(zoom);
    fc.setDimensions({
      width: project.width * zoom,
      height: project.height * zoom,
    });
    fc.renderAll();
  }, [dimensions, isFullscreen, project.width, project.height]);

  // ── Initialize Fabric.js ────────────────────────────────────────────────────
  useEffect(() => {
    if (!dimensions.width) return;

    let active = true;
    let fc: { dispose: () => void } | null = null;

    async function initFabric() {
      const canvasEl = canvasElRef.current;
      if (!canvasEl) return;

      // Save scroll position to prevent browser focus jumping
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      // Dynamic import keeps Fabric out of the main bundle
      const fabricModule = await import("fabric");
      if (!active) return;
      const { Canvas, Rect } = fabricModule;

      const visible = visibleEvents(project, currentTime);

      const fc_canvas = new Canvas(canvasEl, {
        width: project.width,
        height: project.height,
        backgroundColor: "#1a1a2e",
        selection: editable,
      });

      // Restore scroll position
      window.scrollTo(scrollX, scrollY);

      if (!active) {
        fc_canvas.dispose();
        return;
      }

      let zoom = 1;
      if (isFullscreen && dimensions.height > 0) {
        const zoomX = dimensions.width / project.width;
        const zoomY = dimensions.height / project.height;
        zoom = Math.min(zoomX, zoomY);
      } else {
        zoom = dimensions.width / project.width;
      }

      fc_canvas.setZoom(zoom);
      fc_canvas.setDimensions({
        width: project.width * zoom,
        height: project.height * zoom,
      });

      // Style the Fabric.js outer container to match PlayerCanvas border/rounding
      const wrapper = canvasEl.parentElement;
      if (wrapper && wrapper.classList.contains("canvas-container")) {
        wrapper.className = isFullscreen
          ? "canvas-container rounded-xl border border-border/20 bg-black/45 shadow-2xl overflow-hidden transition-shadow"
          : "canvas-container rounded-2xl border border-border bg-black/20 overflow-hidden shadow-lg transition-shadow";
      }

      fabricRef.current = fc_canvas;

      let addedCount = 0;

      for (const event of visible) {
        if (event.type === "background") {
          // Background — always non-interactive
          const bg = new Rect({
            left: 0,
            top: 0,
            width: project.width,
            height: project.height,
            fill: "transparent",
            stroke: "transparent",
            strokeWidth: 0,
            selectable: false,
            evented: false,
            objectCaching: false,
            data: { eventId: event.id },
            _render: function(ctx: CanvasRenderingContext2D) {
              const self = this as any;
              ctx.save();
              const canvas = self.canvas;
              if (canvas && canvas.viewportTransform) {
                const vpt = canvas.viewportTransform;
                const retinaScale = canvas.getRetinaScaling ? canvas.getRetinaScaling() : 1;
                ctx.setTransform(
                  vpt[0] * retinaScale,
                  vpt[1] * retinaScale,
                  vpt[2] * retinaScale,
                  vpt[3] * retinaScale,
                  vpt[4] * retinaScale,
                  vpt[5] * retinaScale,
                );
              }
              drawBackground(ctx, event, project);
              ctx.restore();
            }
          });
          fc_canvas.add(bg);
          continue;
        }

        if (event.type === "particle") continue; // Skip particles

        // Resolve animation values at current time to position the interactive Fabric container
        const anim = getAnimatedStyle(event, currentTime);
        const center = getEventCenter(event);
        const finalOffsetX = anim.pathOffset ? anim.pathOffset.x - center.x : anim.offsetX;
        const finalOffsetY = anim.pathOffset ? anim.pathOffset.y - center.y : anim.offsetY;

        let posX = 0;
        let posY = 0;
        let width = 100;
        let height = 50;
        let originX: "left" | "center" = "left";
        let originY: "top" | "center" = "top";

        if (event.type === "text") {
          posX = event.x + finalOffsetX;
          posY = event.y + finalOffsetY;
          width = event.maxWidth;
          height = event.fontSize * 1.3;
          originX = "left";
          originY = "top";
        } else if (event.type === "shape") {
          if (event.shapeType === "rect" || event.shapeType === "triangle" || event.shapeType === "progress") {
            posX = event.x + finalOffsetX;
            posY = event.y + finalOffsetY;
            width = event.width;
            height = event.height;
            originX = "left";
            originY = "top";
          } else if (event.shapeType === "circle") {
            posX = event.x + finalOffsetX;
            posY = event.y + finalOffsetY;
            width = event.radius * 2;
            height = event.radius * 2;
            originX = "center";
            originY = "center";
          } else if (event.shapeType === "line") {
            const minX = Math.min(event.x1, event.x2);
            const minY = Math.min(event.y1, event.y2);
            posX = minX + finalOffsetX;
            posY = minY + finalOffsetY;
            width = Math.abs(event.x2 - event.x1);
            height = Math.abs(event.y2 - event.y1);
            originX = "left";
            originY = "top";
          } else if (event.shapeType === "icon" || event.shapeType === "badge") {
            posX = event.cx + finalOffsetX;
            posY = event.cy + finalOffsetY;
            if (event.shapeType === "icon") {
              width = event.size ?? 48;
              height = event.size ?? 48;
            } else {
              const fontSize = event.fontSize ?? 14;
              const padX = event.paddingX ?? 18;
              const padY = event.paddingY ?? 8;
              let textW = 80;
              if (typeof document !== "undefined") {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
                  textW = ctx.measureText(event.text || "").width;
                }
              }
              width = textW + padX * 2;
              height = fontSize + padY * 2;
            }
            originX = "center";
            originY = "center";
          }
        }

        // Create a Fabric shape that wraps our unified renderer.
        // In view mode (editable=false): non-interactive, just renders.
        // In edit mode (editable=true): selectable, draggable, resizable.
        const obj = new Rect({
          left: posX,
          top: posY,
          width: width || 10,
          height: height || 10,
          fill: "transparent",
          stroke: "transparent",
          strokeWidth: 0,
          originX: originX,
          originY: originY,
          opacity: 1,
          angle: 0,
          hasRotatingPoint: false,
          objectCaching: false,
          noScaleCache: true,
          selectable: editable,
          evented: editable,
          data: { eventId: event.id },
          _render: function(ctx: CanvasRenderingContext2D) {
            const self = this as any;
            ctx.save();
            
            // Bypass Fabric's object translation to render in absolute canvas coordinates
            const canvas = self.canvas;
            if (canvas && canvas.viewportTransform) {
              const vpt = canvas.viewportTransform;
              const retinaScale = canvas.getRetinaScaling ? canvas.getRetinaScaling() : 1;
              ctx.setTransform(
                vpt[0] * retinaScale,
                vpt[1] * retinaScale,
                vpt[2] * retinaScale,
                vpt[3] * retinaScale,
                vpt[4] * retinaScale,
                vpt[5] * retinaScale,
              );
            }

            // Translate by the current drag offset relative to the initial position
            const dx = self.left - posX;
            const dy = self.top - posY;
            ctx.translate(dx, dy);

            // Scale around the element center if scaled in editor
            if (self.scaleX !== 1 || self.scaleY !== 1) {
              const cx = posX + (originX === "center" ? 0 : width / 2);
              const cy = posY + (originY === "center" ? 0 : height / 2);
              ctx.translate(cx, cy);
              ctx.scale(self.scaleX, self.scaleY);
              ctx.translate(-cx, -cy);
            }

            if (event.type === "text") {
              drawText(ctx, event, currentTime);
            } else if (event.type === "shape") {
              drawShape(ctx, event, currentTime);
            }

            ctx.restore();
          }
        });

        fc_canvas.add(obj);
        addedCount++;
      }

      setObjectCount(addedCount);
      fc_canvas.renderAll();
      setFabricReady(true);

      // ── Sync modifications back to event positions (edit mode only) ────────
      if (editable) {
        fc_canvas.on("object:modified", (e: { target?: { data?: { eventId?: string }; left?: number; top?: number; scaleX?: number; scaleY?: number } }) => {
          const target = e.target;
          if (!target?.data?.eventId) return;

          const eventId = target.data.eventId;
          const newLeft  = target.left ?? 0;
          const newTop   = target.top  ?? 0;
          const newScaleX = target.scaleX ?? 1;
          const newScaleY = target.scaleY ?? 1;

          const updated = eventsRef.current.map((ev) => {
            if (ev.id !== eventId) return ev;

            const anim = getAnimatedStyle(ev, currentTime);
            let baseLeft = newLeft;
            let baseTop = newTop;

            if (ev.type === "text") {
              const finalOffsetX = anim.pathOffset ? anim.pathOffset.x - ev.x : anim.offsetX;
              const finalOffsetY = anim.pathOffset ? anim.pathOffset.y - ev.y : anim.offsetY;
              baseLeft = newLeft - finalOffsetX;
              baseTop = newTop - finalOffsetY;
            } else if (ev.type === "shape") {
              const center = getEventCenter(ev);
              const finalOffsetX = anim.pathOffset ? anim.pathOffset.x - center.x : anim.offsetX;
              const finalOffsetY = anim.pathOffset ? anim.pathOffset.y - center.y : anim.offsetY;
              baseLeft = newLeft - finalOffsetX;
              baseTop = newTop - finalOffsetY;
            }

            const scaleFactorX = anim.scale * anim.scaleX;
            const scaleFactorY = anim.scale * anim.scaleY;
            const baseScaleX = scaleFactorX !== 0 ? newScaleX / scaleFactorX : newScaleX;
            const baseScaleY = scaleFactorY !== 0 ? newScaleY / scaleFactorY : newScaleY;

            return applyPositionToEvent(ev, baseLeft, baseTop, baseScaleX, baseScaleY);
          });

          eventsRef.current = updated;
          onEventsChange?.(updated);
        });
      }

      fc = fc_canvas as { dispose: () => void };
    }

    initFabric();

    return () => {
      active = false;
      fc?.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, currentTime, dimensions, isFullscreen, editable]);

  const handleDone = useCallback(() => {
    onDone?.();
  }, [onDone]);

  // ── Edit toolbar (only shown in edit mode) ────────────────────────────────
  const toolbarNode = editable ? (
    <div className={isFullscreen
      ? "fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 bg-zinc-950/90 border border-amber-500/30 rounded-full shadow-2xl whitespace-nowrap backdrop-blur-md animate-fade-in"
      : "absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-zinc-950/90 border border-amber-500/30 rounded-full shadow-2xl whitespace-nowrap backdrop-blur-md animate-fade-in"
    }>
      <span className="text-amber-400 text-xs font-bold tracking-wide flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 animate-pulse">
          <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
        </svg>
        Edit Mode
      </span>
      <span className="text-[11px] text-amber-400/70 border-l border-amber-500/20 pl-2">
        {fabricReady ? `${objectCount} elements` : "Loading…"}
      </span>
      <span className="text-[11px] text-amber-400/50 hidden md:block border-l border-amber-500/20 pl-2">
        Drag to reposition · Resize corners
      </span>
      <button
        type="button"
        onClick={handleDone}
        className="ml-2 flex items-center gap-1 px-3 py-0.5 text-xs font-semibold rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all duration-150 active:scale-95 cursor-pointer"
      >
        Done
      </button>
    </div>
  ) : null;

  const portalTarget = typeof document !== "undefined"
    ? (isFullscreen ? document.body : document.getElementById(`edit-toolbar-portal-${project.id}`))
    : null;

  return (
    <div className={`relative ${isFullscreen ? "w-full h-full" : "w-full"} ${className ?? ""}`}>
      {/* Floating Toolbar Overlay rendered outside the card DOM via Portal (edit mode only) */}
      {editable && toolbarNode && portalTarget && createPortal(toolbarNode, portalTarget)}

      {/* Canvas container */}
      <div ref={containerRef} className={`${isFullscreen ? "w-full h-full flex items-center justify-center" : "w-full flex items-center justify-center"} bg-background/40 p-4 overflow-hidden`}>
        {!fabricReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 rounded-full border-4 border-amber-400/20 border-t-amber-400 animate-spin" />
              <span className="text-xs text-amber-400/70">Loading canvas…</span>
            </div>
          </div>
        )}
        <canvas
          ref={canvasElRef}
          style={
            fabricReady
              ? undefined
              : {
                  width: "100%",
                  aspectRatio: `${project.width} / ${project.height}`,
                }
          }
          className={fabricReady ? undefined : "rounded-2xl border border-border bg-black/20"}
        />
      </div>
    </div>
  );
}
