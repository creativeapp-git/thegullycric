import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import Header from '../components/Header';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme';

interface LeaderRow {
  id: string;
  username: string;
  name: string;
  total: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<LeaderRow[]>([]);

  const fetchAndCompute = useCallback(async () => {
    try {
      // Single parallel fetch — users + completed matches
      const [usersRes, matchesRes] = await Promise.all([
        supabase.from('users').select('id, username, name'),
        supabase.from('matches').select('created_by, winner, team1, creator_team, match_state').eq('match_state', 'completed'),
      ]);

      const users: any[] = usersRes.data || [];
      const matches: any[] = matchesRes.data || [];

      // Group matches by creator
      const matchMap: Record<string, any[]> = {};
      for (const m of matches) {
        if (!matchMap[m.created_by]) matchMap[m.created_by] = [];
        matchMap[m.created_by].push(m);
      }

      // Build leaderboard rows — only users with at least 1 match
      const leaderRows: LeaderRow[] = [];
      for (const u of users) {
        const userMatches = matchMap[u.id] || [];
        if (userMatches.length === 0) continue;

        const total = userMatches.length;
        // Use creator_team if set, else fall back to team1
        const wins = userMatches.filter(m => m.winner && m.winner !== 'tie' && m.winner === (m.creator_team || m.team1)).length;
        const losses = userMatches.filter(m => m.winner && m.winner !== 'tie' && m.winner !== (m.creator_team || m.team1)).length;
        const ties = userMatches.filter(m => m.winner === 'tie').length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        leaderRows.push({ id: u.id, username: u.username || 'unknown', name: u.name || u.username || 'Player', total, wins, losses, ties, winRate });
      }

      // Sort: wins DESC → winRate DESC
      leaderRows.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);

      setRows(leaderRows);
    } catch (e) {
      console.error('Leaderboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAndCompute(); }, [fetchAndCompute]);
  const onRefresh = () => { setRefreshing(true); fetchAndCompute(); };

  const renderItem = ({ item, index }: { item: LeaderRow; index: number }) => {
    const isTop3 = index < 3;
    const podiumColors = ['#F59E0B', '#94A3B8', '#CD7C2F'];

    return (
      <TouchableOpacity
        style={[styles.row, isTop3 && { borderColor: podiumColors[index], borderWidth: 1.5 }]}
        onPress={() => navigation.navigate('PublicUserProfile', { username: item.username })}
        activeOpacity={0.85}
      >
        {/* Rank */}
        <View style={[styles.rankBox, isTop3 && { backgroundColor: podiumColors[index] + '20' }]}>
          {isTop3 ? (
            <Text style={styles.medal}>{MEDALS[index]}</Text>
          ) : (
            <Text style={styles.rankNum}>#{index + 1}</Text>
          )}
        </View>

        {/* Name & handle */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.handle}>@{item.username}</Text>
        </View>

        {/* Stats columns */}
        <View style={styles.stats}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{item.total}</Text>
            <Text style={styles.statLbl}>M</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: '#10B981' }]}>{item.wins}</Text>
            <Text style={styles.statLbl}>W</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, { color: '#EF4444' }]}>{item.losses}</Text>
            <Text style={styles.statLbl}>L</Text>
          </View>
          <View style={[styles.statCol, styles.winRateCol]}>
            <Text style={[styles.statVal, { color: COLORS.primary, fontSize: 16 }]}>{item.winRate}%</Text>
            <Text style={styles.statLbl}>WIN%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View>
      {/* Trophy header */}
      <View style={styles.heroBox}>
        <Ionicons name="trophy" size={36} color="#F59E0B" />
        <Text style={styles.heroTitle}>Leaderboard</Text>
        <Text style={styles.heroSub}>Ranked by wins · creator = team1</Text>
      </View>

      {/* Column headers */}
      <View style={styles.colHeader}>
        <View style={styles.rankBox} />
        <Text style={[styles.colLbl, { flex: 1, marginLeft: 8 }]}>PLAYER</Text>
        <View style={styles.stats}>
          <Text style={[styles.colLbl, { width: 36, textAlign: 'center' }]}>M</Text>
          <Text style={[styles.colLbl, { width: 36, textAlign: 'center' }]}>W</Text>
          <Text style={[styles.colLbl, { width: 36, textAlign: 'center' }]}>L</Text>
          <Text style={[styles.colLbl, { width: 54, textAlign: 'center' }]}>WIN%</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />
      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 40 }}>📋</Text>
              <Text style={styles.emptyTitle}>No data yet</Text>
              <Text style={styles.emptySub}>Complete some matches to appear here</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroBox: { backgroundColor: COLORS.white, alignItems: 'center', paddingVertical: 28, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  heroTitle: { fontSize: 24, fontWeight: '900', color: COLORS.text, marginTop: 8 },
  heroSub: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', marginTop: 4 },
  colHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 10, backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  colLbl: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, marginTop: 10, padding: 14, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.soft },
  rankBox: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: COLORS.card },
  medal: { fontSize: 22 },
  rankNum: { fontSize: 14, fontWeight: '900', color: COLORS.textSecondary },
  info: { flex: 1, marginLeft: 10 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  handle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1, fontWeight: '500' },
  stats: { flexDirection: 'row', alignItems: 'center' },
  statCol: { width: 36, alignItems: 'center' },
  winRateCol: { width: 54 },
  statVal: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  statLbl: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, marginTop: 2, textTransform: 'uppercase' },
  emptyBox: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 12 },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
});
