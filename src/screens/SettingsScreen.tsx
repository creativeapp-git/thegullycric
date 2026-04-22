import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../services/firebase';
import { signOutUser } from '../services/authService';
import Header from '../components/Header';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleProfile = () => {
    Alert.alert('Profile', 'Edit profile coming soon.');
  };

  const handlePrivacy = () => {
    Alert.alert('Privacy', 'Privacy settings coming soon.');
  };

  const handleTheme = () => {
    Alert.alert('Theme', 'Theme selection coming soon.');
  };

  const handleAbout = () => {
    Alert.alert(
      'About GullyCric',
      'GullyCric is your ultimate companion for organizing and tracking gully cricket matches. Create matches, track scores, and connect with fellow cricket enthusiasts!\n\nVersion 1.0.0\nDeveloped with ❤️ for cricket lovers',
      [{ text: 'OK' }]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: async () => {
            setLoading(true);
            try {
              await signOutUser();
              // Auth state will change, navigation handled by App.tsx
            } catch (error: any) {
              console.error('Sign out error:', error);
              Alert.alert('Error', error.message || 'Failed to sign out');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const userEmail = auth.currentUser?.email || 'Not logged in';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Header showGreeting={false} />
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={60} color="#2196F3" />
        </View>
        <Text style={styles.userEmail}>{userEmail}</Text>
        <Text style={styles.subtitle}>Gully Cricket Player</Text>
      </View>

      <Text style={styles.sectionTitle}>Preferences</Text>
      <TouchableOpacity style={styles.option} onPress={handleProfile}>
        <View style={styles.optionContent}>
          <Ionicons name="person" size={20} color="#2196F3" />
          <Text style={styles.optionText}>Profile</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={handleTheme}>
        <View style={styles.optionContent}>
          <Ionicons name="color-palette" size={20} color="#4CAF50" />
          <Text style={styles.optionText}>Theme</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.option} onPress={handlePrivacy}>
        <View style={styles.optionContent}>
          <Ionicons name="shield" size={20} color="#FF9800" />
          <Text style={styles.optionText}>Privacy & Security</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Support</Text>
      <TouchableOpacity style={styles.option} onPress={handleAbout}>
        <View style={styles.optionContent}>
          <Ionicons name="information-circle" size={20} color="#9C27B0" />
          <Text style={styles.optionText}>About</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Account</Text>
      <TouchableOpacity style={[styles.option, styles.signOutOption]} onPress={handleSignOut} disabled={loading}>
        <View style={styles.optionContent}>
          <Ionicons name="log-out" size={20} color="#f44336" />
          <Text style={[styles.optionText, styles.signOutText]}>
            {loading ? 'Signing Out...' : 'Sign Out'}
          </Text>
        </View>
        {!loading && <Ionicons name="chevron-forward" size={20} color="#f44336" />}
        {loading && <ActivityIndicator size="small" color="#f44336" />}
      </TouchableOpacity>

      <Text style={styles.footerText}>Version 1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 8,
    borderBottomColor: '#f5f5f5',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
    marginLeft: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  signOutOption: {
    backgroundColor: '#fff',
  },
  signOutText: {
    color: '#f44336',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
    paddingBottom: 20,
  },
});

export default SettingsScreen;