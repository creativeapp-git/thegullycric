import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { getUserMatches, Match } from '../services/matchService';
import Header from '../components/Header';

const MySpaceScreen = () => {
  const navigation = useNavigation();
  const [userMatches, setUserMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (auth.currentUser) {
        fetchUserMatches();
      }
    }, [])
  );

  const fetchUserMatches = async () => {
    try {
      setLoading(true);
      if (auth.currentUser) {
        const matches = await getUserMatches(auth.currentUser.uid);
        setUserMatches(matches);
      }
    } catch (error) {
      console.error('Error fetching user matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserMatches();
    setRefreshing(false);
  };

  const createMatch = () => {
    navigation.navigate('CreateMatch' as never);
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
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'Live' ? '#FF5722' : item.status === 'Completed' ? '#4CAF50' : '#2196F3' }]}>
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

      <View style={styles.matchFooter}>
        <Text style={styles.matchType}>{item.type} • {item.overs} Overs</Text>
        <Ionicons name="chevron-forward" size={20} color="#2196F3" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header />
      <TouchableOpacity style={styles.createButton} onPress={createMatch}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Create Match</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading your matches...</Text>
        </View>
      ) : userMatches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="create-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No matches created yet</Text>
          <Text style={styles.emptySubtext}>Create your first match to get started</Text>
        </View>
      ) : (
        <FlatList
          data={userMatches}
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
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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

export default MySpaceScreen;