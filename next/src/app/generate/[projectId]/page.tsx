import { GenerateWorkspace } from "@/components/generate/GenerateWorkspace";

export default async function ProjectGeneratePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <GenerateWorkspace projectId={projectId} />;
}
