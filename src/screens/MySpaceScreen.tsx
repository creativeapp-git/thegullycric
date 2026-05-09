import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import Header from '../components/Header';
import { SkeletonMatchList } from '../components/SkeletonLoader';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

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
        supabase.from('users').select('id, username, name, avatar, bio').eq('id', uid).single(),
        supabase.from('matches')
          .select('id, match_id, team1, team2, score1, score2, wickets1, wickets2, overs, match_state, winner, creator_team, current_innings, target, created_at')
          .eq('created_by', uid)
          .order('created_at', { ascending: false }),
      ]);

      setUser(profileRes.data);
      setMatches(matchesRes.data || []);
    } catch (e) { }
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
    if (state === 'live') return COLORS.danger;
    if (state === 'completed') return COLORS.success;
    if (state === 'innings_break') return COLORS.warning;
    return COLORS.textSecondary;
  };

  const getStatusLabel = (state: string) => {
    if (state === 'live') return 'LIVE';
    if (state === 'completed') return 'COMPLETED';
    if (state === 'innings_break') return 'INNINGS BREAK';
    if (state === 'setup') return 'SETUP';
    return state?.toUpperCase().replace(/_/g, ' ') || 'UNKNOWN';
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Gradient Profile Banner */}
      <LinearGradient colors={['#0F1E35', '#0D1117'] as any} style={styles.profileBanner}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><Ionicons name="person" size={36} color={COLORS.primary} /></View>
          )}
          <TouchableOpacity style={styles.editBadge} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="pencil" size={11} color={COLORS.black} />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name || user?.username || 'Player'}</Text>
        <Text style={styles.userHandle}>@{user?.username || 'cricketer'}</Text>
        {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.secondary }]}>{totalMatches}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>{wonMatches}</Text>
          <Text style={styles.statLabel}>Wins</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.danger }]}>{lostMatches}</Text>
          <Text style={styles.statLabel}>Losses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.warning }]}>{liveMatches}</Text>
          <Text style={styles.statLabel}>Live</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: COLORS.textSecondary }]}>{tiedMatches}</Text>
          <Text style={styles.statLabel}>Tied</Text>
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Matches</Text>
        <TouchableOpacity style={styles.addMatchBtn} onPress={() => navigation.navigate('CreateMatch')}>
          <Ionicons name="add" size={18} color={COLORS.black} />
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
            <Ionicons name={item.winner === 'tie' ? 'swap-horizontal' : 'trophy'} size={13} color={item.winner === 'tie' ? COLORS.warning : COLORS.primary} />
            <Text style={[styles.resultText, { color: item.winner === 'tie' ? COLORS.warning : COLORS.primary }]}>
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
              <Ionicons name="tennisball-outline" size={56} color={COLORS.border} />
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptySub}>Create your first match to get started</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateMatch')}>
                <Text style={styles.createBtnText}>Create Match</Text>
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
  headerSection: { paddingBottom: SPACING.sm },

  // Profile banner
  profileBanner: { alignItems: 'center', paddingTop: SPACING.xxl, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.xl },
  profileBox: { alignItems: 'center', marginBottom: SPACING.xl, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  avatarContainer: { position: 'relative', marginBottom: SPACING.md },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: COLORS.primary },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.cardElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, ...SHADOWS.glowPrimary },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.background },
  userName: { fontSize: TYPOGRAPHY.sizes.xxl, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.text, marginTop: SPACING.sm },
  userHandle: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.weights.medium, marginTop: 2 },
  bio: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.xl, paddingHorizontal: SPACING.lg },
  statCard: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', backgroundColor: COLORS.cardElevated, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  statValue: { fontSize: TYPOGRAPHY.sizes.xxl, fontWeight: TYPOGRAPHY.weights.black },
  statLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.weights.bold, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  addMatchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md, gap: 4, ...SHADOWS.glowPrimary },
  addMatchText: { color: COLORS.black, fontWeight: TYPOGRAPHY.weights.black, fontSize: TYPOGRAPHY.sizes.xs, letterSpacing: 0.3 },

  // Match list
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  matchCard: { backgroundColor: COLORS.cardElevated, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.medium },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.pill, marginBottom: SPACING.md },
  statusText: { fontSize: 9, fontWeight: TYPOGRAPHY.weights.black, letterSpacing: 0.8 },
  matchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  teamCol: { flex: 1 },
  teamName: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.text },
  scoreNum: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.textSecondary, marginTop: 2 },
  activeBatting: { color: COLORS.primary },
  vsCol: { paddingHorizontal: 12, alignItems: 'center' },
  vsText: { fontSize: 9, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.textMuted, backgroundColor: COLORS.card, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, overflow: 'hidden', letterSpacing: 0.5 },
  oversText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, fontWeight: TYPOGRAPHY.weights.medium },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: SPACING.sm },
  resultText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold },
  targetLine: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.warning, marginBottom: SPACING.sm, fontWeight: TYPOGRAPHY.weights.semibold },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.borderLight, paddingTop: SPACING.sm, marginTop: SPACING.xs },
  matchId: { fontSize: 10, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.weights.medium },

  // Empty state
  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.text, marginTop: SPACING.md },
  emptySub: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  createBtn: { marginTop: SPACING.xl, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.glowPrimary },
  createBtnText: { color: COLORS.black, fontWeight: TYPOGRAPHY.weights.black, fontSize: TYPOGRAPHY.sizes.md, letterSpacing: 0.3 },
});

export default MySpaceScreen;
