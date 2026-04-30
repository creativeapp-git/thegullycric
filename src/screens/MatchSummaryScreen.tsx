import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { AppNavigationProp } from '../navigation/navigation.types';

interface StatsResponse {
  summary: {
    total_runs: number;
    total_wickets: number;
    total_legal_balls: number;
    extras: { wides: number; no_balls: number; byes: number; leg_byes: number; };
    wickets_by_type: Record<string, number>;
  };
  batting: Array<{
    name: string; runs: number; balls: number; fours: number; sixes: number; 
    strike_rate: number; is_out: boolean; dismissal: string;
  }>;
  bowling: Array<{
    name: string; balls: number; runs_conceded: number; wickets: number; economy: number;
  }>;
}

export default function MatchSummaryScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<any>();
  const { matchId } = route.params;

  const [loading, setLoading] = useState(true);
  const [innings, setInnings] = useState<1 | 2>(1);
  const [data, setData] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetchStats();
  }, [innings]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data: res, error } = await supabase.rpc('get_innings_stats', {
        p_match_id: matchId,
        p_innings: innings
      });
      if (error) throw error;
      setData(res);
    } catch (e) {
      console.error('Stats fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderSummaryCard = () => {
    if (!data) return null;
    const { summary } = data;
    const overs = Math.floor(summary.total_legal_balls / 6);
    const balls = summary.total_legal_balls % 6;
    const rr = summary.total_legal_balls > 0 
      ? (summary.total_runs / (summary.total_legal_balls / 6)).toFixed(2) 
      : '0.00';

    return (
      <View style={styles.card}>
        <View style={styles.scoreRow}>
          <Text style={styles.mainScore}>{summary.total_runs}/{summary.total_wickets}</Text>
          <Text style={styles.oversText}>({overs}.{balls} Overs)</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Run Rate</Text>
            <Text style={styles.statValue}>{rr}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Extras</Text>
            <Text style={styles.statValue}>{Object.values(summary.extras).reduce((a, b) => a + b, 0)}</Text>
          </View>
        </View>
        <View style={styles.extrasBreakdown}>
          <Text style={styles.extrasText}>
            W: {summary.extras.wides} | NB: {summary.extras.no_balls} | B: {summary.extras.byes} | LB: {summary.extras.leg_byes}
          </Text>
        </View>
      </View>
    );
  };

  const renderBattingTable = () => {
    if (!data || data.batting.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Batting</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, { flex: 2 }]}>Batter</Text>
          <Text style={styles.cell}>R</Text>
          <Text style={styles.cell}>B</Text>
          <Text style={styles.cell}>4s</Text>
          <Text style={styles.cell}>6s</Text>
          <Text style={[styles.cell, { flex: 1.2 }]}>SR</Text>
        </View>
        {data.batting.map((b, i) => (
          <View key={i} style={styles.tableRow}>
            <View style={{ flex: 2 }}>
              <Text style={styles.playerName}>{b.name}</Text>
              <Text style={styles.dismissalText}>{b.is_out ? (b.dismissal || 'out') : 'not out'}</Text>
            </View>
            <Text style={styles.cell}>{b.runs}</Text>
            <Text style={styles.cell}>{b.balls}</Text>
            <Text style={styles.cell}>{b.fours}</Text>
            <Text style={styles.cell}>{b.sixes}</Text>
            <Text style={[styles.cell, { flex: 1.2 }]}>{b.strike_rate}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderBowlingTable = () => {
    if (!data || data.bowling.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bowling</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, { flex: 2 }]}>Bowler</Text>
          <Text style={styles.cell}>O</Text>
          <Text style={styles.cell}>R</Text>
          <Text style={styles.cell}>W</Text>
          <Text style={[styles.cell, { flex: 1.2 }]}>Eco</Text>
        </View>
        {data.bowling.map((b, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.playerName, { flex: 2 }]}>{b.name}</Text>
            <Text style={styles.cell}>{Math.floor(b.balls / 6)}.{b.balls % 6}</Text>
            <Text style={styles.cell}>{b.runs_conceded}</Text>
            <Text style={styles.cell}>{b.wickets}</Text>
            <Text style={[styles.cell, { flex: 1.2 }]}>{b.economy}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Summary</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, innings === 1 && styles.activeTab]} 
          onPress={() => setInnings(1)}
        >
          <Text style={[styles.tabText, innings === 1 && styles.activeTabText]}>1st Innings</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, innings === 2 && styles.activeTab]} 
          onPress={() => setInnings(2)}
        >
          <Text style={[styles.tabText, innings === 2 && styles.activeTabText]}>2nd Innings</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {renderSummaryCard()}
          {renderBattingTable()}
          {renderBowlingTable()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { 
    flexDirection: 'row', alignItems: 'center', padding: 20, 
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' 
  },
  headerTitle: { fontSize: 18, fontWeight: '700', marginLeft: 16, color: '#111827' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', padding: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#10B981' },
  tabText: { fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#FFF' },
  scroll: { padding: 16 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { 
    backgroundColor: '#1F2937', padding: 20, borderRadius: 16, 
    marginBottom: 20, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 
  },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 16 },
  mainScore: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  oversText: { fontSize: 16, color: '#9CA3AF' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 },
  statLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  extrasBreakdown: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 },
  extrasText: { color: '#9CA3AF', fontSize: 12, textAlign: 'center' },
  section: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 16 },
  tableHeader: { 
    flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6', marginBottom: 10 
  },
  tableRow: { 
    flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, 
    borderBottomColor: '#F9FAFB', alignItems: 'center' 
  },
  cell: { flex: 1, textAlign: 'center', fontSize: 13, color: '#4B5563', fontWeight: '500' },
  playerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  dismissalText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
