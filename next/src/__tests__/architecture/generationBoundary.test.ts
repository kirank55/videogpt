import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertGenerationBoundary,
  findGenerationBoundaryViolations,
} from "@/lib/architecture/generationBoundary";

const fixtureRoots: string[] = [];

async function createSourceFixture(files: Record<string, string>): Promise<string> {
  const sourceRoot = await mkdtemp(path.join(tmpdir(), "videogpt-boundary-"));
  fixtureRoots.push(sourceRoot);

  await Promise.all(
    Object.entries(files).map(async ([relativePath, source]) => {
      const filePath = path.join(sourceRoot, relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, source, "utf8");
    }),
  );

  return sourceRoot;
}

afterEach(async () => {
  await Promise.all(
    fixtureRoots.splice(0).map((fixtureRoot) =>
      rm(fixtureRoot, { recursive: true, force: true }),
    ),
  );
});

describe("generation-stack architecture boundary", () => {
  it.each([
    {
      name: "a root runtime import from dev generation",
      source: 'import { generate } from "@/lib/agent/videoParts/pipeline";',
    },
    {
      name: "a root type-only import from dev generation",
      source: 'import type { VideoPartKind } from "@/lib/agent/videoParts/schemas";',
    },
    {
      name: "a root TypeScript import-equals from dev generation",
      source:
        'import pipeline = require("@/lib/agent/videoParts/pipeline");\nvoid pipeline;',
    },
    {
      name: "a root dynamic import with a template literal and import options",
      source:
        'void import(`@/lib/agent/videoParts/pipeline`, { with: { type: "json" } });',
    },
  ])("rejects $name", async ({ source }) => {
    const sourceRoot = await createSourceFixture({
      "lib/agent/rootGeneration/example.ts": source,
      "lib/agent/videoParts/pipeline.ts": "export const generate = () => undefined;",
      "lib/agent/videoParts/schemas.ts": "export type VideoPartKind = 'title';",
    });

    expect(findGenerationBoundaryViolations(sourceRoot)).toEqual([
      expect.objectContaining({
        owner: "root",
        targetOwner: "dev",
      }),
    ]);
  });

  it("rejects a dev import from root generation", async () => {
    const sourceRoot = await createSourceFixture({
      "lib/agent/videoParts/pipeline.ts":
        'import { compose } from "@/lib/agent/rootGeneration/composedVideo";',
      "lib/agent/rootGeneration/composedVideo.ts":
        "export const compose = () => undefined;",
    });

    expect(findGenerationBoundaryViolations(sourceRoot)).toEqual([
      expect.objectContaining({
        owner: "dev",
        targetOwner: "root",
      }),
    ]);
  });

  it("rejects an indirect cross-stack re-export", async () => {
    const sourceRoot = await createSourceFixture({
      "lib/agent/rootGeneration/example.ts":
        'import { generate } from "@/lib/ui/convenience";',
      "lib/ui/convenience.ts":
        'export { generate } from "@/lib/agent/videoParts/pipeline";',
      "lib/agent/videoParts/pipeline.ts":
        "export const generate = () => undefined;",
    });

    expect(findGenerationBoundaryViolations(sourceRoot)).toEqual([
      expect.objectContaining({
        owner: "root",
        targetOwner: "dev",
        dependencyPath: [
          "lib/agent/rootGeneration/example.ts",
          "lib/ui/convenience.ts",
          "lib/agent/videoParts/pipeline.ts",
        ],
      }),
    ]);
  });

  it("rejects an indirect cross-stack dependency through a CommonJS module", async () => {
    const sourceRoot = await createSourceFixture({
      "lib/agent/rootGeneration/example.ts":
        'import convenience from "@/lib/ui/renderer/convenience";',
      "lib/ui/renderer/convenience.cts":
        'export = require("@/lib/agent/videoParts/pipeline");',
      "lib/agent/videoParts/pipeline.ts":
        "export const generate = () => undefined;",
    });

    expect(findGenerationBoundaryViolations(sourceRoot)).toEqual([
      expect.objectContaining({
        owner: "root",
        targetOwner: "dev",
        dependencyPath: [
          "lib/agent/rootGeneration/example.ts",
          "lib/ui/renderer/convenience.cts",
          "lib/agent/videoParts/pipeline.ts",
        ],
      }),
    ]);
  });

  it("allows only approved shared rendering and platform surfaces", async () => {
    const sourceRoot = await createSourceFixture({
      "lib/agent/rootGeneration/example.ts": [
        'import { env } from "@/lib/env";',
        'import type { SupportedDuration } from "@/lib/others/schemas/duration";',
        'import type { VideoProject } from "@/lib/ui/renderer";',
        'import { Player } from "@/lib/ui/player";',
        'import { Button } from "@/components/ui/Button";',
        "export const example = { env } satisfies { env: string };",
        "export type ExampleDuration = SupportedDuration;",
        "export type ExampleProject = VideoProject;",
        "void Player;",
        "void Button;",
      ].join("\n"),
      "lib/env.ts": 'export const env = "test";',
      "lib/others/schemas/duration.ts": "export type SupportedDuration = 5 | 10;",
      "lib/ui/renderer/index.ts": "export interface VideoProject { duration: number }",
      "lib/ui/player/index.ts": "export const Player = {};",
      "components/ui/Button.ts": "export const Button = {};",
    });

    expect(findGenerationBoundaryViolations(sourceRoot)).toEqual([]);
  });

  it("rejects shared dependencies outside the allowlist", async () => {
    const sourceRoot = await createSourceFixture({
      "lib/agent/videoParts/example.ts":
        'import { helper } from "@/lib/agent/sharedGenerationHelper";',
      "lib/agent/sharedGenerationHelper.ts": "export const helper = {};",
    });

    expect(findGenerationBoundaryViolations(sourceRoot)).toEqual([
      expect.objectContaining({
        owner: "dev",
        reason: "unapproved-shared-dependency",
      }),
    ]);
  });

  it("does not treat arbitrary UI helpers as generic UI", async () => {
    const sourceRoot = await createSourceFixture({
      "lib/agent/rootGeneration/example.ts":
        'import { telemetry } from "@/lib/ui/telemetry";',
      "lib/ui/telemetry.ts": "export const telemetry = {};",
    });

    expect(findGenerationBoundaryViolations(sourceRoot)).toEqual([
      expect.objectContaining({
        owner: "root",
        reason: "unapproved-shared-dependency",
      }),
    ]);
  });

  it("keeps the repository source tree within the boundary", () => {
    const sourceRoot = path.resolve(__dirname, "../..");

    expect(() => assertGenerationBoundary(sourceRoot)).not.toThrow();
  });
});
