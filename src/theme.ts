// =============================================================================
// theme.ts — centralized design tokens. No inline magic colors anywhere else.
// Dark mode is the default (and only) theme for MVP.
// =============================================================================
import type { Verdict } from './types';

export const colors = {
  bg: '#0E1116',
  surface: '#1A1F27',
  primary: '#27E0A1', // mint
  primaryDim: '#1B9E74', // mint-dim (for "correct")
  gold: '#F5C451',
  goldBorder: 'rgba(245,196,81,0.42)',
  danger: '#FF6B6B',
  text: '#F2F4F7',
  muted: '#8A93A2',
  // Subtle borders/dividers derived from surface.
  border: '#2A313C',
  overlay: 'rgba(0,0,0,0.62)',
  felt: '#0F1A18',
  feltBorder: '#243C36',
  feltInner: '#1C302B',
  feltChip: '#16201D',
  primarySoft: 'rgba(39,224,161,0.08)',
  primaryBorder: 'rgba(39,224,161,0.40)',
  dangerSoft: 'rgba(255,107,107,0.08)',
  dangerBorder: 'rgba(255,107,107,0.35)',
  dangerTrack: 'rgba(255,107,107,0.15)',
  cardFace: '#F7F9FC',
  cardInk: '#111418',
} as const;

export const radius = {
  card: 20,
  pill: 999,
  button: 14,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '800',
} as const;

export const fontSize = {
  caption: 12,
  body: 15,
  title: 18,
  heading: 24,
  display: 40, // big bold numerals for scores/EV
} as const;

// Verdict -> color, per spec: best=mint, correct=mint-dim, inaccuracy=gold, blunder=red.
export const verdictColor: Record<Verdict, string> = {
  best: colors.primary,
  correct: colors.primaryDim,
  inaccuracy: colors.gold,
  blunder: colors.danger,
};

// Primary action -> color, for the 13x13 heatmap and action buttons.
export const actionColor: Record<string, string> = {
  raise: colors.primary,
  '3bet': colors.primary,
  '4bet': colors.primary,
  '5bet': colors.primary,
  call: colors.gold,
  fold: colors.muted,
};

// Soft outer glow used on hero cards/controls (maps to boxShadow on web).
export function glow(color: string = colors.primary, radius = 14, opacity = 0.22) {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  } as const;
}

// Deterministic avatar tint per seat (felt-table players).
export const avatarPalette = [
  '#7C9CF5',
  '#F5A65B',
  '#C77DFF',
  '#5BD1F5',
  '#F57DA8',
  '#9BE36D',
] as const;

export const theme = {
  colors,
  radius,
  spacing,
  fontWeight,
  fontSize,
  verdictColor,
  actionColor,
  glow,
  avatarPalette,
};
export type Theme = typeof theme;
