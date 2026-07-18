import type { GenerationPath } from "@/lib/evaluation/metadata";

export const HUMAN_SCORE_CRITERIA = [
  "subjectSpecificity",
  "meaningfulGeometry",
  "animation",
  "readability",
] as const;

export type HumanScoreCriterion = (typeof HUMAN_SCORE_CRITERIA)[number];

export type HumanScore = {
  artifactId: string;
} & Record<HumanScoreCriterion, number>;

export type ScoredRun = {
  artifactId: string;
  caseId: string;
  generationPath: GenerationPath;
  failureSeverity: number;
  disqualified?: boolean;
  requiredArtifactsPresent?: boolean;
};

export type EvaluationSummary = {
  caseId: string;
  generationPath: GenerationPath;
  medianArtifactId: string | null;
  medianOverallScore: number | null;
  worstArtifactId: string;
  worstOverallScore: number | null;
  worstFailureSeverity: number;
  scoredRuns: number;
  totalRuns: number;
};

export type QualityThresholdAssessment = {
  status: "pass" | "fail" | "incomplete";
  runCount: { actual: number; expected: number; pass: boolean };
  scoring: { actual: number; expected: number; pass: boolean };
  artifacts: { artifactIds: string[]; pass: boolean };
  disqualifiedRuns: { artifactIds: string[]; pass: boolean };
  overallMedian: { root: number | null; dev: number | null; pass: boolean | null };
  rootCategoryAverages: {
    values: Record<HumanScoreCriterion, number | null>;
    minimum: number;
    pass: boolean | null;
  };
  promptComparisons: Array<{
    caseId: string;
    rootMedian: number | null;
    devMedian: number | null;
    gap: number | null;
    pass: boolean | null;
  }>;
};

function rounded(value: number): number {
  return Number(value.toFixed(3));
}

function validatedOverall(score: HumanScore): number {
  const values = HUMAN_SCORE_CRITERIA.map((criterion) => score[criterion]);
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) {
    throw new Error(`Human scores for ${score.artifactId} must be integers from 1 to 5.`);
  }
  return rounded(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : rounded((sorted[middle - 1] + sorted[middle]) / 2);
}

export function summarizeEvaluation(
  runs: ScoredRun[],
  scores: HumanScore[],
): EvaluationSummary[] {
  const scoreByArtifact = new Map(scores.map((score) => [score.artifactId, validatedOverall(score)]));
  const groupKeys = [...new Set(runs.map((run) => `${run.caseId}\u0000${run.generationPath}`))];

  return groupKeys.map((key) => {
    const [caseId, generationPath] = key.split("\u0000") as [string, GenerationPath];
    const group = runs.filter(
      (run) => run.caseId === caseId && run.generationPath === generationPath,
    );
    const scored = group
      .flatMap((run) => {
        const total = scoreByArtifact.get(run.artifactId);
        return total === undefined ? [] : [{ artifactId: run.artifactId, total }];
      })
      .sort((first, second) =>
        (first.total - second.total) || first.artifactId.localeCompare(second.artifactId)
      );
    const worst = [...group].sort((first, second) =>
      (second.failureSeverity - first.failureSeverity)
      || ((scoreByArtifact.get(first.artifactId) ?? Number.POSITIVE_INFINITY)
        - (scoreByArtifact.get(second.artifactId) ?? Number.POSITIVE_INFINITY))
      || first.artifactId.localeCompare(second.artifactId)
    )[0];

    return {
      caseId,
      generationPath,
      medianArtifactId: scored.length === 0
        ? null
        : scored[Math.floor((scored.length - 1) / 2)].artifactId,
      medianOverallScore: median(scored.map((entry) => entry.total)),
      worstArtifactId: worst.artifactId,
      worstOverallScore: scoreByArtifact.get(worst.artifactId) ?? null,
      worstFailureSeverity: worst.failureSeverity,
      scoredRuns: scored.length,
      totalRuns: group.length,
    };
  });
}

