import { z } from "zod";
import {
  SUPPORTED_DURATIONS,
  SupportedDurationSchema,
} from "@/lib/others/schemas/duration";

export const EvaluationCategorySchema = z.enum([
  "software-topology",
  "physical-mechanism",
  "process",
  "comparison",
]);

export const EvaluationCaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  prompt: z.string().trim().min(1),
  duration: SupportedDurationSchema,
  category: EvaluationCategorySchema,
}).strict();

export type EvaluationCase = z.infer<typeof EvaluationCaseSchema>;

const FIXED_EVALUATION_CASES = [
  {
    id: "database-replication",
    prompt: "Show how a primary database replicates writes to two replicas and what replication lag means.",
    duration: 5,
    category: "software-topology",
  },
  {
    id: "heat-pump-cycle",
    prompt: "Explain how a heat pump moves heat indoors using evaporation, compression, condensation, and expansion.",
    duration: 5,
    category: "physical-mechanism",
  },
  {
    id: "arch-dam-load-path",
    prompt: "Show how an arch dam transfers water pressure through its curved wall into the canyon bedrock.",
    duration: 10,
    category: "physical-mechanism",
  },
  {
    id: "credit-card-authorization",
    prompt: "Explain the process from tapping a credit card to an approved payment at the terminal.",
    duration: 10,
    category: "process",
  },
  {
    id: "container-deployment",
    prompt: "Show how a containerized application is deployed from an image registry through a scheduler onto a cluster.",
    duration: 15,
    category: "software-topology",
  },
  {
    id: "water-treatment",
    prompt: "Explain the municipal water-treatment process from intake through filtration and disinfection.",
    duration: 15,
    category: "process",
  },
  {
    id: "battery-comparison",
    prompt: "Compare lithium-ion and sodium-ion batteries by energy density, material availability, cost, and best use.",
    duration: 20,
    category: "comparison",
  },
  {
    id: "rail-air-travel",
    prompt: "Compare high-speed rail and short-haul air travel by trip stages, city-center access, emissions, and total journey time.",
    duration: 20,
    category: "comparison",
  },
] satisfies EvaluationCase[];

export function loadEvaluationCases(): EvaluationCase[] {
  const cases = z.array(EvaluationCaseSchema).length(8).parse(FIXED_EVALUATION_CASES);
  const ids = new Set(cases.map((entry) => entry.id));
  if (ids.size !== cases.length) throw new Error("Evaluation case ids must be unique.");

  for (const duration of SUPPORTED_DURATIONS) {
    if (cases.filter((entry) => entry.duration === duration).length !== 2) {
      throw new Error(`Evaluation cases must contain exactly two ${duration}s prompts.`);
    }
  }
  for (const category of EvaluationCategorySchema.options) {
    if (cases.filter((entry) => entry.category === category).length !== 2) {
      throw new Error(`Evaluation cases must contain exactly two ${category} prompts.`);
    }
  }
  return cases.map((entry) => ({ ...entry }));
}
