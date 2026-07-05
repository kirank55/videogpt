import { describe, expect, it } from "vitest";
import { buildPrimitiveRetryPrompt, buildSystemPrompt } from "@/lib/agent/ai/prompts";

describe("AI prompt construction", () => {
  it("steers built-world process prompts toward chronological drawing stages", () => {
    const prompt = buildSystemPrompt(15);

    expect(prompt).toContain("PROCESS / TIMELINE STORYTELLING");
    expect(prompt).toContain("one chronological drawing animation");
    expect(prompt).toContain("what is added next");
    expect(prompt).toContain(
      "Groundbreaking -> Deep Pit & Foundation -> Core Breaks Ground -> Speed Rise -> Topping Out & Cladding -> Grand Opening",
    );
  });

  it("includes process continuity guidance in primitive retries", () => {
    const prompt = buildPrimitiveRetryPrompt(
      "how are skyscrapers built",
      "Scene 2 lacks chronological continuity.",
    );

    expect(prompt).toContain("PROCESS / TIMELINE STORYTELLING");
    expect(prompt).toContain("one chronological drawing animation");
  });

  it("defaults normal explainers to setup plus main visual scenes", () => {
    const prompt = buildSystemPrompt(15);

    expect(prompt).toContain("DEFAULT VIDEO STRUCTURE");
    expect(prompt).toContain("produce exactly two content scenes between the automatic title and conclusion");
    expect(prompt).toContain("single main diagram animation before the conclusion");
    expect(prompt).toContain("The title is handled by brief.title/subtitle");
    expect(prompt).toContain("The conclusion is handled by closingLine");
  });

  it("asks the first model call to self-audit before final JSON", () => {
    const prompt = buildSystemPrompt(15);

    expect(prompt).toContain("FIRST-PASS QUALITY GATE");
    expect(prompt).toContain("silently audit your brief and revise it once inside this same response");
    expect(prompt).toContain("The final JSON must already pass these checks");
    expect(prompt).toContain("This is a capacity hint");
  });

  it("keeps two-scene structure guidance in primitive retries", () => {
    const prompt = buildPrimitiveRetryPrompt(
      "explain GPS",
      "Scenes are repetitive.",
    );

    expect(prompt).toContain("DEFAULT VIDEO STRUCTURE");
    expect(prompt).toContain("HARD STRUCTURAL FAILURE");
    expect(prompt).toContain("Scene 1 is Phase 1 / setup / context");
    expect(prompt).toContain("Scene 2 is the single main diagram animation before the conclusion");
  });
});
