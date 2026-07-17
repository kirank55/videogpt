import {
  type VideoPartKind,
} from "@/lib/agent/videoParts/schemas";
import { getVideoPartBudget } from "@/lib/agent/videoParts/budgets";

const roleGuides: Record<VideoPartKind, string> = {
  title: "Write a concise, compelling video title and an optional explanatory subtitle. Generate no scene content.",
  summary: `Author a compact direct animated canvas timeline that introduces the topic and its essential structure. This Summary is the visual introduction; the independently generated Main Diagram explains the deeper mechanism.
Use one clear visual idea, no more than 6 short text events, and a small number of topic-specific shapes. Prefer a compact spatial overview, cutaway, relationship map, cycle, or simple flow only when the subject intrinsically calls for it. Avoid exhaustive steps, dense annotations, causal detail, generic card rows, and decorative complexity.
Return renderer events directly, never an intermediate graph, primitive plan, scene, storyboard, or layout name.`,
  "main-diagram": `Author one direct animated canvas timeline that explains one underlying mechanism, causal relationship, spatial model, cutaway, state transition, or interaction from the topic. This is the detailed Main Diagram, not an introduction or recap.
Choose a visual composition shaped by the subject. Do not use generic card rows, evenly spaced stage boxes, or left-to-right pipelines unless that structure is intrinsic to the subject. For software topics, prefer topology, changing state, memory, contention, routing decisions, or data movement over a generic request pipeline. Examples: a solar-cell prompt can draw a semiconductor cross-section with charge carriers separating; a database prompt can draw changing replica state and a lagging log cursor; a dam prompt can draw load paths through the structure into bedrock.
Compose complex visuals from multiple rectangles, circles, triangles, lines, icons, badges, progress shapes, particles, labels, and animated paths, using the complete TimelineEvent vocabulary in the schema.
The canvas is 1920x1080 with absolute coordinates and generous margins. Layer 0 is the background, layers 1-6 hold diagram structure and motion, layers 7+ hold labels. Labels and badges use at least 24px font (titles 32px), font weight at least 600 below title size, and a high-contrast backdrop with at least 0.7 opacity and generous padding. Keep every simultaneously visible text or badge box at least 8px away from every other label box throughout its animation; never stack labels or place one over the title. If two labels need the same region, separate their active times or place them in open space with callout lines. Do not place small or low-contrast text directly over slabs, paths, lines, particles, or changing geometry.
Include a background spanning the full duration, at least one readable label, at least three shapes, and visible motion or staggered reveals. Keep all event times within the requested duration. Return renderer events directly, never an intermediate scene, graph, storyboard, or layout name.`,
  conclusion: "Write one concise closing line that resolves the explanation. Generate no title or scene content.",
};