export function assessQualityThreshold(input: {
  runs: ScoredRun[];
  scores: HumanScore[];
  caseIds: string[];
  repetitions: number;
}): QualityThresholdAssessment {
  const expected = input.caseIds.length * 2 * input.repetitions;
  const expectedGroups = input.caseIds.flatMap((caseId) =>
    (["root", "dev"] as const).map((generationPath) => ({ caseId, generationPath }))
  );
  const artifactIds = new Set(input.runs.map((run) => run.artifactId));
  const runStructureIsComplete =
    input.runs.length === expected
    && artifactIds.size === input.runs.length
    && input.runs.every((run) => input.caseIds.includes(run.caseId))
    && expectedGroups.every(({ caseId, generationPath }) =>
      input.runs.filter((run) =>
        run.caseId === caseId && run.generationPath === generationPath
      ).length === input.repetitions
    );
  const scoreIds = new Set(input.scores.map((score) => score.artifactId));
  const scoringIsComplete =
    input.scores.length === expected
    && scoreIds.size === input.scores.length
    && input.scores.every((score) => artifactIds.has(score.artifactId));
  const scoreByArtifact = new Map(
    input.scores.map((score) => [score.artifactId, {
      score,
      overall: validatedOverall(score),
    }]),
  );
  const scoredOverallValues = (
    matches: (run: ScoredRun) => boolean,
  ): number[] => input.runs.filter(matches).flatMap((run) => {
    const score = scoreByArtifact.get(run.artifactId);
    return score ? [score.overall] : [];
  });

  const pathMedian = (generationPath: GenerationPath) =>
    median(scoredOverallValues((run) => run.generationPath === generationPath));
  const rootMedian = pathMedian("root");
  const devMedian = pathMedian("dev");
  const overallMedianPass = rootMedian === null || devMedian === null
    ? null
    : rootMedian >= devMedian;

  const rootScores = input.runs
    .filter((run) => run.generationPath === "root")
    .flatMap((run) => {
      const score = scoreByArtifact.get(run.artifactId);
      return score ? [score.score] : [];
    });
  const categoryValues = Object.fromEntries(HUMAN_SCORE_CRITERIA.map((criterion) => [
    criterion,
    rootScores.length === 0
      ? null
      : rounded(
        rootScores.reduce((sum, score) => sum + score[criterion], 0) / rootScores.length,
      ),
  ])) as Record<HumanScoreCriterion, number | null>;
  const categoryAveragesPass = rootScores.length === 0
    ? null
    : HUMAN_SCORE_CRITERIA.every((criterion) =>
      (categoryValues[criterion] ?? Number.NEGATIVE_INFINITY) >= 3
    );

  const promptComparisons = input.caseIds.map((caseId) => {
    const medianFor = (generationPath: GenerationPath) =>
      median(scoredOverallValues((run) =>
        run.caseId === caseId && run.generationPath === generationPath
      ));
    const root = medianFor("root");
    const dev = medianFor("dev");
    const gap = root === null || dev === null ? null : rounded(dev - root);
    return {
      caseId,
      rootMedian: root,
      devMedian: dev,
      gap,
      pass: gap === null ? null : gap <= 0.5,
    };
  });
  const disqualifiedArtifactIds = input.runs
    .filter((run) => run.disqualified)
    .map((run) => run.artifactId)
    .sort();
  const incompleteArtifactIds = input.runs
    .filter((run) => run.requiredArtifactsPresent === false)
    .map((run) => run.artifactId)
    .sort();
  const complete = runStructureIsComplete && scoringIsComplete;
  const thresholdsPass =
    incompleteArtifactIds.length === 0
    &&
    disqualifiedArtifactIds.length === 0
    && overallMedianPass === true
    && categoryAveragesPass === true
    && promptComparisons.every((comparison) => comparison.pass === true);

  return {
    status: !complete ? "incomplete" : thresholdsPass ? "pass" : "fail",
    runCount: { actual: input.runs.length, expected, pass: runStructureIsComplete },
    scoring: { actual: input.scores.length, expected, pass: scoringIsComplete },
    artifacts: {
      artifactIds: incompleteArtifactIds,
      pass: incompleteArtifactIds.length === 0,
    },
    disqualifiedRuns: {
      artifactIds: disqualifiedArtifactIds,
      pass: disqualifiedArtifactIds.length === 0,
    },
    overallMedian: { root: rootMedian, dev: devMedian, pass: overallMedianPass },
    rootCategoryAverages: {
      values: categoryValues,
      minimum: 3,
      pass: categoryAveragesPass,
    },
    promptComparisons,
  };
}
