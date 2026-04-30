import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Alert, ActivityIndicator, Image } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { getUserMatches, deleteMatch } from '../services/matchService';
import { Match } from '../types';
import Header from '../components/Header';
import MatchCard from '../components/MatchCard';
import { SkeletonMatchList } from '../components/SkeletonLoader';
import { AppNavigationProp } from '../navigation/navigation.types';

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

      // 1. Fetch Profile Info
      const { data: profile } = await supabase.from('users').select('*').eq('id', uid).single();
      setUser(profile);

      // 2. Fetch Stats via RPC
      const { data: statsData, error: statsError } = await supabase.rpc('get_user_stats', {
        p_user_id: uid
      });
      if (!statsError) setStats(statsData);

      // 3. Fetch Matches
      const matches = await getUserMatches(uid);
      setUserMatches(matches.filter(m => !m.isDeleted));
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDelete = (matchId: string) => {
    const confirmDelete = () => {
      deleteMatch(matchId).then(() => {
        fetchData();
      }).catch(e => {
        if (Platform.OS === 'web') window.alert('Failed to delete');
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this match?')) confirmDelete();
    } else {
      Alert.alert('Delete Match', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.profileInfo}>
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={{fontSize: 32}}>👤</Text>
          </View>
        )}
        <View style={styles.nameSection}>
          <Text style={styles.userName}>{user?.name || user?.username || 'Gully Cricketer'}</Text>
          <Text style={styles.userHandle}>@{user?.username || 'cricketer'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={styles.editBtn}>
          <Ionicons name="settings-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.total_matches || 0}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={[styles.statItem, styles.statDivider]}>
          <Text style={styles.statValue}>{stats?.total_runs || 0}</Text>
          <Text style={styles.statLabel}>Runs</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats?.total_wickets || 0}</Text>
          <Text style={styles.statLabel}>Wickets</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreateMatch')}>
        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
        <Text style={styles.createButtonText}>Host New Match</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Matches</Text>
    </View>
  );

  const renderMatch = ({ item }: { item: Match }) => (
    <View style={{ marginBottom: 12 }}>
      <MatchCard
        match={item}
        onPress={() => navigation.navigate('MatchDetail', { matchId: item.id || item.matchId })}
      />
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id || item.matchId)}>
        <Ionicons name="trash-outline" size={16} color="#EF4444" />
      </TouchableOpacity>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matches hosted yet</Text>
          </View>
        ) : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  profileHeader: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 12 },
  profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  nameSection: { flex: 1, marginLeft: 16 },
  userName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  userHandle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  editBtn: { padding: 8, backgroundColor: '#F9FAFB', borderRadius: 12 },
  statsRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 20, padding: 20, marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E5E7EB' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  createButton: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, marginBottom: 20 },
  createButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 8 },
  listContainer: { paddingBottom: 100 },
  deleteBtn: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  emptyContainer: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#9CA3AF', fontStyle: 'italic' },
});

export default MySpaceScreen;