import { Platform } from 'react-native';

// ============================================================
// GULLYCRIC PREMIUM DESIGN SYSTEM v2.0
// Inspired by: Cricbuzz + Apple Sports + Premium Fantasy UI
// ============================================================

export const COLORS = {
  // ── Backgrounds ──────────────────────────────────────────
  background:       '#0D1117',   // Rich deep charcoal (not flat black)
  backgroundSecond: '#111827',   // Slightly lighter layer
  card:             '#161D2E',   // Deep navy card
  cardElevated:     '#1C2539',   // Elevated card surface
  cardGlass:        'rgba(28, 37, 57, 0.85)', // Frosted glass

  // ── Primary Accent — Electric Green ──────────────────────
  primary:      '#00E676',   // Neon/electric green
  primaryDark:  '#00B85C',
  primaryLight: '#69F0AE',
  primaryGlow:  'rgba(0, 230, 118, 0.25)',

  // ── Secondary Accent — Soft Cyan ─────────────────────────
  secondary:    '#29B6F6',
  secondaryDark:'#0288D1',

  // ── Semantic ─────────────────────────────────────────────
  success: '#00E676',
  danger:  '#FF5252',
  warning: '#FFB300',
  info:    '#29B6F6',

  // ── Text Hierarchy ───────────────────────────────────────
  text:          '#F1F5F9',   // Near white
  textSecondary: '#94A3B8',   // Slate-400
  textMuted:     '#475569',   // Slate-600

  // ── Borders ──────────────────────────────────────────────
  border:      '#263347',
  borderLight: '#1E2D42',
  borderGlass: 'rgba(255, 255, 255, 0.08)',

  // ── Gradients (use as arrays in LinearGradient) ──────────
  gradientHero:   ['#0D1117', '#0F1E2F', '#0A2540'],  // dark navy
  gradientCard:   ['#1C2539', '#161D2E'],
  gradientGreen:  ['#00B85C', '#00E676'],
  gradientLive:   ['#1a1f2e', '#0d2235'],

  // ── Utilities ────────────────────────────────────────────
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
  overlay:     'rgba(13, 17, 23, 0.85)',
  overlayCard: 'rgba(13, 17, 23, 0.6)',
};

export const TYPOGRAPHY = {
  sizes: {
    xs:      10,
    sm:      12,
    md:      14,
    lg:      16,
    xl:      20,
    xxl:     24,
    xxxl:    30,
    display: 48,
    hero:    64,
  },
  weights: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
    heavy:    '800',
    black:    '900',
  } as const,
  lineHeights: {
    tight:  1.2,
    normal: 1.5,
    loose:  1.8,
  },
};

export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};

export const BORDER_RADIUS = {
  sm:   6,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  pill: 9999,
};

export const SHADOWS = {
  small: Platform.select({
    web:     { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.4)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 3 },
  })!,
  medium: Platform.select({
    web:     { boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.5)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 6 },
  })!,
  large: Platform.select({
    web:     { boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.6)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 32, elevation: 10 },
  })!,
  glowPrimary: Platform.select({
    web:     { boxShadow: '0px 0px 24px rgba(0, 230, 118, 0.35)' },
    default: { shadowColor: '#00E676', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 10 },
  })!,
  glowSecondary: Platform.select({
    web:     { boxShadow: '0px 0px 20px rgba(41, 182, 246, 0.3)' },
    default: { shadowColor: '#29B6F6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  })!,
  soft: Platform.select({
    web:     { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)' },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  })!,
};
