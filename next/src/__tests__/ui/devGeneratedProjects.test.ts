import { afterEach, describe, expect, it, vi } from "vitest";
import {
  saveDevGeneratedProject,
  type DevGeneratedProject,
} from "@/lib/ui/devGeneratedProjects";
import type { VideoProject } from "@/lib/ui/renderer";

const project = (id: string): VideoProject => ({
  id,
  name: id,
  width: 1920,
  height: 1080,
  duration: 5,
  events: [],
});

const storedProject = (id: string): DevGeneratedProject => ({
  id: `summary-${id}`,
  part: "summary",
  prompt: id,
  createdAt: "2026-07-14T00:00:00.000Z",
  project: project(id),
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dev generated project persistence", () => {
  it("evicts oldest projects until the newest project fits localStorage", () => {
    let stored = JSON.stringify([
      storedProject("old-1"),
      storedProject("old-2"),
      storedProject("old-3"),
    ]);
    const setItem = vi.fn((_key: string, value: string) => {
      const records = JSON.parse(value) as unknown[];
      if (records.length > 2) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      stored = value;
    });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => stored,
        setItem,
      },
    });

    const saved = saveDevGeneratedProject({
      part: "summary",
      prompt: "newest",
      project: project("newest"),
    });

    const records = JSON.parse(stored) as DevGeneratedProject[];
    expect(saved.project.id).toBe("newest");
    expect(records.map((record) => record.project.id)).toEqual(["newest", "old-1"]);
    expect(setItem).toHaveBeenCalledTimes(3);
  });

  it("returns the generated project when even one record cannot be persisted", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => "[]",
        setItem: () => {
          throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
        },
      },
    });

    expect(() => saveDevGeneratedProject({
      part: "summary",
      prompt: "large project",
      project: project("large"),
    })).not.toThrow();
  });
});
