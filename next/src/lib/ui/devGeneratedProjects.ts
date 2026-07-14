import type { VideoProject } from "@/lib/ui/renderer";
import type { VideoPartKind } from "@/lib/agent/videoParts/schemas";

const STORAGE_KEY = "videogpt.dev-generated-parts.v1";
const MAX_PROJECTS = 40;

export type DevGeneratedProject = {
  id: string;
  part: VideoPartKind;
  prompt: string;
  createdAt: string;
  project: VideoProject;
  /** Validated AI-authored part payload. Older stored entries may omit it. */
  content?: unknown;
};

function normalizeDevGeneratedProject(value: unknown): DevGeneratedProject | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  const part = item.part === "phase-1" ? "summary" : item.part;
  const validPart = part === "title"
    || part === "summary"
    || part === "main-diagram"
    || part === "conclusion";
  const valid = typeof item.id === "string"
    && validPart
    && typeof item.prompt === "string"
    && typeof item.createdAt === "string"
    && typeof item.project === "object"
    && item.project !== null
    && "id" in item.project
    && Boolean(item.project.id);
  if (!valid) return undefined;
  return { ...item, part } as DevGeneratedProject;
}

export function loadDevGeneratedProjects(): DevGeneratedProject[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.flatMap((item) => {
          const normalized = normalizeDevGeneratedProject(item);
          return normalized ? [normalized] : [];
        })
      : [];
  } catch {
    return [];
  }
}

export function saveDevGeneratedProject(
  project: Omit<DevGeneratedProject, "id" | "createdAt">,
): DevGeneratedProject {
  const saved: DevGeneratedProject = {
    ...project,
    id: `${project.part}-${project.project.id}`,
    createdAt: new Date().toISOString(),
  };
  const existing = loadDevGeneratedProjects().filter((item) => item.id !== saved.id);
  const next = [saved, ...existing].slice(0, MAX_PROJECTS);

  if (typeof window !== "undefined") {
    const candidates = [...next];
    while (candidates.length > 0) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
        break;
      } catch (storageError) {
        const quotaExceeded = storageError instanceof DOMException
          ? storageError.name === "QuotaExceededError"
          : storageError instanceof Error && storageError.name === "QuotaExceededError";
        if (!quotaExceeded || candidates.length === 1) break;
        candidates.pop();
      }
    }
  }

  return saved;
}
