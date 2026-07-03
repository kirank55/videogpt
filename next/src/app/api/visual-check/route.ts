import { NextRequest, NextResponse } from "next/server";
import { callOpenRouter } from "@/lib/agent/ai/openrouter";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, frames } = body;

  if (!prompt || !Array.isArray(frames)) {
    return NextResponse.json(
      { error: "Missing required fields: prompt and frames array are required." },
      { status: 422 },
    );
  }

  console.log(`[api/visual-check] Running check for prompt="${prompt}" with ${frames.length} frames`);
  const t0 = Date.now();

  // 1. Build the system prompt
  const systemPrompt = `You are an expert video quality assurance AI. Your task is to analyze a series of sequentially captured frames from an animation generated for the prompt: "${prompt}".
Verify if the layout, styling, text readability, alignment, and overall presentation look clean and professional.

Evaluate these visual criteria across all frames:
- Overlapping elements: Text labels, headers, or descriptions colliding or rendering on top of each other.
- Alignment & Spacing: Connecting arrow lines meeting node boundaries properly, clean grids, and well-distributed whitespace.
- Text clipping: Text extending past the canvas borders or being cropped.
- Contrast & Readability: Text or shapes being hard to read due to color clashes.
- Theme alignment: Do the layout and icons sensibly depict the prompt topic?

You MUST return a JSON object with:
1. "score": Overall video visual quality score (0 to 100).
2. "passed": Boolean, true if score >= 70.
3. "summary": A 2-3 sentence overview of the video's layout quality and matching.
4. "frames": Array of objects for each of the 5 acts containing:
   - "actIndex": 1-based act index (1 to 5)
   - "timestamp": seconds
   - "score": 0 to 100 visual score for this frame
   - "feedback": 1-2 sentence detailed critique of this specific frame
   - "issues": Array of { "severity": "warning" | "error", "description": string }
5. "recommendations": Array of actionable recommendations to improve the video's look or fix layout bugs.

Do NOT include any markdown code blocks or explanations outside of the JSON object. Return ONLY the JSON object.`;

  // 2. Build the messages content list for user
  const userContent: Array<any> = [
    {
      type: "text",
      text: `Analyze these ${frames.length} sequential frames of the generated animation. Identify any visual bugs like overlap, misalignment, or readability issues.`,
    },
  ];

  // Add the base64 frames to the user message
  for (const frame of frames) {
    userContent.push({
      type: "text",
      text: `[Frame ${frame.actIndex} at ${frame.timestamp.toFixed(1)}s]`,
    });
    userContent.push({
      type: "image_url",
      image_url: {
        url: frame.dataUrl,
      },
    });
  }

  try {
    const model = process.env.VISUAL_CHECK_MODEL;
    console.log(`[api/visual-check] Calling OpenRouter model: ${model}`);
    const rawResult = await callOpenRouter(systemPrompt, userContent, {
      model,
      temperature: 0.2, // Low temperature for consistent layout analysis
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[api/visual-check] completed in ${elapsed}s`);

    return NextResponse.json(rawResult);
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api/visual-check] failed after ${elapsed}s:`, message);

    return NextResponse.json(
      {
        error: `Visual check LLM request failed: ${message}`,
        summary: "Visual quality analysis was unavailable.",
      },
      { status: 502 },
    );
  }
}
