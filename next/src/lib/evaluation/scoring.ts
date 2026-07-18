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
};

export type EvaluationSummary = {
  caseId: string;
  generationPath: GenerationPath;
  medianArtifactId: string | null;
  worstArtifactId: string;
  scoredRuns: number;
};

function validatedTotal(score: HumanScore): number {
  const values = HUMAN_SCORE_CRITERIA.map((criterion) => score[criterion]);
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 5)) {
    throw new Error(`Human scores for ${score.artifactId} must be integers from 1 to 5.`);
  }
  return values.reduce((sum, value) => sum + value, 0);
}

export function summarizeEvaluation(
  runs: ScoredRun[],
  scores: HumanScore[],
): EvaluationSummary[] {
  const scoreByArtifact = new Map(scores.map((score) => [score.artifactId, validatedTotal(score)]));
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
      worstArtifactId: worst.artifactId,
      scoredRuns: scored.length,
    };
  });
}
