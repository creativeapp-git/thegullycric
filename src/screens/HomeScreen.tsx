import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAllMatches } from '../services/matchService';
import { Match } from '../types';
import Header from '../components/Header';
import MatchCard from '../components/MatchCard';
import { SkeletonMatchList } from '../components/SkeletonLoader';
import { AppNavigationProp } from '../navigation/navigation.types';

const HomeScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [completedMatches, setCompletedMatches] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchMatches();
    }, [])
  );

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const all = await getAllMatches();
      // Exclude deleted
      const activeMatches = all.filter(m => !m.isDeleted);
      setLiveMatches(activeMatches.filter(m => m.status === 'Live'));
      setCompletedMatches(activeMatches.filter(m => m.status === 'Completed'));
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  };

  const filteredLive = searchQuery
    ? liveMatches.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.matchId.includes(searchQuery))
    : liveMatches;
  const filteredCompleted = searchQuery
    ? completedMatches.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.matchId.includes(searchQuery))
    : completedMatches;

  const data = [
    ...(filteredLive.length > 0 ? [{ type: 'header', title: 'Live Matches' }, ...filteredLive] : []),
    ...(filteredCompleted.length > 0 ? [{ type: 'header', title: 'Completed Matches' }, ...filteredCompleted] : []),
  ];

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            {item.title === 'Live Matches' && <View style={styles.liveIndicator} />}
            <Text style={styles.sectionTitle}>{item.title}</Text>
          </View>
        </View>
      );
    }
    return (
      <MatchCard
        match={item}
        onPress={() => navigation.navigate('MatchDetail', { matchId: item.id || item.matchId })}
      />
    );
  };

  return (
    <View style={[styles.container, Platform.OS === 'web' && { height: '100vh' as any, overflow: 'hidden' as any }]}>
      <Header />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID or Name"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.listContainer}>
        {loading && !refreshing ? (
          <View style={{ paddingHorizontal: 20 }}><SkeletonMatchList count={3} /></View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item, index) => item.id || `header-${index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="analytics-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Matches Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? "Try a different search term" : "There are no live or completed matches right now."}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  searchContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', zIndex: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#111827', height: '100%' },
  listContainer: { flex: 1 },
  listContent: { padding: 20, paddingBottom: 100 },
  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  liveIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
});

export default HomeScreen;