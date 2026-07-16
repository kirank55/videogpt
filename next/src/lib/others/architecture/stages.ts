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
    id: "composition-plan",
    label: "Composition Plan",
    summary: "Deterministic intro, summary, main, and conclusion windows",
    file: "next/src/lib/agent/videoParts/composedVideo.ts",
    symbol: "planCompositionWindows",
    dataShape: "Four contiguous timeline windows",
    details: "The selected duration is divided before model calls so summary and main authors receive their exact local durations.",
  },
  {
    id: "parallel-authorship",
    label: "Three LLM Requests",
    summary: "Bookends, summary, and main diagram run concurrently",
    file: "next/src/lib/agent/videoParts/composedVideo.ts",
    symbol: "generateComposedVideo",
    dataShape: "BookendsContent + two direct timeline payloads",
    details: "Each authored group is validated independently and receives one targeted repair containing its rejected JSON.",
  },
  {
    id: "timeline-validation",
    label: "Timeline Validation",
    summary: "Safe renderer vocabulary, geometry, timing, and readability",
    file: "next/src/lib/agent/videoParts/directTimeline.ts",
    dataShape: "Validated TimelineEvent[]",
    details: "Summary and main diagrams use separate validation profiles while sharing spatial, collision, and animation checks.",
  },
  {
    id: "composition",
    label: "Final Composition",
    summary: "Prefix and offset four sections into one project",
    file: "next/src/lib/agent/videoParts/composedVideo.ts",
    symbol: "generateComposedVideo",
    dataShape: "VideoProject",
    details: "Bookend renderer events and both authored timelines are shifted into contiguous windows and sorted for Canvas rendering.",
  },
];
