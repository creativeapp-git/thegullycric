import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../services/firebase';
import { createMatch } from '../services/matchService';
import { Match } from '../services/matchService';

const CreateMatchScreen = () => {
  const navigation = useNavigation();
  const [matchName, setMatchName] = useState('');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [location, setLocation] = useState('');
  const [matchType, setMatchType] = useState<'Test' | 'ODI' | 'T20' | 'Gully'>('Gully');
  const [overs, setOvers] = useState('20');
  const [powerPlay, setPowerPlay] = useState(true);
  const [bouncerLimit, setBouncerLimit] = useState(false);
  const [wideLimit, setWideLimit] = useState(false);
  const [ballByBall, setBallByBall] = useState(true);
  const [loading, setLoading] = useState(false);

  const generateMatchId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreate = async () => {
    if (!matchName || !team1 || !team2 || !location) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to create a match');
      return;
    }

    setLoading(true);
    try {
      const matchId = generateMatchId();
      const match: Match = {
        matchId,
        name: matchName,
        type: matchType,
        overs: parseInt(overs) || 20,
        location,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        team1,
        team2,
        status: 'Scheduled',
        createdBy: auth.currentUser.uid,
        rules: {
          powerPlay,
          bouncerLimit,
          wideLimit,
          ballByBall,
        },
      };

      await createMatch(match);
      Alert.alert('Success', `Match created!\nID: ${matchId}`);
      navigation.goBack();
    } catch (error: any) {
      console.error('Error creating match:', error);
      Alert.alert('Error', error.message || 'Failed to create match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Create Match</Text>

      <Text style={styles.sectionTitle}>Match Info</Text>
      <TextInput
        style={styles.input}
        placeholder="Match Name *"
        value={matchName}
        onChangeText={setMatchName}
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Location *"
        value={location}
        onChangeText={setLocation}
        placeholderTextColor="#999"
      />

      <Text style={styles.sectionTitle}>Teams</Text>
      <TextInput
        style={styles.input}
        placeholder="Team 1 Name *"
        value={team1}
        onChangeText={setTeam1}
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Team 2 Name *"
        value={team2}
        onChangeText={setTeam2}
        placeholderTextColor="#999"
      />

      <Text style={styles.sectionTitle}>Match Format</Text>
      <View style={styles.typeRow}>
        {['Test', 'ODI', 'T20', 'Gully'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeButton, matchType === type && styles.selected]}
            onPress={() => setMatchType(type as any)}
          >
            <Text style={[styles.typeText, matchType === type && styles.selectedText]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Overs"
        value={overs}
        onChangeText={setOvers}
        keyboardType="numeric"
        placeholderTextColor="#999"
      />

      <Text style={styles.sectionTitle}>Rules</Text>
      <View style={styles.ruleRow}>
        <Text style={styles.ruleText}>Power Play</Text>
        <Switch value={powerPlay} onValueChange={setPowerPlay} />
      </View>
      <View style={styles.ruleRow}>
        <Text style={styles.ruleText}>Bouncer Limit</Text>
        <Switch value={bouncerLimit} onValueChange={setBouncerLimit} />
      </View>
      <View style={styles.ruleRow}>
        <Text style={styles.ruleText}>Wide Limit</Text>
        <Switch value={wideLimit} onValueChange={setWideLimit} />
      </View>
      <View style={styles.ruleRow}>
        <Text style={styles.ruleText}>Ball by Ball Tracking</Text>
        <Switch value={ballByBall} onValueChange={setBallByBall} />
      </View>

      <TouchableOpacity
        style={[styles.createButton, loading && styles.disabledButton]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Create Match</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  backButton: {
    marginBottom: 10,
  },
  backText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 10,
  },
  input: {
    height: 44,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#333',
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  typeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  selected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  typeText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedText: {
    color: '#fff',
  },
  ruleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  createButton: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 30,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateMatchScreen;