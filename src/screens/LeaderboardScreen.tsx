import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import Header from '../components/Header';

interface LeaderboardData {
  batting: any[];
  bowling: any[];
  users: any[];
}

export default function LeaderboardScreen() {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'7d' | '30d' | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'Batting' | 'Bowling' | 'Organizers'>('Batting');
  const [data, setData] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    fetchLeaderboards();
  }, [filter]);

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);
      const { data: res, error } = await supabase.rpc('get_leaderboards', {
        p_days: filter
      });
      if (error) throw error;
      setData(res);
    } catch (e) {
      console.error('Leaderboard fetch error:', e);
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

  const renderBatterItem = ({ item, index }: any) => (
    <View style={styles.rankRow}>
      <Text style={styles.rankNum}>#{index + 1}</Text>
      <View style={styles.rankInfo}>
        <Text style={styles.rankName}>{item.name}</Text>
        <Text style={styles.rankSubText}>SR: {item.strike_rate} | 4s: {item.fours} | 6s: {item.sixes}</Text>
      </View>
      <View style={styles.rankValueBox}>
        <Text style={styles.rankValue}>{item.total_runs}</Text>
        <Text style={styles.rankValueLabel}>RUNS</Text>
      </View>
    </View>
  );

  const renderBowlerItem = ({ item, index }: any) => (
    <View style={styles.rankRow}>
      <Text style={styles.rankNum}>#{index + 1}</Text>
      <View style={styles.rankInfo}>
        <Text style={styles.rankName}>{item.name}</Text>
        <Text style={styles.rankSubText}>Eco: {item.economy} | {item.runs_conceded} runs conceded</Text>
      </View>
      <View style={styles.rankValueBox}>
        <Text style={[styles.rankValue, {color: '#3B82F6'}]}>{item.wickets}</Text>
        <Text style={styles.rankValueLabel}>WKTS</Text>
      </View>
    </View>
  );

  const renderOrganizerItem = ({ item, index }: any) => (
    <View style={styles.rankRow}>
      <Text style={styles.rankNum}>#{index + 1}</Text>
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}><Ionicons name="person" size={16} color="#9CA3AF" /></View>
      )}
      <View style={styles.rankInfo}>
        <Text style={styles.rankName}>{item.username}</Text>
        <Text style={styles.rankSubText}>{item.total_match_runs} runs tracked</Text>
      </View>
      <View style={styles.rankValueBox}>
        <Text style={[styles.rankValue, {color: '#F59E0B'}]}>{item.matches_organized}</Text>
        <Text style={styles.rankValueLabel}>MATCHES</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />
      
      <View style={styles.filterBar}>
        {renderFilterBtn('7d', '7 Days')}
        {renderFilterBtn('30d', '30 Days')}
        {renderFilterBtn('all', 'All Time')}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'Batting' && styles.tabActive]} onPress={() => setActiveTab('Batting')}>
          <Text style={[styles.tabText, activeTab === 'Batting' && styles.tabTextActive]}>Batting</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Bowling' && styles.tabActive]} onPress={() => setActiveTab('Bowling')}>
          <Text style={[styles.tabText, activeTab === 'Bowling' && styles.tabTextActive]}>Bowling</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'Organizers' && styles.tabActive]} onPress={() => setActiveTab('Organizers')}>
          <Text style={[styles.tabText, activeTab === 'Organizers' && styles.tabTextActive]}>Hosts</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={activeTab === 'Batting' ? data?.batting : activeTab === 'Bowling' ? data?.bowling : data?.users}
          keyExtractor={(item, index) => index.toString()}
          renderItem={activeTab === 'Batting' ? renderBatterItem : activeTab === 'Bowling' ? renderBowlerItem : renderOrganizerItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No rankings found for this period.</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  filterBar: { flexDirection: 'row', padding: 16, gap: 10, backgroundColor: '#FFF' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6' },
  filterBtnActive: { backgroundColor: '#10B981' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFF' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#10B981' },
  tabText: { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  tabTextActive: { color: '#111827' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, shadowOpacity: 0.03, elevation: 1 },
  rankNum: { fontSize: 16, fontWeight: '800', color: '#D1D5DB', width: 40 },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  rankSubText: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  rankValueBox: { alignItems: 'center', minWidth: 60 },
  rankValue: { fontSize: 18, fontWeight: '900', color: '#10B981' },
  rankValueLabel: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', marginTop: 2 },
  avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic' },
});
