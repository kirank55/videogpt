import type {
  BriefBlock,
  BriefGraph,
  BriefGraphEdge,
  BriefGraphNode,
  DiagramLayout,
} from "@/lib/agent/schemas/brief";
import { clamp } from "@/lib/agent/brief/briefHelpers";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasBox = {
  width: number;
  height: number;
};

export type LaidOutNode = BriefGraphNode &
  Rect & {
    cx: number;
    cy: number;
  };

export type LaidOutEdge = BriefGraphEdge & {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelX: number;
  labelY: number;
  path: { x: number; y: number }[];
};

export type GraphLayoutResult = {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  blockBoxes: Rect[];
};

const NODE_MIN_W = 170;
const NODE_MAX_W = 280;
const NODE_H = 96;
const OUTER_X = 140;
const BOTTOM_Y = 870;

function nodeWidth(label: string): number {
  return clamp(120 + label.length * 8, NODE_MIN_W, NODE_MAX_W);
}

function makeNode(node: BriefGraphNode, cx: number, cy: number): LaidOutNode {
  const width = nodeWidth(node.label);
  return {
    ...node,
    cx,
    cy,
    x: cx - width / 2,
    y: cy - NODE_H / 2,
    width,
    height: NODE_H,
  };
}

function distribute(count: number, start: number, end: number): number[] {
  if (count <= 1) return [(start + end) / 2];
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, index) => start + step * index);
}

function pipelineNodes(nodes: BriefGraphNode[], canvas: CanvasBox): LaidOutNode[] {
  const xs = distribute(nodes.length, OUTER_X + 120, canvas.width - OUTER_X - 120);
  return nodes.map((node, index) => makeNode(node, xs[index], 420));
}

function clientServerNodes(nodes: BriefGraphNode[], canvas: CanvasBox): LaidOutNode[] {
  const split = Math.max(1, Math.ceil(nodes.length / 2));
  const left = nodes.slice(0, split);
  const right = nodes.slice(split);
  const leftYs = distribute(left.length, 335, 675);
  const rightYs = distribute(Math.max(1, right.length), 335, 675);

  return [
    ...left.map((node, index) => makeNode(node, OUTER_X + 270, leftYs[index])),
    ...right.map((node, index) => makeNode(node, canvas.width - OUTER_X - 270, rightYs[index])),
  ];
}

function hubSpokeNodes(nodes: BriefGraphNode[], canvas: CanvasBox): LaidOutNode[] {
  const [hub, ...spokes] = nodes;
  const cx = canvas.width / 2;
  const cy = 485;
  const radiusX = 520;
  const radiusY = 235;

  return [
    makeNode(hub, cx, cy),
    ...spokes.map((node, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(spokes.length, 1);
      return makeNode(node, cx + Math.cos(angle) * radiusX, cy + Math.sin(angle) * radiusY);
    }),
  ];
}

function stackNodes(nodes: BriefGraphNode[], canvas: CanvasBox): LaidOutNode[] {
  const ys = distribute(nodes.length, 315, 750);
  return nodes.map((node, index) => makeNode(node, canvas.width * 0.68, ys[index]));
}

function layoutNodes(
  graph: BriefGraph,
  strategy: DiagramLayout,
  canvas: CanvasBox,
): LaidOutNode[] {
  switch (strategy) {
    case "pipeline":
      return pipelineNodes(graph.nodes, canvas);
    case "client-server":
      return clientServerNodes(graph.nodes, canvas);
    case "hub-spoke":
      return hubSpokeNodes(graph.nodes, canvas);
    case "stack":
    default:
      return stackNodes(graph.nodes, canvas);
  }
}

function blockBoxesFor(
  blocks: BriefBlock[],
  strategy: DiagramLayout,
  canvas: CanvasBox,
): Rect[] {
  if (strategy === "stack") {
    const ys = distribute(blocks.length, 330, 760);
    return blocks.map((_, index) => ({
      x: OUTER_X,
      y: ys[index] - 58,
      width: 610,
      height: 116,
    }));
  }

  if (strategy === "client-server") {
    const columns = Math.min(2, Math.max(1, blocks.length));
    const perColumn = Math.ceil(blocks.length / columns);
    return blocks.map((_, index) => {
      const column = index < perColumn ? 0 : 1;
      const slot = column === 0 ? index : index - perColumn;
      return {
        x: column === 0 ? OUTER_X + 80 : canvas.width / 2 + 70,
        y: 735 + slot * 95,
        width: 620,
        height: 78,
      };
    });
  }

  const usableW = canvas.width - OUTER_X * 2;
  const gap = 28;
  const width = (usableW - gap * (blocks.length - 1)) / blocks.length;
  return blocks.map((_, index) => ({
    x: OUTER_X + index * (width + gap),
    y: strategy === "hub-spoke" ? 800 : 585,
    width,
    height: strategy === "hub-spoke" ? 110 : 132,
  }));
}

function clipLineToRect(
  from: { x: number; y: number },
  to: { x: number; y: number },
  rect: Rect,
): { x: number; y: number } {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };

  const tx = Math.abs(dx) > 0.001 ? halfW / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const ty = Math.abs(dy) > 0.001 ? halfH / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

function layoutEdges(graph: BriefGraph, nodes: LaidOutNode[]): LaidOutEdge[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges = graph.edges.length > 0
    ? graph.edges
    : nodes.slice(1).map((node, index) => ({ from: nodes[index].id, to: node.id }));

  return edges.flatMap((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) return [];

    const fromCenter = { x: from.cx, y: from.cy };
    const toCenter = { x: to.cx, y: to.cy };
    const start = clipLineToRect(fromCenter, toCenter, from);
    const end = clipLineToRect(toCenter, fromCenter, to);

    return [{
      ...edge,
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      labelX: (start.x + end.x) / 2,
      labelY: (start.y + end.y) / 2,
      path: [fromCenter, toCenter],
    }];
  });
}

export function layoutGraph(
  graph: BriefGraph,
  blocks: BriefBlock[],
  strategy: DiagramLayout,
  canvas: CanvasBox,
): GraphLayoutResult {
  const safeCanvas = {
    width: Math.max(canvas.width, 800),
    height: Math.max(canvas.height, BOTTOM_Y),
  };
  const nodes = layoutNodes(graph, strategy, safeCanvas);

  return {
    nodes,
    edges: layoutEdges(graph, nodes),
    blockBoxes: blockBoxesFor(blocks, strategy, safeCanvas),
  };
}
