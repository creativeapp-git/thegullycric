import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';

interface HeaderProps {
  showGreeting?: boolean;
}

const Header: React.FC<HeaderProps> = ({ showGreeting = true }) => {
  const user = auth.currentUser;
  const userName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Ionicons name="football" size={32} color="#4CAF50" />
        <Text style={styles.logoText}>GullyCric</Text>
      </View>
      {showGreeting && (
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>Hello there, {userName}!</Text>
          <Ionicons name="hand-left" size={20} color="#4CAF50" style={styles.waveIcon} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 8,
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  greeting: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
  },
  waveIcon: {
    transform: [{ rotate: '-20deg' }],
  },
});

export default Header;