/**
 * GullyCric Premium SkeletonLoader v2.0
 * Dark-themed shimmer placeholders for all load states
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../theme';

// ── CSS shimmer for web ─────────────────────────────────────────────────────
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const id = 'gc-skeleton-shimmer';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes gcShimmer {
        0%   { background-position: -600px 0; }
        100% { background-position:  600px 0; }
      }
      .gc-skeleton {
        background: linear-gradient(
          90deg,
          #1C2539 25%,
          #263347 50%,
          #1C2539 75%
        );
        background-size: 1200px 100%;
        animation: gcShimmer 1.6s ease-in-out infinite;
        border-radius: 8px;
      }
    `;
    document.head.appendChild(style);
  }
}

// ── Base shimmer block ──────────────────────────────────────────────────────
interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%', height = 18, borderRadius = 8, style,
}) => {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
    return () => anim.stopAnimation();
  }, []);

  if (Platform.OS === 'web') {
    return (
      <div
        className="gc-skeleton"
        style={{
          width: typeof width === 'number' ? width : width,
          height,
          borderRadius,
          ...(style || {}),
        }}
      />
    );
  }

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: COLORS.cardElevated, opacity: anim },
        style,
      ]}
    />
  );
};

// ── Match card skeleton ─────────────────────────────────────────────────────
const SkeletonCard: React.FC = () => (
  <View style={s.card}>
    {/* Header */}
    <View style={s.row}>
      <SkeletonLoader width={64} height={20} borderRadius={10} />
      <SkeletonLoader width={48} height={12} borderRadius={6} />
    </View>
    {/* Teams row */}
    <View style={[s.row, { marginTop: SPACING.lg, alignItems: 'center' }]}>
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <SkeletonLoader width={80} height={12} borderRadius={6} />
        <SkeletonLoader width={48} height={22} borderRadius={6} />
      </View>
      <SkeletonLoader width={24} height={16} borderRadius={4} style={{ marginHorizontal: SPACING.md }} />
      <View style={{ flex: 1, alignItems: 'flex-end', gap: 8 }}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <SkeletonLoader width={80} height={12} borderRadius={6} />
        <SkeletonLoader width={48} height={22} borderRadius={6} />
      </View>
    </View>
    {/* Footer */}
    <View style={[s.row, { marginTop: SPACING.lg, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.borderLight }]}>
      <SkeletonLoader width={90} height={10} borderRadius={5} />
      <SkeletonLoader width={70} height={10} borderRadius={5} />
    </View>
  </View>
);

// ── Scorecard row skeleton ──────────────────────────────────────────────────
export const SkeletonScorecardRow: React.FC = () => (
  <View style={[s.row, { paddingVertical: 10 }]}>
    <View style={{ flex: 3, gap: 4 }}>
      <SkeletonLoader width="80%" height={13} borderRadius={6} />
      <SkeletonLoader width="50%" height={10} borderRadius={5} />
    </View>
    <SkeletonLoader width={28} height={13} borderRadius={6} />
    <SkeletonLoader width={28} height={13} borderRadius={6} style={{ marginLeft: 8 }} />
    <SkeletonLoader width={28} height={13} borderRadius={6} style={{ marginLeft: 8 }} />
  </View>
);

// ── Profile skeleton ────────────────────────────────────────────────────────
export const SkeletonProfile: React.FC = () => (
  <View style={{ alignItems: 'center', padding: SPACING.xl, gap: SPACING.md }}>
    <SkeletonLoader width={96} height={96} borderRadius={48} />
    <SkeletonLoader width={140} height={20} borderRadius={8} />
    <SkeletonLoader width={100} height={14} borderRadius={6} />
    <View style={[s.row, { gap: 12, marginTop: SPACING.sm }]}>
      {[1,2,3,4].map(i => (
        <View key={i} style={{ alignItems: 'center', gap: 6 }}>
          <SkeletonLoader width={52} height={36} borderRadius={10} />
          <SkeletonLoader width={36} height={9} borderRadius={5} />
        </View>
      ))}
    </View>
  </View>
);

// ── Match list ──────────────────────────────────────────────────────────────
const SkeletonMatchList: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <View style={{ gap: 0 }}>
    {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
  </View>
);

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
});

export { SkeletonLoader, SkeletonCard, SkeletonMatchList };
export default SkeletonLoader;