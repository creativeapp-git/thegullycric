import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { Match } from '../types';
import Header from '../components/Header';
import MatchCard from '../components/MatchCard';
import { SkeletonMatchList } from '../components/SkeletonLoader';
import { AppNavigationProp } from '../navigation/navigation.types';
import { COLORS, SPACING, SHADOWS, BORDER_RADIUS } from '../theme';

const HomeScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMatches = async (query?: string) => {
    try {
      setLoading(true);
      let supabaseQuery = supabase.from('matches').select('*').order('created_at', { ascending: false }).limit(20);
      
      if (query) {
        supabaseQuery = supabaseQuery.or(`team1.ilike.%${query}%,team2.ilike.%${query}%,name.ilike.%${query}%`);
      }
      
      const { data, error } = await supabaseQuery;
      if (error) throw error;
      setMatches(data || []);
    } catch {
      // silent — UI shows empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMatches(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    // Subscribe to REALTIME updates for the matches table
    const channel = supabase
      .channel('public:matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches(searchQuery);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  };

  const liveMatches = matches.filter(m => m.match_state === 'live' || m.status === 'Live');
  const upcomingMatches = matches.filter(m => m.match_state === 'setup' || m.status === 'Scheduled');
  const completedMatches = matches.filter(m => m.match_state === 'completed' || m.status === 'Completed');

  const renderSection = (title: string, data: Match[]) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionCount}>{data.length}</Text>
        </View>
        {data.map((match) => (
          <MatchCard 
            key={match.id || match.matchId} 
            match={match} 
            onPress={() => navigation.navigate('MatchDetail', { matchId: match.id || match.matchId })}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Gully Cricket, <Text style={{color: COLORS.primary}}>Live.</Text></Text>
          <Text style={styles.heroSub}>Track your local matches like a pro.</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search teams or match name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>

        {loading && !refreshing ? (
          <View style={{ paddingHorizontal: SPACING.md }}><SkeletonMatchList count={3} /></View>
        ) : (
          <>
            {renderSection('Live Now', liveMatches)}
            {renderSection('Upcoming', upcomingMatches)}
            {renderSection('Completed', completedMatches)}
            
            {matches.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={{fontSize: 48}}>🏏</Text>
                <Text style={styles.emptyText}>No matches found</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateMatch')}>
                  <Text style={styles.createBtnText}>Host First Match</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 100 },
  hero: { padding: SPACING.lg, paddingBottom: SPACING.md },
  heroTitle: { fontSize: 28, fontWeight: '900', color: COLORS.text, lineHeight: 34 },
  heroSub: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, fontWeight: '500' },
  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  sectionCount: { fontSize: 12, fontWeight: '700', color: COLORS.primary, backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, marginTop: 16, marginBottom: 24 },
  createBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, ...SHADOWS.medium },
  createBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: SPACING.md, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12, ...SHADOWS.small },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '600', padding: 0 },
});

export default HomeScreen;