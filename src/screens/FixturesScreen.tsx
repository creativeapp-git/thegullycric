import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getFixtures, searchMatches, Match } from '../services/matchService';
import Header from '../components/Header';

const FixturesScreen = () => {
  const navigation = useNavigation();
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
      setFixtures(scheduledMatches);
      setFilteredFixtures(scheduledMatches);
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
    <TouchableOpacity
      style={styles.fixtureCard}
      onPress={() => navigation.navigate('MatchDetail' as never, { matchId: item.id } as never)}
    >
      <View style={styles.fixtureHeader}>
        <View>
          <Text style={styles.fixtureId}>ID: {item.matchId}</Text>
          <Text style={styles.fixtureName}>{item.name}</Text>
          <Text style={styles.fixtureLocation}>{item.location}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.teamsRow}>
        <View style={styles.teamScore}>
          <Text style={styles.teamName}>{item.team1}</Text>
        </View>
        <Text style={styles.vs}>vs</Text>
        <View style={styles.teamScore}>
          <Text style={styles.teamName}>{item.team2}</Text>
        </View>
      </View>

      <View style={styles.fixtureFooter}>
        <Text style={styles.fixtureDate}>{item.date} • {item.time}</Text>
        <Ionicons name="chevron-forward" size={20} color="#FF9800" />
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
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={styles.loadingText}>Loading fixtures...</Text>
        </View>
      ) : filteredFixtures.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            {fixtures.length === 0 ? 'No scheduled matches' : 'No fixtures found'}
          </Text>
          <Text style={styles.emptySubtext}>Check back for upcoming matches</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFixtures}
          renderItem={renderFixture}
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
  fixtureCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  fixtureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fixtureId: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  fixtureName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  fixtureLocation: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
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
  vs: {
    marginHorizontal: 8,
    fontSize: 12,
    color: '#999',
  },
  fixtureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  fixtureDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default FixturesScreen;