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

function isDevGeneratedProject(value: unknown): value is DevGeneratedProject {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DevGeneratedProject>;
  return typeof item.id === "string"
    && typeof item.part === "string"
    && typeof item.prompt === "string"
    && typeof item.createdAt === "string"
    && Boolean(item.project?.id);
}

export function loadDevGeneratedProjects(): DevGeneratedProject[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter(isDevGeneratedProject)
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return saved;
}
