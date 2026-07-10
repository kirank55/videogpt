import { VideoPartGeneratePage } from "@/components/dev/VideoPartGeneratePage";

export default function DevConclusionGeneratePage() {
  return (
    <VideoPartGeneratePage
      part="conclusion"
      title="Dev — Conclusion Generator"
      description="Generate and preview only one concise closing line. No title or scene data is requested from the model."
    />
  );
}
