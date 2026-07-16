import { afterEach, describe, expect, it, vi } from "vitest";
import { useStore } from "@/lib/ui/store";
import type { PersistedState } from "@/lib/ui/persistence";

describe("session hydration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useStore.setState({ sessions: [], activeSessionId: null, duration: 5 });
  });

  it("drops obsolete authored payloads while preserving rendered projects", () => {
    const project = {
      id: "existing-project",
      name: "Existing",
      width: 1920,
      height: 1080,
      duration: 5,
      events: [],
    };
    const legacyState = {
      sessions: [{
        id: "session-1",
        name: "Existing",
        updatedAt: "2026-01-01T00:00:00.000Z",
        project,
        brief: { title: "obsolete" },
        rawBrief: "obsolete",
        messages: [{
          id: "message-1",
          role: "assistant" as const,
          content: "Existing project",
          project,
          brief: { title: "obsolete" },
          rawBrief: "obsolete",
        }],
      }],
      activeSessionId: "session-1",
      duration: 5,
    };

    useStore.getState().hydrate(legacyState as unknown as Partial<PersistedState>);

    const session = useStore.getState().sessions[0] as unknown as Record<string, unknown>;
    const message = (session.messages as Array<Record<string, unknown>>)[0];
    expect(session.project).toEqual(project);
    expect(session).not.toHaveProperty("brief");
    expect(session).not.toHaveProperty("rawBrief");
    expect(message.project).toEqual(project);
    expect(message).not.toHaveProperty("brief");
    expect(message).not.toHaveProperty("rawBrief");
  });

  it("retries a failed session with its original duration", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      project: {
        id: "retried",
        name: "Retried",
        width: 1920,
        height: 1080,
        duration: 10,
        events: [],
      },
      projectName: "Retried",
      summary: "Retried",
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    useStore.setState({
      duration: 20,
      sessions: [{
        id: "failed",
        name: "Failed",
        duration: 10,
        updatedAt: "2026-01-01T00:00:00.000Z",
        messages: [
          { id: "user", role: "user", content: "Explain solar power" },
          { id: "error", role: "assistant", content: "Failed", isError: true },
        ],
      }],
    });

    await useStore.getState().retryPrompt("failed");

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ duration: 10 });
  });
});
