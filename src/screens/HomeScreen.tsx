import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getLiveMatches, searchMatches, Match } from '../services/matchService';
import Header from '../components/Header';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
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
      const liveMatches = await getLiveMatches();
      setMatches(liveMatches);
      setFilteredMatches(liveMatches);
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredMatches(matches);
    } else {
      const results = await searchMatches(query, matches);
      setFilteredMatches(results);
    }
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => navigation.navigate('MatchDetail' as never, { matchId: item.id } as never)}
    >
      <View style={styles.matchHeader}>
        <View>
          <Text style={styles.matchId}>ID: {item.matchId}</Text>
          <Text style={styles.matchName}>{item.name}</Text>
          <Text style={styles.matchLocation}>{item.location}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Live' ? '#FF5722' : '#4CAF50' }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamScore}>
          <Text style={styles.teamName}>{item.team1}</Text>
          <Text style={styles.score}>{item.score1 || '-'}</Text>
        </View>
        <Text style={styles.vs}>vs</Text>
        <View style={styles.teamScore}>
          <Text style={styles.teamName}>{item.team2}</Text>
          <Text style={styles.score}>{item.score2 || '-'}</Text>
        </View>
      </View>

      <View style={styles.matchFooter}>
        <Text style={styles.matchType}>{item.type} • {item.overs} Overs</Text>
        <Ionicons name="chevron-forward" size={20} color="#2196F3" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ID, name, or location..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      ) : filteredMatches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            {matches.length === 0 ? 'No live matches yet' : 'No matches found'}
          </Text>
          <Text style={styles.emptySubtext}>Check back later for live matches</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id || item.matchId}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  listContainer: {
    padding: 12,
  },
  matchCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  matchId: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  matchLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  teamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  teamScore: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 4,
  },
  vs: {
    marginHorizontal: 8,
    fontSize: 12,
    color: '#999',
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  matchType: {
    fontSize: 12,
    color: '#999',
  },
});

export default HomeScreen;