/**
 * GullyCric Premium MatchCard v2.0
 * Deep glass-morphism card, gradient, TeamAvatar, LiveBadge
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '../types';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';
import { LiveBadge, TeamAvatar } from './UI';

interface MatchCardProps {
  match: Match;
  onPress: () => void;
}

const MatchCard = React.memo<MatchCardProps>(({ match, onPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 350, useNativeDriver: true,
    }).start();
  }, []);

  const isLive      = match.match_state === 'live'      || match.status === 'Live';
  const isCompleted = match.match_state === 'completed' || match.status === 'Completed';
  const isUpcoming  = !isLive && !isCompleted;

  const score1Str = match.score1 !== undefined ? `${match.score1}/${match.wickets1 ?? 0}` : '—';
  const score2Str = match.score2 !== undefined ? `${match.score2}/${match.wickets2 ?? 0}` : '—';

  const winner1 = isCompleted && match.winner === match.team1;
  const winner2 = isCompleted && match.winner === match.team2;

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient
          colors={['#1C2539', '#161D2E'] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Glow accent for live matches */}
          {isLive && <View style={styles.liveGlow} />}

          {/* Header row */}
          <View style={styles.header}>
            {isLive      && <LiveBadge size="sm" />}
            {isCompleted && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} />
                <Text style={styles.completedText}>COMPLETED</Text>
              </View>
            )}
            {isUpcoming && (
              <View style={styles.upcomingBadge}>
                <Ionicons name="time-outline" size={11} color={COLORS.textSecondary} />
                <Text style={styles.upcomingText}>UPCOMING</Text>
              </View>
            )}
            <Text style={styles.formatText}>
              {match.type ?? 'Gully'} · {match.overs} OV
            </Text>
          </View>

          {/* Teams + Scores */}
          <View style={styles.teamsRow}>
            {/* Team 1 */}
            <View style={styles.teamBlock}>
              <TeamAvatar
                name={match.team1}
                color={winner1 ? COLORS.primary : COLORS.secondary}
                size={40}
              />
              <View style={styles.teamInfo}>
                <Text style={[styles.teamName, winner1 && styles.winnerText]} numberOfLines={1}>
                  {match.team1}
                </Text>
                <Text style={[styles.scoreText, winner1 && styles.winnerScore]}>
                  {score1Str}
                </Text>
              </View>
            </View>

            {/* VS divider */}
            <View style={styles.vsDivider}>
              <Text style={styles.vsText}>VS</Text>
            </View>

            {/* Team 2 */}
            <View style={[styles.teamBlock, styles.teamBlockRight]}>
              <View style={[styles.teamInfo, { alignItems: 'flex-end' }]}>
                <Text style={[styles.teamName, winner2 && styles.winnerText]} numberOfLines={1}>
                  {match.team2}
                </Text>
                <Text style={[styles.scoreText, winner2 && styles.winnerScore]}>
                  {score2Str}
                </Text>
              </View>
              <TeamAvatar
                name={match.team2}
                color={winner2 ? COLORS.primary : COLORS.textSecondary}
                size={40}
              />
            </View>
          </View>

          {/* Result / Winner banner */}
          {isCompleted && match.winner && (
            <View style={styles.resultBanner}>
              <Ionicons
                name={match.winner === 'tie' ? 'remove-circle-outline' : 'trophy'}
                size={13}
                color={match.winner === 'tie' ? COLORS.warning : COLORS.primary}
              />
              <Text style={[styles.resultText, { color: match.winner === 'tie' ? COLORS.warning : COLORS.primary }]}>
                {match.winner === 'tie' ? 'Match Tied' : `${match.winner} won`}
              </Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            {match.location ? (
              <View style={styles.footerItem}>
                <Ionicons name="location-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.footerText}>{match.location}</Text>
              </View>
            ) : null}
            {match.date ? (
              <View style={styles.footerItem}>
                <Ionicons name="calendar-outline" size={11} color={COLORS.textMuted} />
                <Text style={styles.footerText}>{match.date}</Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prev, next) => prev.match === next.match && prev.onPress === next.onPress);

MatchCard.displayName = 'MatchCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  liveGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 230, 118, 0.07)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,230,118,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.2)',
  },
  completedText: { fontSize: 9, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.primary, letterSpacing: 0.5 },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  upcomingText: { fontSize: 9, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.textSecondary, letterSpacing: 0.5 },
  formatText: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.weights.semibold, letterSpacing: 0.3 },

  // Teams
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  teamBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  teamBlockRight: {
    justifyContent: 'flex-end',
  },
  teamInfo: {
    flex: 1,
    gap: 3,
  },
  teamName: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textSecondary,
  },
  scoreText: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  winnerText: { color: COLORS.primary },
  winnerScore: { color: COLORS.primary },
  vsDivider: {
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  vsText: {
    fontSize: 9,
    fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.textMuted,
    backgroundColor: COLORS.card,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },

  // Result
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,230,118,0.06)',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.15)',
  },
  resultText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 10, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.weights.medium },
});

export default MatchCard;
