// =============================================================================
// Typed facade over the lossless Pekarstas raw-chart export.
//
// Strategy remains data-driven: colors, exact visual heights, action mappings,
// source notes and chart ids all live in pekarstas-lossless.json. This module
// defines the runtime contract only; it never branches on individual hands.
// =============================================================================
import raw from './pekarstas-lossless.json';
import type { RawAction } from './rawTypes';

export interface WeightedColors {
  [color: string]: number;
}

export interface LosslessTarget {
  key: string;
  colorActions: Record<string, RawAction>;
  normalizeMapped?: boolean;
}

export interface LosslessChart {
  sourceChartId: number;
  sourceName: string;
  note: string;
  buttons: Record<string, string>;
  sizing: { openBB?: number; raiseMultiplier?: number };
  containsConditionalAdvice: boolean;
  targets: LosslessTarget[];
  cells: Record<string, WeightedColors>;
}

export interface PekarstasLosslessData {
  PLACEHOLDER: false;
  sourceRevision: string;
  frequencyBasis: 'source_visual_height';
  warning: string;
  charts: LosslessChart[];
}

// JSON imports infer literal values as broad strings. The checked public-range
// tests below validate every color/action/frequency before release.
export const pekarstasLossless = raw as unknown as PekarstasLosslessData;
