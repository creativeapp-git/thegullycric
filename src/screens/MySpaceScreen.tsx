import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Alert, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { getUserMatches, deleteMatch } from '../services/matchService';
import { Match } from '../types';
import Header from '../components/Header';
import MatchCard from '../components/MatchCard';
import { SkeletonMatchList } from '../components/SkeletonLoader';
import { AppNavigationProp } from '../navigation/navigation.types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme';

interface UserStats {
  total_matches: number;
  total_runs: number;
  total_wickets: number;
  total_balls_faced: number;
  total_balls_bowled: number;
}

const MySpaceScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const uid = session.user.id;

      const { data: profile } = await supabase.from('users').select('*').eq('id', uid).single();
      setUser(profile);

      const { data: statsData } = await supabase.rpc('get_user_stats', { p_user_id: uid });
      setStats(statsData);

      const matches = await getUserMatches(uid);
      setUserMatches(matches.filter(m => !m.isDeleted));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.profileBox}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><Text style={{fontSize: 32}}>👤</Text></View>
          )}
          <TouchableOpacity style={styles.editBadge} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="pencil" size={12} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name || user?.username || 'Player'}</Text>
        <Text style={styles.userHandle}>@{user?.username || 'cricketer'}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.total_matches || 0}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={[styles.statCard, {backgroundColor: COLORS.primaryLight}]}>
          <Text style={[styles.statValue, {color: COLORS.primary}]}>{stats?.total_runs || 0}</Text>
          <Text style={styles.statLabel}>Total Runs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.total_wickets || 0}</Text>
          <Text style={styles.statLabel}>Wickets</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Matches</Text>
        <TouchableOpacity style={styles.addMatchBtn} onPress={() => navigation.navigate('CreateMatch')}>
          <Ionicons name="add" size={20} color={COLORS.primary} />
          <Text style={styles.addMatchText}>New</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMatch = ({ item }: { item: Match }) => (
    <View style={{ marginBottom: 12 }}>
      <MatchCard match={item} onPress={() => navigation.navigate('MatchDetail', { matchId: item.id || item.matchId })} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={userMatches}
        renderItem={renderMatch}
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => item.id || item.matchId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerSection: { padding: SPACING.lg, alignItems: 'center' },
  profileBox: { alignItems: 'center', marginBottom: SPACING.xl },
  avatarContainer: { position: 'relative', marginBottom: SPACING.md },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: COLORS.primaryLight },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.white },
  userName: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  userHandle: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', marginTop: 2 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: SPACING.xl },
  statCard: { flex: 1, backgroundColor: COLORS.card, padding: 16, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', ...SHADOWS.soft },
  statValue: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700', marginTop: 4, textTransform: 'uppercase' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  addMatchBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addMatchText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, marginLeft: 4 },
  list: { paddingBottom: 100 },
});

export default MySpaceScreen;