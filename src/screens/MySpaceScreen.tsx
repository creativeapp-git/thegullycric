import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { getUserMatches, deleteMatch } from '../services/matchService';
import { Match } from '../types';
import Header from '../components/Header';
import MatchCard from '../components/MatchCard';
import { SkeletonMatchList } from '../components/SkeletonLoader';
import { AppNavigationProp } from '../navigation/navigation.types';

const MySpaceScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
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
        setUserMatches(matches.filter(m => !m.isDeleted));
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
    navigation.navigate('CreateMatch');
  };

  const handleDelete = (matchId: string) => {
    const confirmDelete = () => {
      deleteMatch(matchId).then(() => {
        fetchUserMatches();
      }).catch(e => {
        if (Platform.OS === 'web') window.alert('Failed to delete');
      });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this match? It will be removed from your space.')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Delete Match', 'Are you sure you want to delete this match?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  const renderMatchWithDelete = ({ item }: { item: Match }) => (
    <View style={{ marginBottom: 8 }}>
      <MatchCard
        match={item}
        onPress={() => navigation.navigate('MatchDetail', { matchId: item.id || item.matchId })}
      />
      <TouchableOpacity 
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id || item.matchId)}
      >
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header />
      
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.createButton} onPress={createMatch}>
          <Ionicons name="add-circle" size={24} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create New Match</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={{ paddingHorizontal: 20 }}><SkeletonMatchList count={3} /></View>
      ) : userMatches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={{fontSize: 40}}>🏟️</Text>
          </View>
          <Text style={styles.emptyText}>No matches created yet</Text>
          <Text style={styles.emptySubtext}>Host your first match and it will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={userMatches}
          renderItem={renderMatchWithDelete}
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
  actionContainer: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  createButton: { backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  createButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  listContainer: { padding: 20, paddingBottom: 100 },
  deleteBtn: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtext: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
});

export default MySpaceScreen;