import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import Header from '../components/Header';
import { SkeletonMatchList } from '../components/SkeletonLoader';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme';

const MySpaceScreen = () => {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;

      const [profileRes, matchesRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', uid).single(),
        supabase.from('matches').select('*').eq('created_by', uid).order('created_at', { ascending: false }),
      ]);

      setUser(profileRes.data);
      setMatches(matchesRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  // ── Derive stats from matches ──
  const totalMatches = matches.length;
  const liveMatches = matches.filter(m => m.match_state === 'live').length;
  const completedMatches = matches.filter(m => m.match_state === 'completed');
  // Use creator_team if available, else fall back to team1
  const wonMatches = completedMatches.filter(m => m.winner && m.winner !== 'tie' && m.winner === (m.creator_team || m.team1)).length;
  const lostMatches = completedMatches.filter(m => m.winner && m.winner !== 'tie' && m.winner !== (m.creator_team || m.team1)).length;
  const tiedMatches = completedMatches.filter(m => m.winner === 'tie').length;

  const getStatusColor = (state: string) => {
    if (state === 'live') return '#10B981';
    if (state === 'completed') return '#6366F1';
    if (state === 'innings_break') return '#F59E0B';
    return '#94A3B8';
  };

  const getStatusLabel = (state: string) => {
    if (state === 'live') return '🔴 LIVE';
    if (state === 'completed') return '✅ COMPLETED';
    if (state === 'innings_break') return '☕ INNINGS BREAK';
    if (state === 'setup') return '⚙️ SETUP';
    return state?.toUpperCase().replace(/_/g, ' ') || 'UNKNOWN';
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Profile */}
      <View style={styles.profileBox}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><Text style={{ fontSize: 36 }}>👤</Text></View>
          )}
          <TouchableOpacity style={styles.editBadge} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="pencil" size={12} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name || user?.username || 'Player'}</Text>
        <Text style={styles.userHandle}>@{user?.username || 'cricketer'}</Text>
        {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.statValue, { color: '#3B82F6' }]}>{totalMatches}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{wonMatches}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>{lostMatches}</Text>
          <Text style={styles.statLabel}>Losses</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{liveMatches}</Text>
          <Text style={styles.statLabel}>Live</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FDF4FF' }]}>
          <Text style={[styles.statValue, { color: '#A855F7' }]}>{tiedMatches}</Text>
          <Text style={styles.statLabel}>Tied</Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Matches</Text>
        <TouchableOpacity style={styles.addMatchBtn} onPress={() => navigation.navigate('CreateMatch')}>
          <Ionicons name="add" size={20} color={COLORS.primary} />
          <Text style={styles.addMatchText}>New Match</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMatch = ({ item }: { item: any }) => {
    const score1 = `${item.score1 || 0}/${item.wickets1 || 0}`;
    const score2 = `${item.score2 || 0}/${item.wickets2 || 0}`;
    const isCompleted = item.match_state === 'completed';
    const isLive = item.match_state === 'live';

    return (
      <TouchableOpacity
        style={styles.matchCard}
        onPress={() => navigation.navigate('PublicMatch', { matchId: item.match_id })}
        activeOpacity={0.85}
      >
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.match_state) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.match_state) }]}>
            {getStatusLabel(item.match_state)}
          </Text>
        </View>

        {/* Teams & Scores */}
        <View style={styles.matchRow}>
          <View style={styles.teamCol}>
            <Text style={styles.teamName} numberOfLines={1}>{item.team1}</Text>
            <Text style={[styles.scoreNum, isLive && item.current_innings === 1 && styles.activeBatting]}>{score1}</Text>
          </View>
          <View style={styles.vsCol}>
            <Text style={styles.vsText}>VS</Text>
            {item.overs ? <Text style={styles.oversText}>{item.overs} ov</Text> : null}
          </View>
          <View style={[styles.teamCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.teamName} numberOfLines={1}>{item.team2}</Text>
            <Text style={[styles.scoreNum, isLive && item.current_innings === 2 && styles.activeBatting]}>{score2}</Text>
          </View>
        </View>

        {/* Winner / Target line */}
        {isCompleted && item.winner && (
          <View style={styles.resultRow}>
            <Ionicons name={item.winner === 'tie' ? 'swap-horizontal' : 'trophy'} size={13} color={item.winner === 'tie' ? '#F59E0B' : '#10B981'} />
            <Text style={[styles.resultText, { color: item.winner === 'tie' ? '#F59E0B' : '#10B981' }]}>
              {item.winner === 'tie' ? 'Match Tied' : `${item.winner} won`}
            </Text>
          </View>
        )}
        {item.current_innings === 2 && item.target && !isCompleted && (
          <Text style={styles.targetLine}>Target: {item.target}</Text>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.matchId}>#{item.match_id}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header />
      {loading ? (
        <SkeletonMatchList />
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          ListHeaderComponent={renderHeader}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyBox}>
              <Text style={{ fontSize: 40 }}>🏏</Text>
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySub}>Create your first match to get started</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateMatch')}>
                <Text style={styles.createBtnText}>+ Create Match</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerSection: { padding: SPACING.lg },
  profileBox: { alignItems: 'center', marginBottom: SPACING.xl },
  avatarContainer: { position: 'relative', marginBottom: SPACING.md },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: COLORS.primaryLight },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.white },
  userName: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginTop: 4 },
  userHandle: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  bio: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: SPACING.lg },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.xl },
  statCard: { flex: 1, padding: 14, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', ...SHADOWS.soft },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  addMatchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addMatchText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, marginLeft: 4 },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  matchCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.soft },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
  statusText: { fontSize: 11, fontWeight: '800' },
  matchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  teamCol: { flex: 1 },
  teamName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  scoreNum: { fontSize: 22, fontWeight: '900', color: COLORS.textSecondary, marginTop: 2 },
  activeBatting: { color: COLORS.primary },
  vsCol: { paddingHorizontal: 12, alignItems: 'center' },
  vsText: { fontSize: 12, fontWeight: '900', color: COLORS.textSecondary, opacity: 0.5 },
  oversText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  resultText: { fontSize: 13, fontWeight: '700' },
  targetLine: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4 },
  matchId: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 12 },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center' },
  createBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 },
  createBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
});

export default MySpaceScreen;