import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getMatchById, updateMatch } from '../services/matchService';
import { Match } from '../services/matchService';

const MatchDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { matchId } = route.params as { matchId: string };

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchDetails();
  }, []);

  const fetchMatchDetails = async () => {
    try {
      const matchData = await getMatchById(matchId);
      setMatch(matchData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching match:', error);
      Alert.alert('Error', 'Failed to load match details');
      setLoading(false);
    }
  };

  const handleStartMatch = async () => {
    if (!match) return;
    try {
      await updateMatch(matchId, { status: 'Live' });
      setMatch({ ...match, status: 'Live' });
      Alert.alert('Success', 'Match started!');
    } catch (error) {
      Alert.alert('Error', 'Failed to start match');
    }
  };

  const handleEndMatch = async () => {
    if (!match) return;
    try {
      await updateMatch(matchId, { status: 'Completed' });
      setMatch({ ...match, status: 'Completed' });
      Alert.alert('Success', 'Match completed!');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete match');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.container}>
        <Text>Match not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.matchId}>ID: {match.matchId}</Text>
        <Text style={styles.title}>{match.name}</Text>
        <Text style={styles.subtitle}>{match.location}</Text>

        <View style={styles.statusBadge}>
          <Text
            style={[
              styles.statusText,
              {
                color:
                  match.status === 'Live'
                    ? '#FF5722'
                    : match.status === 'Completed'
                    ? '#4CAF50'
                    : '#2196F3',
              },
            ]}
          >
            {match.status}
          </Text>
        </View>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Match Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{match.type}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Overs:</Text>
          <Text style={styles.value}>{match.overs}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>{match.date}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Time:</Text>
          <Text style={styles.value}>{match.time}</Text>
        </View>
      </View>

      <View style={styles.teamsCard}>
        <Text style={styles.sectionTitle}>Teams</Text>
        <View style={styles.teamRow}>
          <View style={styles.team}>
            <Text style={styles.teamName}>{match.team1}</Text>
            <Text style={styles.score}>{match.score1 || 'N/A'}</Text>
          </View>
          <Text style={styles.vs}>vs</Text>
          <View style={styles.team}>
            <Text style={styles.teamName}>{match.team2}</Text>
            <Text style={styles.score}>{match.score2 || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {match.rules && (
        <View style={styles.rulesCard}>
          <Text style={styles.sectionTitle}>Match Rules</Text>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleLabel}>Power Play:</Text>
            <Text style={styles.ruleValue}>{match.rules.powerPlay ? '✓' : '✗'}</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleLabel}>Bouncer Limit:</Text>
            <Text style={styles.ruleValue}>{match.rules.bouncerLimit ? '✓' : '✗'}</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleLabel}>Wide Limit:</Text>
            <Text style={styles.ruleValue}>{match.rules.wideLimit ? '✓' : '✗'}</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleLabel}>Ball by Ball Tracking:</Text>
            <Text style={styles.ruleValue}>{match.rules.ballByBall ? '✓' : '✗'}</Text>
          </View>
        </View>
      )}

      <View style={styles.buttonGroup}>
        {match.status === 'Scheduled' && (
          <TouchableOpacity style={styles.startButton} onPress={handleStartMatch}>
            <Text style={styles.buttonText}>Start Match</Text>
          </TouchableOpacity>
        )}
        {match.status === 'Live' && (
          <>
            <TouchableOpacity style={styles.scorecardButton}>
              <Text style={styles.buttonText}>View Scorecard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.endButton} onPress={handleEndMatch}>
              <Text style={styles.buttonText}>End Match</Text>
            </TouchableOpacity>
          </>
        )}
        {match.status === 'Completed' && (
          <TouchableOpacity style={styles.scorecardButton}>
            <Text style={styles.buttonText}>View Final Scorecard</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  backButton: {
    color: '#2196F3',
    fontSize: 16,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  matchId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  teamsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  rulesCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  team: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  teamName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  vs: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ruleLabel: {
    fontSize: 14,
    color: '#666',
  },
  ruleValue: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 30,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  endButton: {
    backgroundColor: '#f44336',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  scorecardButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MatchDetailScreen;
