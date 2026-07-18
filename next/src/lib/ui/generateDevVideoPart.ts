import type {
  GenerateVideoPartRequest,
  GenerateVideoPartResponse,
} from "@/lib/agent/videoParts/schemas";
import { saveDevGeneratedProject } from "@/lib/ui/devGeneratedProjects";

type ErrorResponse = { error?: string };
type Requester = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Runs the dev generation page's public request-and-persist workflow.
 * The returned project is ready to pass directly to the shared player.
 */
export async function generateAndSaveDevVideoPart(
  input: GenerateVideoPartRequest,
  request: Requester = fetch,
): Promise<GenerateVideoPartResponse> {
  const response = await request("/api/dev/generate-part", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await response.json()) as GenerateVideoPartResponse | ErrorResponse;
  if (!response.ok) {
    throw new Error("error" in data && data.error ? data.error : `HTTP ${response.status}`);
  }

  const generated = data as GenerateVideoPartResponse;
  saveDevGeneratedProject({
    part: input.part,
    prompt: input.prompt,
    project: generated.project,
    content: generated.content,
  });
  return generated;
}
