import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { signOutUser } from '../services/authService';
import { auth } from '../services/firebase';
import { getUserProfile } from '../services/userService';
import { User } from '../types';
import Header from '../components/Header';
import { AppNavigationProp } from '../navigation/navigation.types';

const SettingsScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [profile, setProfile] = useState<User | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    if (auth.currentUser) {
      const userProfile = await getUserProfile(auth.currentUser.uid);
      if (userProfile) {
        setProfile(userProfile);
      }
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
        if (window.confirm('Are you sure you want to log out?')) {
        signOutUser();
      }
    } else {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Log Out', onPress: () => signOutUser(), style: 'destructive' }
        ]
      );
    }
  };

  const renderOption = (icon: any, title: string, onPress: () => void, isDestructive = false) => (
    <TouchableOpacity style={styles.optionRow} onPress={onPress}>
      <View style={[styles.iconContainer, isDestructive && { backgroundColor: '#FEE2E2' }]}>
        <Ionicons name={icon} size={20} color={isDestructive ? '#EF4444' : '#10B981'} />
      </View>
      <Text style={[styles.optionText, isDestructive && { color: '#EF4444' }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, Platform.OS === 'web' && { height: '100vh' as any, overflow: 'hidden' as any }]}>
      <Header />
      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Account Settings</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color="#10B981" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.name || 'Loading...'}</Text>
              <Text style={styles.profileUsername}>@{profile?.username || 'user'}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Preferences</Text>
        <View style={styles.optionsCard}>
          {renderOption('notifications-outline', 'Notification Settings', () => {})}
        </View>

        <Text style={styles.sectionHeader}>Support & About</Text>
        <View style={styles.optionsCard}>
          {renderOption('bug-outline', 'Report a Problem', () => {})}
          <View style={styles.divider} />
          {renderOption('chatbubble-ellipses-outline', 'Feedback', () => {})}
          <View style={styles.divider} />
          {renderOption('document-text-outline', 'Terms & Privacy', () => {})}
        </View>

        <Text style={styles.sectionHeader}>Account Actions</Text>
        <View style={styles.optionsCard}>
          {renderOption('log-out-outline', 'Log Out', handleLogout, true)}
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  contentContainer: { padding: 24, paddingBottom: 40 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 24, letterSpacing: -0.5 },
  
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  profileUsername: { fontSize: 14, color: '#6B7280', marginBottom: 2 },
  profilePhone: { fontSize: 14, color: '#9CA3AF' },
  editButton: { backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  editButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  
  sectionHeader: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12, marginLeft: 8 },
  optionsCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 8, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  optionText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1F2937' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 68 },
});

export default SettingsScreen;