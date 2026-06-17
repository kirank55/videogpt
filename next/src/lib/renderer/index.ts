export { renderProjectFrame } from "./renderProjectFrame";
export { DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_DURATION } from "./constants";
export {
  validateProject,
  runQualityGate,
  calculateScore,
  checkBackgroundPresence,
  checkTimingBoundaries,
  checkLayerOrdering,
  checkTextReadability,
  checkContentDensity,
  checkOffCanvas,
  checkLayerCollisions,
} from "./validateProject";
export type { ValidationResult, QualityIssue, QualityResult } from "./validateProject";

export type {
  AnimatedValue,
  BackgroundEvent,
  BaseTimelineEvent,
  EasingName,
  GradientFill,
  IconName,
  Keyframe,
  ParticleEvent,
  PathAnimation,
  Shadow,
  ShapeEvent,
  ShapeFill,
  TextEvent,
  TimelineEvent,
  VideoProject,
} from "./types";

