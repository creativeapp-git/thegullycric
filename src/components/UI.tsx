/**
 * GullyCric Premium UI Component Library v2.0
 * Reusable components: Button, Card, GlassCard, LiveBadge,
 *   SectionHeader, StatChip, EmptyState, ScoreHero, TeamAvatar
 */
import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  ViewStyle, TextStyle, View, Animated, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;  // Ionicon name
}

// ── Button ────────────────────────────────────────────────────────────────────

export const Button: React.FC<ButtonProps> = ({
  title, onPress, variant = 'primary', size = 'lg',
  loading, disabled, style, textStyle, icon
}) => {
  const sizeStyle  = size === 'sm' ? s.btnSm : size === 'md' ? s.btnMd : s.btnLg;
  const varStyle   =
    variant === 'primary'   ? s.btnPrimary  :
    variant === 'secondary' ? s.btnSecondary :
    variant === 'danger'    ? s.btnDanger    :
    variant === 'outline'   ? s.btnOutline   :
                              s.btnGlass;
  const textColor  =
    variant === 'outline' ? COLORS.primary :
    variant === 'glass'   ? COLORS.white   :
                            COLORS.black;  // on electric green

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={style} activeOpacity={0.85}>
        <LinearGradient
          colors={COLORS.gradientGreen as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[s.btn, sizeStyle, s.btnPrimary, disabled && s.btnDisabled]}
        >
          {loading ? <ActivityIndicator color={COLORS.black} /> : (
            <View style={s.btnContent}>
              {icon && <Ionicons name={icon as any} size={size === 'sm' ? 14 : 18} color={COLORS.black} style={{ marginRight: 6 }} />}
              <Text style={[s.text, { color: COLORS.black }, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[s.btn, sizeStyle, varStyle, disabled && s.btnDisabled, style]}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color={variant === 'outline' ? COLORS.primary : COLORS.white} /> : (
        <View style={s.btnContent}>
          {icon && <Ionicons name={icon as any} size={size === 'sm' ? 14 : 18} color={textColor} style={{ marginRight: 6 }} />}
          <Text style={[s.text, { color: textColor }, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Card ──────────────────────────────────────────────────────────────────────

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle; elevated?: boolean }> = ({
  children, style, elevated
}) => (
  <View style={[s.card, elevated && s.cardElevated, style]}>{children}</View>
);

// ── GlassCard ─────────────────────────────────────────────────────────────────

export const GlassCard: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[s.glassCard, style]}>{children}</View>
);

// ── LiveBadge ─────────────────────────────────────────────────────────────────

export const LiveBadge: React.FC<{ style?: ViewStyle; size?: 'sm' | 'md' }> = ({ style, size = 'md' }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[s.liveBadge, style]}>
      <Animated.View style={[s.liveDot, { opacity: pulseAnim }]} />
      <Text style={[s.liveText, size === 'sm' && { fontSize: 9 }]}>LIVE</Text>
    </View>
  );
};

// ── SectionHeader ─────────────────────────────────────────────────────────────

export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}> = ({ title, subtitle, rightAction, style }) => (
  <View style={[s.sectionHeader, style]}>
    <View style={{ flex: 1 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      {subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {rightAction && <View>{rightAction}</View>}
  </View>
);

// ── StatChip ──────────────────────────────────────────────────────────────────

export const StatChip: React.FC<{ label: string; value: string | number; accent?: string }> = ({
  label, value, accent = COLORS.primary
}) => (
  <View style={s.statChip}>
    <Text style={[s.statChipValue, { color: accent }]}>{value}</Text>
    <Text style={s.statChipLabel}>{label}</Text>
  </View>
);

// ── TeamAvatar ────────────────────────────────────────────────────────────────

export const TeamAvatar: React.FC<{
  name: string;
  color?: string;
  size?: number;
  style?: ViewStyle;
}> = ({ name, color = COLORS.primary, size = 44, style }) => {
  const initials = name?.slice(0, 2).toUpperCase() || 'TM';
  return (
    <View style={[s.teamAvatar, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={[s.teamAvatarText, { fontSize: size * 0.32, color }]}>{initials}</Text>
    </View>
  );
};

// ── EmptyState ────────────────────────────────────────────────────────────────

export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ icon = 'baseball-outline', title, subtitle, action }) => (
  <View style={s.emptyState}>
    <View style={s.emptyIconRing}>
      <Ionicons name={icon as any} size={40} color={COLORS.primary} />
    </View>
    <Text style={s.emptyTitle}>{title}</Text>
    {subtitle && <Text style={s.emptySubtitle}>{subtitle}</Text>}
    {action && <View style={{ marginTop: SPACING.xl }}>{action}</View>}
  </View>
);

// ── ScoreHero (live match banner) ─────────────────────────────────────────────

export const ScoreHero: React.FC<{
  team1: string;
  team2: string;
  score1?: string;
  score2?: string;
  isLive?: boolean;
  overs?: string;
  onPress?: () => void;
  style?: ViewStyle;
}> = ({ team1, team2, score1, score2, isLive, overs, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[s.heroCard, style]}>
    <LinearGradient
      colors={['#0F1E35', '#0A2540', '#061A30'] as any}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={s.heroGradient}
    >
      {/* Decorative glow */}
      <View style={s.heroGlow} />

      <View style={s.heroHeader}>
        {isLive ? <LiveBadge size="sm" /> : (
          <View style={s.heroBadge}>
            <Text style={s.heroBadgeText}>UPCOMING</Text>
          </View>
        )}
        {overs && <Text style={s.heroOvers}>{overs} OV</Text>}
      </View>

      <View style={s.heroTeamsRow}>
        <View style={s.heroTeamSide}>
          <TeamAvatar name={team1} color={COLORS.primary} size={48} />
          <Text style={s.heroTeamName} numberOfLines={1}>{team1}</Text>
          {score1 !== undefined && <Text style={s.heroScore}>{score1}</Text>}
        </View>

        <View style={s.heroVs}>
          <Text style={s.heroVsText}>VS</Text>
        </View>

        <View style={[s.heroTeamSide, { alignItems: 'flex-end' }]}>
          <TeamAvatar name={team2} color={COLORS.secondary} size={48} />
          <Text style={s.heroTeamName} numberOfLines={1}>{team2}</Text>
          {score2 !== undefined && <Text style={s.heroScore}>{score2}</Text>}
        </View>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Button
  btn: {
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSm:  { height: 36, paddingHorizontal: SPACING.md },
  btnMd:  { height: 48, paddingHorizontal: SPACING.lg },
  btnLg:  { height: 56, paddingHorizontal: SPACING.xl },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
  btnPrimary:   { ...SHADOWS.glowPrimary },
  btnSecondary: { backgroundColor: COLORS.cardElevated, borderWidth: 1, borderColor: COLORS.border },
  btnDanger:    { backgroundColor: COLORS.danger },
  btnOutline:   { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.primary },
  btnGlass:     { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: COLORS.borderGlass },
  btnDisabled:  { opacity: 0.45 },
  text: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.white,
    letterSpacing: 0.3,
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  cardElevated: {
    backgroundColor: COLORS.cardElevated,
    borderColor: COLORS.borderLight,
    ...SHADOWS.large,
  },

  // GlassCard
  glassCard: {
    backgroundColor: COLORS.cardGlass,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderGlass,
    ...SHADOWS.large,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
  },

  // LiveBadge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginRight: 5,
  },
  liveText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.primary,
    letterSpacing: 0.8,
  },

  // SectionHeader
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // StatChip
  statChip: {
    backgroundColor: COLORS.cardElevated,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 64,
  },
  statChipValue: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.black,
  },
  statChipLabel: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // TeamAvatar
  teamAvatar: {
    backgroundColor: COLORS.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  teamAvatarText: {
    fontWeight: TYPOGRAPHY.weights.black,
  },

  // EmptyState
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },

  // ScoreHero
  heroCard: {
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  heroGradient: {
    padding: SPACING.xl,
    minHeight: 180,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 230, 118, 0.06)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  heroBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill,
  },
  heroBadgeText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  heroOvers: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 0.5,
  },
  heroTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTeamSide: {
    flex: 1,
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  heroTeamName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.text,
    maxWidth: 110,
  },
  heroScore: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  heroVs: {
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  heroVsText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.textMuted,
    letterSpacing: 1,
    backgroundColor: COLORS.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
});
