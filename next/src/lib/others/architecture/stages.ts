export interface ArchStage {
  id: string;
  label: string;
  summary: string;
  file: string;
  symbol?: string;
  dataShape: string;
  details: string;
}

export const PIPELINE_STAGES: ArchStage[] = [
  {
    id: "user-prompt",
    label: "User Prompt",
    summary: "A new-project prompt and selected total duration",
    file: "next/src/app/generate/page.tsx",
    dataShape: "{ prompt, duration }",
    details: "The root page accepts one initial prompt. Follow-up modification is intentionally disabled.",
  },
  {
    id: "scene-plan",
    label: "Scene Plan",
    summary: "One planner request chooses dynamic scenes, copy, and time shares",
    file: "next/src/lib/agent/videoParts/planner.ts",
    symbol: "planVideoScenes",
    dataShape: "VideoPlan: title/closing copy + 2-5 scenes with roles, goals, and shares",
    details: "The planner picks scene roles (overview, mechanism, example, comparison) per topic. Invalid plans get one targeted repair; total failure falls back to a deterministic two-scene plan.",
  },
  {
    id: "composition-plan",
    label: "Composition Windows",
    summary: "Deterministic intro, per-scene, and conclusion windows",
    file: "next/src/lib/agent/videoParts/planner.ts",
    symbol: "planSceneWindows",
    dataShape: "Contiguous timeline windows sized by normalized scene shares",
    details: "The selected duration is divided by plan shares before scene calls so every scene author receives its exact local duration.",
  },
  {
    id: "parallel-authorship",
    label: "Parallel Scene Requests",
    summary: "One model request per planned scene, run concurrently",
    file: "next/src/lib/agent/videoParts/composedVideo.ts",
    symbol: "generateComposedVideo",
    dataShape: "One direct timeline payload per scene",
    details: "Each scene is generated with its plan goal, the other scenes' goals as negative context, and a shared palette; malformed output becomes a renderer-safe fallback without a repair request.",
  },
  {
    id: "timeline-validation",
    label: "Timeline Validation",
    summary: "Safe renderer vocabulary, geometry, timing, and readability",
    file: "next/src/lib/agent/videoParts/directTimeline.ts",
    dataShape: "Validated TimelineEvent[]",
    details: "Overview scenes use the compact profile and detailed scenes the scaled profile while sharing spatial, collision, and animation checks.",
  },
  {
    id: "composition",
    label: "Final Composition",
    summary: "Prefix and offset all sections into one project with chapters",
    file: "next/src/lib/agent/videoParts/composedVideo.ts",
    symbol: "generateComposedVideo",
    dataShape: "VideoProject",
    details: "Deterministic intro/conclusion renders and every scene timeline are shifted into contiguous windows, sorted for Canvas rendering, and annotated with seekable chapters.",
  },
];
