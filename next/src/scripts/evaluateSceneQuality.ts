import { spawn, spawnSync, type ChildProcess } from "child_process";
import { createHash } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { callOpenRouter as callRootModel } from "../lib/agent/rootGeneration/openrouter";
import type { OpenRouterOptions as RootModelOptions } from "../lib/agent/rootGeneration/openrouter";
import { generateComposedVideo } from "../lib/agent/rootGeneration/composedVideo";
import { callOpenRouter as callDevModel } from "../lib/agent/videoParts/openrouter";
import type { OpenRouterOptions as DevModelOptions } from "../lib/agent/videoParts/openrouter";
import { generateVideoPart } from "../lib/agent/videoParts/pipeline";
import { loadEvaluationCases, type EvaluationCase } from "../lib/evaluation/cases";
import {
  classifyProjectDiagnostics,
  DISQUALIFYING_DIAGNOSTIC_CODES,
  diagnosticFailureSeverity,
  generationFailureDiagnostic,
  hasDisqualifyingDiagnostics,
  rendererFailureDiagnostic,
  type EvaluationDiagnostic,
} from "../lib/evaluation/diagnostics";
import {
  captureFailure,
  createArtifactMetadata,
  type CapturedModelCall,
  type EvaluationArtifactMetadata,
  type GenerationPath,
} from "../lib/evaluation/metadata";
import {
  HUMAN_SCORE_CRITERIA,
  assessQualityThreshold,
  summarizeEvaluation,
  type HumanScore,
  type HumanScoreCriterion,
  type ScoredRun,
} from "../lib/evaluation/scoring";
import type { VideoProject } from "../lib/ui/renderer";

const REPETITIONS = 3;
const FRAME_FRACTIONS = [0.25, 0.5, 0.75] as const;
const RENDER_PORT = 3194;
const NEXT_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(NEXT_ROOT, "..");
const TEMP_PROJECT_PATH = path.join(NEXT_ROOT, "public", "temp-project-data.js");

type RubricEntry = {
  artifactId: string;
  caseId: string;
  generationPath: GenerationPath;
  repetition: number;
  notes: string;
} & Record<HumanScoreCriterion, number | null>;

type RubricFile = {
  instructions: string;
  scale: Record<HumanScoreCriterion, string>;
  entries: RubricEntry[];
};

type EvaluationManifest = {
  schemaVersion: 1;
  evaluationId: string;
  createdAt: string;
  requestedModel: string;
  evaluationCaseRevision: string;
  repetitions: number;
  frameFractions: readonly number[];
  cases: EvaluationCase[];
};

