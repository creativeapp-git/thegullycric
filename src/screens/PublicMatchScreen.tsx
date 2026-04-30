import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme';

export default function PublicMatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId } = route.params;

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [innings, setInnings] = useState<1 | 2>(1);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const { data } = await supabase.from('matches').select('*').eq('matchId', matchId).single();
        setMatch(data);
        if (data) {
          const { data: st } = await supabase.rpc('get_innings_stats', { p_match_id: data.id, p_innings: innings });
          setStats(st);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchMatch();
  }, [matchId, innings]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>;
  if (!match) return <View style={styles.center}><Text>Match Not Found</Text></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.iconBox}><Ionicons name="trophy" size={16} color={COLORS.white} /></View>
          <Text style={styles.headerTitle}>Gully<Text style={{fontWeight: '900', color: COLORS.primary}}>Cric</Text></Text>
        </View>
        <TouchableOpacity style={styles.loginBtn} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.loginBtnText}>Login</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.scoreBoard}>
          <Text style={styles.liveTag}>{match.status}</Text>
          <View style={styles.scoreRow}>
            <View style={styles.team}>
              <Text style={styles.emoji}>{match.team1Logo || '🏏'}</Text>
              <Text style={styles.teamName}>{match.team1}</Text>
              <Text style={styles.teamScore}>{match.score1 || '0/0 (0.0)'}</Text>
            </View>
            <Text style={styles.vs}>VS</Text>
            <View style={styles.team}>
              <Text style={styles.emoji}>{match.team2Logo || '🏏'}</Text>
              <Text style={styles.teamName}>{match.team2}</Text>
              <Text style={styles.teamScore}>{match.score2 || '0/0 (0.0)'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, innings === 1 && styles.activeTab]} onPress={() => setInnings(1)}>
            <Text style={[styles.tabText, innings === 1 && styles.activeTabText]}>Innings 1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, innings === 2 && styles.activeTab]} onPress={() => setInnings(2)}>
            <Text style={[styles.tabText, innings === 2 && styles.activeTabText]}>Innings 2</Text>
          </TouchableOpacity>
        </View>

        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>Top Scorers</Text>
            {stats.batting.map((b: any, i: number) => (
              <View key={i} style={styles.playerRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.pName}>{b.name}</Text>
                  <Text style={styles.pSub}>{b.is_out ? b.dismissal : 'not out'}</Text>
                </View>
                <Text style={styles.pRuns}>{b.runs}</Text>
                <Text style={styles.pBalls}>({b.balls})</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.cta}>
        <Text style={styles.ctaText}>Want to host matches like this?</Text>
        <TouchableOpacity style={styles.joinBtn} onPress={() => navigation.navigate('Auth')}>
          <Text style={styles.joinBtnText}>Join GullyCric Free</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  loginBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.primaryLight },
  loginBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  scroll: { padding: SPACING.md },
  scoreBoard: { backgroundColor: COLORS.primary, padding: 32, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', ...SHADOWS.medium, marginBottom: 20 },
  liveTag: { backgroundColor: COLORS.white, color: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: '900', marginBottom: 20, textTransform: 'uppercase' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  team: { flex: 1, alignItems: 'center' },
  emoji: { fontSize: 32, marginBottom: 12 },
  teamName: { color: COLORS.white, fontWeight: '700', marginBottom: 4, fontSize: 15 },
  teamScore: { color: COLORS.white, fontWeight: '900', fontSize: 20 },
  vs: { color: COLORS.primaryLight, fontWeight: '900', marginHorizontal: 12, opacity: 0.6 },
  tabRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontWeight: '700' },
  activeTabText: { color: COLORS.white },
  statsCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, padding: 20, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.soft },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pName: { fontWeight: '700', color: COLORS.text },
  pSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  pRuns: { fontSize: 16, fontWeight: '900', color: COLORS.text, marginRight: 4 },
  pBalls: { fontSize: 13, color: COLORS.textSecondary },
  cta: { padding: 24, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center' },
  ctaText: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12, fontWeight: '500' },
  joinBtn: { backgroundColor: COLORS.text, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16, width: '100%', alignItems: 'center' },
  joinBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
});
