import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Match } from '../types';

interface MatchCardProps {
  match: Match;
  onPress: () => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onPress }) => {
  // Try to determine the winner if completed
  let resultText = '';
  if (match.status === 'Completed' && match.score1 && match.score2) {
    const s1 = parseInt(match.score1.split('/')[0]);
    const s2 = parseInt(match.score2.split('/')[0]);
    if (s1 > s2) resultText = `${match.team1} Won`;
    else if (s2 > s1) resultText = `${match.team2} Won`;
    else resultText = 'Match Tied';
  }

  const renderTeamRow = (teamName: string, logo: string | undefined, score: string | undefined, isTeam1: boolean) => {
    return (
      <View style={s.teamRow}>
        <View style={[s.teamLogo, { backgroundColor: logo || (isTeam1 ? '#EF4444' : '#3B82F6') }]}>
          <Ionicons name="shield" size={12} color="#FFF" />
        </View>
        <Text style={s.teamName} numberOfLines={1}>{teamName}</Text>
        {(match.status === 'Live' || match.status === 'Completed') && score ? (
          <Text style={s.scoreText}>{score}</Text>
        ) : null}
      </View>
    );
  };

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      {/* Top Bar */}
      <View style={s.topBar}>
        <Text style={s.metaText} numberOfLines={1}>
          {match.type} • {match.location} • ID: {match.matchId}
        </Text>
        <Ionicons name="notifications-outline" size={16} color="#9CA3AF" />
      </View>

      <View style={s.mainRow}>
        {/* Teams & Scores */}
        <View style={s.teamsCol}>
          {renderTeamRow(match.team1, match.team1Logo, match.score1, true)}
          <View style={{ height: 12 }} />
          {renderTeamRow(match.team2, match.team2Logo, match.score2, false)}
        </View>

        {/* Status / Result */}
        <View style={s.statusCol}>
          {match.status === 'Scheduled' && (
            <>
              <Text style={s.statusLabel}>Upcoming</Text>
              <Text style={s.timeText}>{match.time}</Text>
            </>
          )}
          
          {match.status === 'Live' && (
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveText}>LIVE</Text>
            </View>
          )}

          {match.status === 'Completed' && (
            <Text style={s.resultText}>{resultText}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
    marginBottom: 12
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  teamsCol: {
    flex: 2,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  teamLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8
  },
  statusCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F3F4F6',
    paddingLeft: 12
  },
  statusLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827'
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444'
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
    textAlign: 'right'
  }
});

export default MatchCard;