function timestampId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function evaluationCaseRevision(cases: EvaluationCase[]): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(cases))
    .digest("hex")}`;
}

function parseArguments(): { outputRoot: string; summarizeDirectory?: string } {
  const args = process.argv.slice(2);
  const summarizeIndex = args.indexOf("--summarize");
  if (summarizeIndex >= 0) {
    const directory = args[summarizeIndex + 1];
    if (!directory) throw new Error("--summarize requires an evaluation directory.");
    return { outputRoot: "", summarizeDirectory: path.resolve(directory) };
  }
  const outputIndex = args.indexOf("--output");
  if (outputIndex >= 0 && !args[outputIndex + 1]) {
    throw new Error("--output requires a directory.");
  }
  const outputRoot = outputIndex >= 0
    ? path.resolve(args[outputIndex + 1])
    : path.join(REPO_ROOT, "evaluation-artifacts");
  return { outputRoot };
}

function isInsideDirectory(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function modelOptions(options: RootModelOptions | DevModelOptions) {
  return {
    ...(options.maxTokens === undefined ? {} : { maxTokens: options.maxTokens }),
    ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
    ...(options.reasoning === undefined ? {} : { reasoning: options.reasoning }),
  };
}

function createCapturedCaller(
  calls: CapturedModelCall[],
  callProvider: typeof callRootModel,
) {
  let sequence = 0;
  return async (
    systemPrompt: string,
    userPrompt: string | Array<unknown>,
    options: RootModelOptions = {},
  ): Promise<unknown> => {
    const startedAt = new Date().toISOString();
    const usageHolder: { value?: CapturedModelCall["usage"] } = {};
    const existingOnUsage = options.onUsage;
    const capturedOptions = {
      ...options,
      onUsage: (usage: NonNullable<CapturedModelCall["usage"]>) => {
        usageHolder.value = usage;
        existingOnUsage?.(usage);
      },
    };
    const baseCall = {
      sequence: ++sequence,
      model: options.model ?? process.env.DEFAULT_MODEL ?? "(unconfigured)",
      options: modelOptions(options),
      systemPrompt,
      userPrompt,
      startedAt,
    };
    try {
      const rawOutput = await callProvider(systemPrompt, userPrompt, capturedOptions);
      calls.push({
        ...baseCall,
        finishedAt: new Date().toISOString(),
        rawOutput,
        ...(usageHolder.value ? { usage: usageHolder.value } : {}),
      });
      return rawOutput;
    } catch (error) {
      calls.push({
        ...baseCall,
        finishedAt: new Date().toISOString(),
        failure: captureFailure(error),
        ...(usageHolder.value ? { usage: usageHolder.value } : {}),
      });
      throw error;
    }
  };
}

async function generateProject(
  caseDefinition: EvaluationCase,
  generationPath: GenerationPath,
  modelCalls: CapturedModelCall[],
): Promise<{
  project: VideoProject;
  diagnostics: EvaluationDiagnostic[];
}> {
  if (generationPath === "root") {
    const result = await generateComposedVideo(
      { prompt: caseDefinition.prompt, duration: caseDefinition.duration },
      { callModel: createCapturedCaller(modelCalls, callRootModel) },
    );
    return {
      project: result.project,
      diagnostics: result.scenes.flatMap((scene) =>
        scene.diagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          severity: 4,
          message: `${scene.scene.id}: ${diagnostic.reason}`,
          eventIds: scene.project.events.map((event) => `${scene.scene.id}-${event.id}`),
        }))
      ),
    };
  }
  const result = await generateVideoPart(
    {
      part: "main-diagram",
      prompt: caseDefinition.prompt,
      duration: caseDefinition.duration,
    },
    { callModel: createCapturedCaller(modelCalls, callDevModel) },
  );
  return { project: result.project, diagnostics: [] };
}

function browserCandidates(): string[] {
  if (process.env.CHROME_PATH) return [process.env.CHROME_PATH];
  if (process.platform === "win32") {
    return [
      path.join(process.env.PROGRAMFILES ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env.PROGRAMFILES ?? "", "Microsoft", "Edge", "Application", "msedge.exe"),
    ];
  }
  return ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"];
}

function resolveBrowser(): string {
  for (const candidate of browserCandidates()) {
    if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
    if (!path.isAbsolute(candidate)) {
      const probe = spawnSync(candidate, ["--version"], { stdio: "ignore" });
      if (!probe.error) return candidate;
    }
  }
  throw new Error("Chrome, Chromium, or Edge was not found. Set CHROME_PATH explicitly.");
}

async function waitForServer(url: string, server: ChildProcess): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`The renderer server exited with code ${server.exitCode}.`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the renderer server.");
}

async function startRendererServer(): Promise<ChildProcess> {
  const nextBin = path.join(NEXT_ROOT, "node_modules", "next", "dist", "bin", "next");
  const server = spawn(
    process.execPath,
    [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(RENDER_PORT)],
    { cwd: NEXT_ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );
  let recentOutput = "";
  server.stdout?.on("data", (chunk) => {
    recentOutput = `${recentOutput}${String(chunk)}`.slice(-4_000);
  });
  server.stderr?.on("data", (chunk) => {
    recentOutput = `${recentOutput}${String(chunk)}`.slice(-4_000);
  });
  try {
    await waitForServer(`http://127.0.0.1:${RENDER_PORT}/dev/renderer-only?time=0`, server);
  } catch (error) {
    server.kill();
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${recentOutput}`);
  }
  return server;
}

async function captureFrame(
  browser: string,
  project: VideoProject,
  time: number,
  outputPath: string,
): Promise<void> {
  fs.writeFileSync(
    TEMP_PROJECT_PATH,
    `window.tempProject = ${JSON.stringify(project)};\n`,
  );
  const url = `http://127.0.0.1:${RENDER_PORT}/dev/renderer-only?time=${time}&run=${Date.now()}`;
  const browserProfile = fs.mkdtempSync(path.join(os.tmpdir(), "videogpt-quality-"));
  try {
    const result = spawnSync(browser, [
      "--headless",
      "--disable-background-networking",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-default-browser-check",
      "--no-first-run",
      `--user-data-dir=${browserProfile}`,
      "--window-size=1920,1080",
      "--virtual-time-budget=3000",
      `--screenshot=${outputPath}`,
      url,
    ], { encoding: "utf8", timeout: 60_000 });
    if (result.error) throw result.error;
    if (result.status !== 0 || !fs.existsSync(outputPath)) {
      throw new Error(
        `Browser capture failed with status ${result.status}: ${(result.stderr || result.stdout).slice(0, 500)}`,
      );
    }
  } finally {
    fs.rmSync(browserProfile, { recursive: true, force: true });
  }
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function relativeUrl(fromDirectory: string, filePath: string): string {
  return path.relative(fromDirectory, filePath).split(path.sep).join("/");
}

function reportHtml(
  evaluationId: string,
  evaluationDirectory: string,
  cases: EvaluationCase[],
  artifacts: EvaluationArtifactMetadata[],
): string {
  const caseSections = cases.map((caseDefinition) => {
    const rows = Array.from({ length: REPETITIONS }, (_, repetitionIndex) => {
      const repetition = repetitionIndex + 1;
      const root = artifacts.find((artifact) =>
        artifact.caseId === caseDefinition.id
        && artifact.generationPath === "root"
        && artifact.repetition === repetition
      );
      const dev = artifacts.find((artifact) =>
        artifact.caseId === caseDefinition.id
        && artifact.generationPath === "dev"
        && artifact.repetition === repetition
      );
      const cells = [root, dev].map((artifact) => {
        if (!artifact) return "<td><p>Missing artifact</p></td>";
        const frames = artifact.renderedFrames.map((frame, index) =>
          `<figure><img src="${escapeHtml(relativeUrl(evaluationDirectory, path.join(evaluationDirectory, frame)))}" alt="${escapeHtml(artifact.artifactId)} frame ${index + 1}"><figcaption>${Math.round(FRAME_FRACTIONS[index] * 100)}%</figcaption></figure>`
        ).join("");
        const diagnostics = artifact.diagnostics.length === 0
          ? "No deterministic flags"
          : artifact.diagnostics.map((entry) => escapeHtml(entry.code)).join(", ");
        return `<td><div class="frames">${frames}</div><p><code>${escapeHtml(artifact.artifactId)}</code></p><p>${diagnostics}</p></td>`;
      });
      return `<tr><th scope="row">Run ${repetition}</th>${cells.join("")}</tr>`;
    }).join("");
    return `<section><h2>${escapeHtml(caseDefinition.id)} · ${caseDefinition.duration}s · ${escapeHtml(caseDefinition.category)}</h2><p>${escapeHtml(caseDefinition.prompt)}</p><table><thead><tr><th>Repetition</th><th>Root</th><th>Dev</th></tr></thead><tbody>${rows}</tbody></table></section>`;
  }).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Scene quality evaluation ${escapeHtml(evaluationId)}</title>
<style>
body{font:15px system-ui,sans-serif;margin:0 auto;max-width:1800px;padding:24px;background:#0b1020;color:#e5e7eb}
h1,h2{color:#fff}section{margin:48px 0}table{border-collapse:collapse;width:100%;table-layout:fixed}
th,td{border:1px solid #334155;padding:12px;vertical-align:top}th:first-child{width:72px}
.frames{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}figure{margin:0}img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:#000}
figcaption{text-align:center;color:#94a3b8;margin-top:4px}code{color:#93c5fd}
</style></head><body><h1>Scene quality evaluation</h1>
<p>Evaluation <code>${escapeHtml(evaluationId)}</code>. Score each artifact in <code>rubric.json</code> from 1–5 for subject specificity, meaningful geometry, animation, and readability.</p>
${caseSections}</body></html>`;
}

function createRubric(artifacts: EvaluationArtifactMetadata[]): RubricFile {
  return {
    instructions: "View index.html, then replace each null with an integer from 1 (poor) to 5 (excellent). Run the summarize command afterward.",
    scale: {
      subjectSpecificity: "Does the visual encode the named subject rather than a reusable generic diagram?",
      meaningfulGeometry: "Do spatial relationships and shapes explain the subject?",
      animation: "Does motion or sequencing clarify change, flow, or causality?",
      readability: "Are labels legible, concise, well placed, and visually distinct?",
    },
    entries: artifacts.map((artifact) => ({
      artifactId: artifact.artifactId,
      caseId: artifact.caseId,
      generationPath: artifact.generationPath,
      repetition: artifact.repetition,
      notes: "",
      ...Object.fromEntries(HUMAN_SCORE_CRITERIA.map((criterion) => [criterion, null])),
    } as RubricEntry)),
  };
}

function completedScores(rubric: RubricFile): HumanScore[] {
  return rubric.entries.flatMap((entry) => {
    const values = HUMAN_SCORE_CRITERIA.map((criterion) => entry[criterion]);
    if (values.every((value) => value === null)) return [];
    if (values.some((value) => value === null)) {
      throw new Error(`${entry.artifactId} has a partially completed rubric score.`);
    }
    const criteria = Object.fromEntries(
      HUMAN_SCORE_CRITERIA.map((criterion) => [criterion, entry[criterion]]),
    ) as Record<HumanScoreCriterion, number>;
    return [{
      artifactId: entry.artifactId,
      ...criteria,
    }];
  });
}

function writeSummary(evaluationDirectory: string): "pass" | "fail" | "incomplete" {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(evaluationDirectory, "manifest.json"), "utf8"),
  ) as Partial<EvaluationManifest> & Pick<EvaluationManifest, "evaluationId" | "createdAt" | "cases">;
  const artifacts = JSON.parse(
    fs.readFileSync(path.join(evaluationDirectory, "artifacts.json"), "utf8"),
  ) as EvaluationArtifactMetadata[];
  const rubric = JSON.parse(
    fs.readFileSync(path.join(evaluationDirectory, "rubric.json"), "utf8"),
  ) as RubricFile;
  const runs: ScoredRun[] = artifacts.map((artifact) => {
    const currentDiagnostics = artifact.normalizedProject === undefined
      ? artifact.diagnostics
      : [...artifact.diagnostics, ...classifyProjectDiagnostics(artifact.normalizedProject)];
    return {
      artifactId: artifact.artifactId,
      caseId: artifact.caseId,
      generationPath: artifact.generationPath,
      failureSeverity: diagnosticFailureSeverity(currentDiagnostics),
      disqualified: hasDisqualifyingDiagnostics(currentDiagnostics),
      requiredArtifactsPresent:
        fs.existsSync(path.join(
          evaluationDirectory,
          "runs",
          artifact.artifactId,
          "metadata.json",
        ))
        && artifact.normalizedProject !== undefined
        && fs.existsSync(path.join(
          evaluationDirectory,
          "runs",
          artifact.artifactId,
          "project.json",
        ))
        && artifact.renderedFrames.length === FRAME_FRACTIONS.length
        && artifact.renderedFrames.every((frame) =>
          fs.existsSync(path.join(evaluationDirectory, frame))
        ),
    };
  });
  const scores = completedScores(rubric);
  const summaries = summarizeEvaluation(runs, scores);
  const assessment = assessQualityThreshold({
    runs,
    scores,
    caseIds: manifest.cases.map((caseDefinition) => caseDefinition.id),
    repetitions: manifest.repetitions ?? REPETITIONS,
  });
  const modelConfigurations = [
    ...new Map(artifacts.flatMap((artifact) =>
      artifact.modelCalls.map((call) => {
        const configuration = {
          generationPath: artifact.generationPath,
          model: call.model,
          options: call.options,
        };
        return [JSON.stringify(configuration), configuration] as const;
      })
    )).values(),
  ];
  writeJson(path.join(evaluationDirectory, "results.json"), {
    schemaVersion: 1,
    evaluationId: manifest.evaluationId,
    runTimestamp: manifest.createdAt,
    summarizedAt: new Date().toISOString(),
    evaluationCaseRevision:
      manifest.evaluationCaseRevision ?? evaluationCaseRevision(manifest.cases),
    requestedModel: manifest.requestedModel ?? null,
    modelConfigurations,
    thresholds: {
      rootOverallMedianAtLeastDev: true,
      minimumRootCategoryAverage: 3,
      maximumPerPromptRootDeficit: 0.5,
      disqualifyingDiagnostics: DISQUALIFYING_DIAGNOSTIC_CODES,
    },
    summaries,
    assessment,
  });
  console.log(`Wrote ${path.join(evaluationDirectory, "results.json")}`);
  return assessment.status;
}

async function runEvaluation(outputRoot: string): Promise<void> {
  if (!process.env.OPENROUTER_API_KEY || !process.env.DEFAULT_MODEL) {
    throw new Error("OPENROUTER_API_KEY and DEFAULT_MODEL are required.");
  }
  if (isInsideDirectory(NEXT_ROOT, outputRoot)) {
    throw new Error("Evaluation artifacts must be stored outside the next/ application directory.");
  }
  const cases = loadEvaluationCases();
  const evaluationId = `scene-quality-${timestampId()}`;
  const evaluationDirectory = path.join(outputRoot, evaluationId);
  fs.mkdirSync(evaluationDirectory, { recursive: true });
  const manifest: EvaluationManifest = {
    schemaVersion: 1,
    evaluationId,
    createdAt: new Date().toISOString(),
    requestedModel: process.env.DEFAULT_MODEL,
    evaluationCaseRevision: evaluationCaseRevision(cases),
    repetitions: REPETITIONS,
    frameFractions: FRAME_FRACTIONS,
    cases,
  };
  writeJson(path.join(evaluationDirectory, "manifest.json"), manifest);

  const browser = resolveBrowser();
  const server = await startRendererServer();
  const artifacts: EvaluationArtifactMetadata[] = [];
  const previousTempProject = fs.existsSync(TEMP_PROJECT_PATH)
    ? fs.readFileSync(TEMP_PROJECT_PATH, "utf8")
    : undefined;
  try {
    for (const caseDefinition of cases) {
      for (const generationPath of ["root", "dev"] as const) {
        for (let repetition = 1; repetition <= REPETITIONS; repetition += 1) {
          const artifactId = `${caseDefinition.id}-${generationPath}-${repetition}`;
          console.log(`[${artifacts.length + 1}/48] ${artifactId}`);
          const artifactDirectory = path.join(evaluationDirectory, "runs", artifactId);
          fs.mkdirSync(artifactDirectory, { recursive: true });
          const startedAt = new Date().toISOString();
          const modelCalls: CapturedModelCall[] = [];
          const diagnostics: EvaluationDiagnostic[] = [];
          let normalizedProject: VideoProject | undefined;
          let rawFailure: unknown;
          const renderedFrames: string[] = [];
          try {
            const generated = await generateProject(
              caseDefinition,
              generationPath,
              modelCalls,
            );
            normalizedProject = generated.project;
            diagnostics.push(...generated.diagnostics);
            diagnostics.push(...classifyProjectDiagnostics(normalizedProject));
            writeJson(path.join(artifactDirectory, "project.json"), normalizedProject);
            for (let frameIndex = 0; frameIndex < FRAME_FRACTIONS.length; frameIndex += 1) {
              const fraction = FRAME_FRACTIONS[frameIndex];
              const framePath = path.join(artifactDirectory, `frame-${frameIndex + 1}.png`);
              try {
                await captureFrame(
                  browser,
                  normalizedProject,
                  Number((normalizedProject.duration * fraction).toFixed(3)),
                  framePath,
                );
                renderedFrames.push(relativeUrl(evaluationDirectory, framePath));
              } catch (error) {
                diagnostics.push(rendererFailureDiagnostic(error));
                break;
              }
            }
          } catch (error) {
            rawFailure = error;
            diagnostics.push(generationFailureDiagnostic(error));
          }

          const metadata = createArtifactMetadata({
            evaluationId,
            caseDefinition,
            generationPath,
            repetition,
            startedAt,
            finishedAt: new Date().toISOString(),
            modelCalls,
            normalizedProject,
            diagnostics,
            rawFailure,
            renderedFrames,
          });
          artifacts.push(metadata);
          writeJson(path.join(artifactDirectory, "metadata.json"), metadata);
        }
      }
    }
  } finally {
    server.kill();
    if (previousTempProject === undefined) {
      if (fs.existsSync(TEMP_PROJECT_PATH)) fs.rmSync(TEMP_PROJECT_PATH);
    } else {
      fs.writeFileSync(TEMP_PROJECT_PATH, previousTempProject);
    }
  }

  writeJson(path.join(evaluationDirectory, "artifacts.json"), artifacts);
  writeJson(path.join(evaluationDirectory, "rubric.json"), createRubric(artifacts));
  writeSummary(evaluationDirectory);
  fs.writeFileSync(
    path.join(evaluationDirectory, "index.html"),
    reportHtml(evaluationId, evaluationDirectory, cases, artifacts),
  );
  console.log(`Evaluation complete: ${evaluationDirectory}`);
}

async function main(): Promise<void> {
  const { outputRoot, summarizeDirectory } = parseArguments();
  if (summarizeDirectory) {
    const status = writeSummary(summarizeDirectory);
    if (status !== "pass") {
      console.error(`Quality threshold status: ${status}`);
      process.exitCode = 1;
    }
    return;
  }
  await runEvaluation(outputRoot);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
