// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoPartGeneratePage } from "@/components/dev/VideoPartGeneratePage";
import type { GenerateVideoPartResponse } from "@/lib/agent/videoParts/schemas";

const { generateAndSaveDevVideoPart } = vi.hoisted(() => ({
  generateAndSaveDevVideoPart: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/ui/generateDevVideoPart", () => ({
  generateAndSaveDevVideoPart,
}));

vi.mock("@/components/generate/PromptForm", () => ({
  PromptForm: ({ onSubmit }: { onSubmit?: (prompt: string) => void }) => (
    <button
      type="button"
      data-testid="prompt-submit"
      onClick={() => onSubmit?.("Explain how solar power works")}
    >
      Send
    </button>
  ),
}));

vi.mock("@/components/layout/TopBar", () => ({
  TopBar: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/components/player", () => ({
  PlayerCard: ({
    project,
    isLoading,
  }: {
    project?: { id: string };
    isLoading?: boolean;
  }) => (
    <div
      data-testid="player"
      data-project-id={project?.id ?? ""}
      data-loading={String(Boolean(isLoading))}
    />
  ),
}));

const generated: GenerateVideoPartResponse = {
  part: "title",
  content: { title: "Solar Power", subtitle: "From light to electricity" },
  project: {
    id: "title-project",
    name: "Solar Power",
    width: 1920,
    height: 1080,
    duration: 5,
    events: [{
      id: "background",
      type: "background",
      start: 0,
      end: 5,
      layer: 0,
      background: { kind: "solid", color: "#07111f" },
    }],
  },
};

beforeEach(() => {
  generateAndSaveDevVideoPart.mockReset();
  generateAndSaveDevVideoPart.mockResolvedValue(generated);
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  document.body.replaceChildren();
});

describe("dev generation page interaction", () => {
  it("submits through the workflow and gives the generated project to the player", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <VideoPartGeneratePage
          part="title"
          title="Dev — Title Generator"
          description="Generate a title preview."
        />,
      );
    });

    await act(async () => {
      const submit = container.querySelector<HTMLButtonElement>(
        '[data-testid="prompt-submit"]',
      );
      expect(submit).not.toBeNull();
      submit?.click();
    });

    expect(generateAndSaveDevVideoPart).toHaveBeenCalledWith({
      part: "title",
      prompt: "Explain how solar power works",
      duration: 5,
    });
    expect(container.querySelector('[data-testid="player"]')).toMatchObject({
      dataset: {
        projectId: "title-project",
        loading: "false",
      },
    });

    await act(async () => {
      root.unmount();
    });
  });
});
