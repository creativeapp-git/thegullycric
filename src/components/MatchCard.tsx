import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '../types';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING } from '../theme';

interface MatchCardProps {
  match: Match;
  onPress: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
  const isLive = match.status === 'Live';
  
  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.badgeContainer}>
          {isLive ? (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : (
            <Text style={styles.statusText}>{match.status}</Text>
          )}
        </View>
        <Text style={styles.formatText}>{match.type} • {match.overs} Ov</Text>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamSection}>
          <Text style={styles.teamLogo}>{match.team1Logo || '🏏'}</Text>
          <Text style={styles.teamName} numberOfLines={1}>{match.team1}</Text>
          <Text style={styles.scoreText}>{match.score1 || '0/0 (0.0)'}</Text>
        </View>

        <View style={styles.vsContainer}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.teamSection}>
          <Text style={styles.teamLogo}>{match.team2Logo || '🏏'}</Text>
          <Text style={styles.teamName} numberOfLines={1}>{match.team2}</Text>
          <Text style={styles.scoreText}>{match.score2 || '0/0 (0.0)'}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.infoItem}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{match.location}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{match.date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.white,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.danger,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.danger,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  formatText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    fontSize: 24,
    marginBottom: 4,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  vsContainer: {
    paddingHorizontal: 12,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.border,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

export default MatchCard;
