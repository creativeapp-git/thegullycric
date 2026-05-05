import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme';

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
  return state?.toUpperCase().replace(/_/g, ' ') || '–';
};

export default function PublicUserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { username } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch user by username
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('id, username, name, bio, avatar')
        .eq('username', username)
        .single();

      if (userErr || !user) {
        setProfileUser(null);
        return;
      }

      setProfileUser(user);

      // Fetch their matches
      const { data: matchData } = await supabase
        .from('matches')
        .select('id, match_id, team1, team2, score1, score2, wickets1, wickets2, overs, match_state, winner, creator_team, current_innings, target, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      setMatches(matchData || []);
    } catch (e) {
      console.error('PublicUserProfile error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [username]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // ── Derived stats ──
  const totalMatches = matches.length;
  const liveMatches = matches.filter(m => m.match_state === 'live').length;
  const completed = matches.filter(m => m.match_state === 'completed');
  const wins = completed.filter(m => m.winner && m.winner !== 'tie' && m.winner === (m.creator_team || m.team1)).length;
  const losses = completed.filter(m => m.winner && m.winner !== 'tie' && m.winner !== (m.creator_team || m.team1)).length;
  const ties = completed.filter(m => m.winner === 'tie').length;

  const renderMatchCard = ({ item }: { item: any }) => {
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
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.match_state) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.match_state) }]}>
            {getStatusLabel(item.match_state)}
          </Text>
        </View>

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

        {isCompleted && item.winner && (
          <View style={styles.resultRow}>
            <Ionicons name={item.winner === 'tie' ? 'swap-horizontal' : 'trophy'} size={13} color={item.winner === 'tie' ? '#F59E0B' : '#10B981'} />
            <Text style={[styles.resultText, { color: item.winner === 'tie' ? '#F59E0B' : '#10B981' }]}>
              {item.winner === 'tie' ? 'Match Tied' : `${item.winner} won`}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.matchId}>#{item.match_id}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerSection}>
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {/* Profile */}
      <View style={styles.profileBox}>
        <View style={styles.avatarCircle}>
          <Text style={{ fontSize: 40 }}>👤</Text>
        </View>
        <Text style={styles.userName}>{profileUser?.name || profileUser?.username}</Text>
        <Text style={styles.userHandle}>@{profileUser?.username}</Text>
        {profileUser?.bio ? <Text style={styles.bio}>{profileUser.bio}</Text> : null}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { val: totalMatches, label: 'Total', color: '#3B82F6', bg: '#EFF6FF' },
          { val: wins, label: 'Wins', color: '#10B981', bg: '#F0FDF4' },
          { val: losses, label: 'Losses', color: '#EF4444', bg: '#FEF2F2' },
          { val: liveMatches, label: 'Live', color: '#F59E0B', bg: '#FEF3C7' },
          { val: ties, label: 'Tied', color: '#A855F7', bg: '#FDF4FF' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Match History</Text>
    </View>
  );

  if (loading) return (
    <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
  );

  if (!profileUser) return (
    <View style={styles.center}>
      <Ionicons name="person-outline" size={48} color={COLORS.textSecondary} />
      <Text style={styles.notFoundTitle}>User not found</Text>
      <Text style={styles.notFoundSub}>@{username}</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackBtn}>
        <Text style={styles.goBackText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={matches}
        renderItem={renderMatchCard}
        ListHeaderComponent={ListHeader}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyBox}>
            <Text style={{ fontSize: 36 }}>🏏</Text>
            <Text style={styles.emptyTitle}>No matches yet</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  headerSection: { padding: SPACING.lg },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  backText: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginLeft: 4 },
  profileBox: { alignItems: 'center', marginBottom: SPACING.xl },
  avatarCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primaryLight, marginBottom: SPACING.md },
  userName: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  userHandle: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  bio: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: SPACING.lg },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.xl, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 56, padding: 12, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', ...SHADOWS.soft },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.sm },
  list: { paddingBottom: 100 },
  matchCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.xl, padding: 16, marginHorizontal: SPACING.lg, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.soft },
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
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4 },
  matchId: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  notFoundTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 12 },
  notFoundSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  goBackBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  goBackText: { color: COLORS.white, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 8 },
});
