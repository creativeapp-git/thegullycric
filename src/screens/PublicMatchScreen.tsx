import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Share as RNShare } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { AppNavigationProp } from '../navigation/navigation.types';

export default function PublicMatchScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<any>();
  const { matchId } = route.params;

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [innings, setInnings] = useState<1 | 2>(1);

  useEffect(() => {
    fetchPublicMatch();
  }, [matchId]);

  useEffect(() => {
    if (match) fetchStats();
  }, [innings, match]);

  const fetchPublicMatch = async () => {
    try {
      setLoading(true);
      // Fetch by friendly matchId string
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('matchId', matchId)
        .single();
      
      if (error) throw error;
      setMatch(data);
    } catch (e) {
      console.error('Public match fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!match) return;
    try {
      const { data: res } = await supabase.rpc('get_innings_stats', {
        p_match_id: match.id,
        p_innings: innings
      });
      setStats(res);
    } catch (e) {
      console.error('Public stats error:', e);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#10B981" /></View>;
  if (!match) return <View style={styles.center}><Text>Match not found</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Auth')}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{match.team1} vs {match.team2}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.scoreCard}>
          <Text style={styles.statusBadge}>{match.status}</Text>
          <View style={styles.scoreRow}>
            <View style={styles.teamInfo}>
              <Text style={styles.teamLogo}>{match.team1Logo || '🏏'}</Text>
              <Text style={styles.teamName}>{match.team1}</Text>
              <Text style={styles.teamScore}>{match.score1 || '0/0 (0.0)'}</Text>
            </View>
            <Text style={styles.vs}>VS</Text>
            <View style={styles.teamInfo}>
              <Text style={styles.teamLogo}>{match.team2Logo || '🏏'}</Text>
              <Text style={styles.teamName}>{match.team2}</Text>
              <Text style={styles.teamScore}>{match.score2 || '0/0 (0.0)'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.inningsToggle}>
          <TouchableOpacity style={[styles.tab, innings === 1 && styles.activeTab]} onPress={() => setInnings(1)}>
            <Text style={[styles.tabText, innings === 1 && styles.activeTabText]}>1st Innings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, innings === 2 && styles.activeTab]} onPress={() => setInnings(2)}>
            <Text style={[styles.tabText, innings === 2 && styles.activeTabText]}>2nd Innings</Text>
          </TouchableOpacity>
        </View>

        {stats ? (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Batting Performance</Text>
            {stats.batting.map((b: any, i: number) => (
              <View key={i} style={styles.statRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.playerName}>{b.name}</Text>
                  <Text style={styles.playerSub}>{b.is_out ? b.dismissal : 'not out'}</Text>
                </View>
                <Text style={styles.playerRuns}>{b.runs}</Text>
                <Text style={styles.playerBalls}>({b.balls})</Text>
              </View>
            ))}
          </View>
        ) : (
          <ActivityIndicator color="#10B981" style={{marginTop: 40}} />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by GullyCric</Text>
        <TouchableOpacity style={styles.joinBtn} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.joinBtnText}>Join & Track Matches</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  loginText: { color: '#10B981', fontWeight: '700' },
  scroll: { padding: 16 },
  scoreCard: { backgroundColor: '#111827', padding: 24, borderRadius: 20, marginBottom: 20 },
  statusBadge: { backgroundColor: '#10B981', color: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 10, fontWeight: '800', marginBottom: 16 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamInfo: { alignItems: 'center', flex: 1 },
  teamLogo: { fontSize: 32, marginBottom: 8 },
  teamName: { color: '#FFF', fontWeight: '700', marginBottom: 4 },
  teamScore: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  vs: { color: '#4B5563', fontWeight: '800', marginHorizontal: 10 },
  inningsToggle: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#10B981' },
  tabText: { fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#FFF' },
  statsSection: { backgroundColor: '#FFF', padding: 16, borderRadius: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  playerName: { fontWeight: '700', color: '#111827' },
  playerSub: { fontSize: 11, color: '#9CA3AF' },
  playerRuns: { fontSize: 16, fontWeight: '800', color: '#111827', marginRight: 4 },
  playerBalls: { fontSize: 13, color: '#6B7280' },
  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', alignItems: 'center' },
  footerText: { color: '#9CA3AF', fontSize: 12, marginBottom: 12 },
  joinBtn: { backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  joinBtnText: { color: '#FFF', fontWeight: '700' }
});
