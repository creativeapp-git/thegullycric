import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import Header from '../components/Header';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme';

export default function LeaderboardScreen() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'7d' | '30d' | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'Batting' | 'Bowling' | 'Hosts'>('Batting');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboards();
  }, [filter]);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const { data: res } = await supabase.rpc('get_leaderboards', { p_days: filter });
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderFilterBtn = (id: typeof filter, label: string) => (
    <TouchableOpacity 
      style={[styles.filterBtn, filter === id && styles.filterBtnActive]}
      onPress={() => setFilter(id)}
    >
      <Text style={[styles.filterText, filter === id && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderRankItem = ({ item, index }: any) => {
    const isTop3 = index < 3;
    const medals = ['🥇', '🥈', '🥉'];

    return (
      <View style={[styles.rankRow, isTop3 && styles.topRankRow]}>
        <View style={styles.rankBadge}>
          {isTop3 ? (
            <Text style={styles.medal}>{medals[index]}</Text>
          ) : (
            <Text style={styles.rankNum}>{index + 1}</Text>
          )}
        </View>
        
        <View style={styles.rankInfo}>
          <Text style={styles.rankName}>{item.name || item.username}</Text>
          <Text style={styles.rankSubText}>
            {activeTab === 'Batting' ? `SR: ${item.strike_rate}` : activeTab === 'Bowling' ? `Eco: ${item.economy}` : `${item.total_match_runs} runs tracked`}
          </Text>
        </View>

        <View style={styles.rankValueBox}>
          <Text style={styles.rankValue}>
            {activeTab === 'Batting' ? item.total_runs : activeTab === 'Bowling' ? item.wickets : item.matches_organized}
          </Text>
          <Text style={styles.rankValueLabel}>
            {activeTab === 'Batting' ? 'RUNS' : activeTab === 'Bowling' ? 'WKTS' : 'HOSTED'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header />
      
      <View style={styles.filterBar}>
        {renderFilterBtn('7d', '7D')}
        {renderFilterBtn('30d', '30D')}
        {renderFilterBtn('all', 'ALL')}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'Batting' && styles.tabActive]} onPress={() => setActiveTab('Batting')}>
          <Text style={[styles.tabText, activeTab === 'Batting' && styles.tabTextActive]}>Batting</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Bowling' && styles.tabActive]} onPress={() => setActiveTab('Bowling')}>
          <Text style={[styles.tabText, activeTab === 'Bowling' && styles.tabTextActive]}>Bowling</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Hosts' && styles.tabActive]} onPress={() => setActiveTab('Hosts')}>
          <Text style={[styles.tabText, activeTab === 'Hosts' && styles.tabTextActive]}>Hosts</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={activeTab === 'Batting' ? data?.batting : activeTab === 'Bowling' ? data?.bowling : data?.users}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderRankItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filterBar: { flexDirection: 'row', padding: SPACING.md, gap: 10, backgroundColor: COLORS.white },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white },
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: SPACING.md, paddingBottom: 100 },
  rankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, borderRadius: BORDER_RADIUS.lg, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  topRankRow: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  rankBadge: { width: 40, alignItems: 'center' },
  medal: { fontSize: 20 },
  rankNum: { fontSize: 15, fontWeight: '800', color: COLORS.textSecondary },
  rankInfo: { flex: 1, marginLeft: 8 },
  rankName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  rankSubText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500' },
  rankValueBox: { alignItems: 'center', minWidth: 60 },
  rankValue: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  rankValueLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textSecondary, marginTop: 2 },
});