const rendererContract = `
OUTPUT CONTRACT (only these keys; fields without a type label are numbers):
Root: {"mode":"direct-summary-timeline"|"direct-timeline","name":string,"visualIntent":string,"events":TimelineEvent[]}
Every event: {"id":unique string,"type":...,"start":number>=0,"end":number,"layer":integer>=0}. Keep 0 <= start < end <= segment duration.
Optional animation keys on any event: opacity, translateX, translateY, scale, scaleX, scaleY, rotate, drawProgress. Each is {"from":number,"to":number,"easing":"linear"|"easeIn"|"easeOut"|"easeInOut"|"bounce"} or {"keyframes":[{"time":number,"value":number,"easing":...}]}. Optional path is {"points":[{"x":number,"y":number},...],"easing":...}.
TimelineEvent variants:
- background: {type:"background",background:{kind:"solid",color:string}|{kind:"gradient",from:string,to:string,angle}}
- text: {type:"text",text:string,x,y,maxWidth,color:string,fontSize,fontWeight?:number|string,align?:"left"|"right"|"center",backdrop?:{fill:string,paddingX?,paddingY?,radius?}}
- rect: {type:"shape",shapeType:"rect",x,y,width,height,fill:string,radius?,stroke?:string,strokeWidth?}
- circle: {type:"shape",shapeType:"circle",x,y,radius,fill:string,stroke?:string,strokeWidth?}
- triangle: {type:"shape",shapeType:"triangle",x,y,width,height,fill:string,stroke?:string,strokeWidth?}
- line: {type:"shape",shapeType:"line",x1,y1,x2,y2,stroke:string,lineWidth,arrowStart?:boolean,arrowEnd?:boolean}
- icon: {type:"shape",shapeType:"icon",iconName:"browser"|"server"|"database"|"cloud"|"lock"|"globe"|"gear"|"code"|"api"|"mobile"|"router"|"shield"|"cpu"|"cache"|"app"|"building"|"foundation"|"beam"|"floor"|"elevator"|"wall"|"wrench"|"water",cx,cy,size,color:string}
- badge: {type:"shape",shapeType:"badge",cx,cy,text:string,fontSize?,paddingX?,paddingY?,fill:string,textColor:string}
- progress: {type:"shape",shapeType:"progress",x,y,width,height,trackColor:string,fillColor:string,fillFraction?}
- particle: {type:"particle",count:positive integer,seed:nonnegative integer,origin:{x,y},spread:{x,y},drift:{x,y},particleRadius:{min,max},color:string}
Do not invent event types, shape types, fields, or wrapper objects.`;

export function buildVideoPartSystemPrompt(
  part: VideoPartKind,
  duration: number,
  visualContext?: string,
): string {
  const budget = getVideoPartBudget(part, duration);
  const ownershipGuide = part === "summary" || part === "main-diagram"
    ? "The server owns only project id, canvas dimensions, duration, and final section offset. The canvas renderer draws your validated TimelineEvents exactly; no layout or scene-expansion pipeline will reposition them."
    : "The deterministic bookend renderer owns palette, style, coordinates, timing, and transitions.";
  return `
You write one authored part for an animated infographic video.
Return one JSON object that matches the contract exactly. Output compact minified JSON only: no markdown, prose, or pretty-printing.

${part === "summary" || part === "main-diagram"
    ? rendererContract
    : part === "title"
      ? 'OUTPUT CONTRACT: {"title":string,"subtitle"?:string}'
      : 'OUTPUT CONTRACT: {"closingLine":string}'}

PART: ${part}
SEGMENT DURATION: ${duration}s
${visualContext ? `VISUAL CONTEXT: ${visualContext}` : ""}

${roleGuides[part]}

${ownershipGuide}
Use concise text that fits a 1920x1080 canvas.
Every event id must be unique, and every animation must belong to an event in this response.
${budget.maxEvents ? `Use at most ${budget.maxEvents} events.` : ""}
  `.trim();
}

export function buildBookendsSystemPrompt(duration: number): string {
  return `
You write the opening and closing copy for one animated infographic video.
Return one JSON object that matches the contract exactly. Output compact minified JSON only: no markdown, prose, or pretty-printing.

PART: bookends
TOTAL VIDEO DURATION: ${duration}s

Write a concise title, an optional explanatory subtitle, and one concise closing line that resolves the explanation. Do not write summary content, diagram events, scenes, coordinates, or styling.

OUTPUT CONTRACT: {"title":string,"subtitle"?:string,"closingLine":string}
  `.trim();
}

export function buildVideoPartRepairPrompt(
  originalPrompt: string,
  validationMessage: string,
  previousOutput?: string,
): string {
  const invalidOutput = previousOutput
    ? `\nPREVIOUS INVALID, TRUNCATED, OR MALFORMED OUTPUT:\n${previousOutput.slice(0, 60000)}\n`
    : "";
  return `
ORIGINAL REQUEST:
${originalPrompt}
${invalidOutput}

The previous JSON did not match the required part schema:
${validationMessage}

Correct the previous output in place. Preserve valid content and event IDs where possible, changing only what the validation finding requires. Return one corrected JSON object only. Keep exactly the keys allowed by the schema.
  `.trim();
}
