"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import Script from "next/script";
import { renderProjectFrame, type VideoProject } from "@/lib/renderer";

function RendererContent() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    // Read search params
    const params = new URLSearchParams(window.location.search);
    const timeParam = params.get("time") || "0";
    const time = parseFloat(timeParam);

    let attempts = 0;
    const draw = () => {
      const project = (window as any).tempProject as VideoProject | undefined;
      if (!project) {
        attempts++;
        if (attempts > 500) { // Timeout after ~8 seconds
          setError("No project data found on window.tempProject after 500 frames.");
          return;
        }
        requestAnimationFrame(draw);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, 1920, 1080);
      renderProjectFrame(ctx, project, time);
      setRendered(true);
      document.documentElement.setAttribute("data-rendered", "true");
    };

    draw();
  }, []);

  if (error) {
    return (
      <div style={{
        position: "fixed",
        top: 0, left: 0, width: "100vw", height: "100vh",
        zIndex: 99999, background: "#800", color: "#fff",
        display: "flex", justifyContent: "center", alignItems: "center",
        fontFamily: "sans-serif", fontSize: "24px", padding: "40px"
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, width: "100vw", height: "100vh",
      zIndex: 99999, background: "#000",
      display: "flex", justifyContent: "center", alignItems: "center",
      overflow: "hidden"
    }}>
      {/* Load the project data script before interactive hydration */}
      <Script src="/temp-project-data.js" strategy="beforeInteractive" />
      <canvas
        ref={canvasRef}
        width={1920}
        height={1080}
        style={{
          width: "100vw",
          height: "100vh",
          objectFit: "contain"
        }}
      />
    </div>
  );
}

export default function RendererOnlyPage() {
  return (
    <Suspense fallback={
      <div style={{
        position: "fixed",
        top: 0, left: 0, width: "100vw", height: "100vh",
        zIndex: 99999, background: "#000", color: "#666",
        display: "flex", justifyContent: "center", alignItems: "center",
        fontFamily: "sans-serif", fontSize: "24px"
      }}>
        Loading renderer parameters...
      </div>
    }>
      <RendererContent />
    </Suspense>
  );
}
