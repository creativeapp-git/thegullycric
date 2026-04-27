import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getFixtures, searchMatches } from '../services/matchService';
import { Match } from '../types';
import Header from '../components/Header';
import MatchCard from '../components/MatchCard';
import { SkeletonMatchList } from '../components/SkeletonLoader';
import { AppNavigationProp } from '../navigation/navigation.types';

const FixturesScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [fixtures, setFixtures] = useState<Match[]>([]);
  const [filteredFixtures, setFilteredFixtures] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      fetchFixtures();
    }, [])
  );

  const fetchFixtures = async () => {
    try {
      setLoading(true);
      const scheduledMatches = await getFixtures();
      const activeFixtures = scheduledMatches.filter(m => !m.isDeleted);
      setFixtures(activeFixtures);
      setFilteredFixtures(activeFixtures);
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFixtures();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredFixtures(fixtures);
    } else {
      const results = await searchMatches(query, fixtures);
      setFilteredFixtures(results);
    }
  };

  const renderFixture = ({ item }: { item: Match }) => (
    <MatchCard
      match={item}
      onPress={() => navigation.navigate('MatchDetail', { matchId: item.id || item.matchId })}
    />
  );

  return (
    <View style={styles.container}>
      <Header />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search fixtures..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#D1D5DB" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 20 }}><SkeletonMatchList count={4} /></View>
      ) : filteredFixtures.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={{fontSize: 40}}>📅</Text>
          </View>
          <Text style={styles.emptyText}>No upcoming matches</Text>
          <Text style={styles.emptySubtext}>Check back later for new fixtures</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFixtures}
          renderItem={renderFixture}
          keyExtractor={(item) => item.id || item.matchId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  searchContainer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, height: 50 },
  searchInput: { flex: 1, fontSize: 16, color: '#111827', marginLeft: 12 },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60, paddingHorizontal: 32 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtext: { fontSize: 15, color: '#6B7280', textAlign: 'center' },

  listContainer: { padding: 20, paddingBottom: 100 },
});

export default FixturesScreen;