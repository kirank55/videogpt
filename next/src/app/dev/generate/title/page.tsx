import { VideoPartGeneratePage } from "@/components/dev/VideoPartGeneratePage";

export default function DevTitleGeneratePage() {
  return (
    <VideoPartGeneratePage
      part="title"
      title="Dev — Title Generator"
      description="Generate and preview only the title and optional subtitle. No setup scene, diagram, or conclusion is requested from the model."
    />
  );
}
