import type { DiagramLayout } from "@/lib/agent/schemas/brief";

export type SceneContentBudget = {
  maxNodes: number;
  maxBlocks: number;
  maxAnimatedEdges: number;
  maxEdges: number;
};

const MAX_ANIMATED_EDGES = 4;

export const SCENE_CONTENT_BUDGETS: Record<DiagramLayout, SceneContentBudget> = {
  "pipeline": {
    maxNodes: 5,
    maxBlocks: 5,
    maxAnimatedEdges: MAX_ANIMATED_EDGES,
    maxEdges: 6,
  },
  "client-server": {
    maxNodes: 6,
    maxBlocks: 4,
    maxAnimatedEdges: MAX_ANIMATED_EDGES,
    maxEdges: 7,
  },
  "hub-spoke": {
    maxNodes: 5,
    maxBlocks: 4,
    maxAnimatedEdges: MAX_ANIMATED_EDGES,
    maxEdges: 6,
  },
  "stack": {
    maxNodes: 5,
    maxBlocks: 5,
    maxAnimatedEdges: MAX_ANIMATED_EDGES,
    maxEdges: 6,
  },
};

