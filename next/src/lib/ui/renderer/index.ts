export { renderProjectFrame } from "./renderProjectFrame";
export { visibleEvents } from "./visibleEvents";
export { DEFAULT_WIDTH, DEFAULT_HEIGHT, DEFAULT_DURATION } from "./constants";
export {
  isKeyframed,
  resolveAnimatedBounds,
  isLowOpacityFill,
  getShapeCenter,
  getEventCenter,
  getStaticEventBounds,
  getEventBounds,
  boundsOverlap,
  timeOverlap,
} from "./geometry";
export type { Bounds } from "./geometry";
export {
  validateProject,
  toValidationResults,
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

