import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Switch, Modal, Linking } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { signOutUser } from '../services/authService';
import { supabase } from '../services/supabase';
import { getUserProfile, saveUserProfile } from '../services/userService';
import { User } from '../types';
import { AppNavigationProp } from '../navigation/navigation.types';

const SUPPORT_EMAIL = 'creative.app.mail@gmail.com';

const SettingsScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [profile, setProfile] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Notification preferences
  const [matchUpdates, setMatchUpdates] = useState(true);
  const [scoreAlerts, setScoreAlerts] = useState(true);
  const [appUpdates, setAppUpdates] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userProfile = await getUserProfile(session.user.id);
      if (userProfile) setProfile(userProfile);
    }
  };

  const showAlert = (title: string, msg: string) =>
    Platform.OS === 'web' ? window.alert(`${title}: ${msg}`) : Alert.alert(title, msg);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) signOutUser();
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', onPress: () => signOutUser(), style: 'destructive' }
      ]);
    }
  };

  const handleReportProblem = () => {
    const subject = encodeURIComponent('Bug Report - GullyCric App');
    const body = encodeURIComponent(`\nDescribe the problem:\n\n\nSteps to reproduce:\n1.\n2.\n3.\n\n---\nApp: GullyCric\nUser: ${profile?.username || 'N/A'}\nPlatform: ${Platform.OS}`);
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    if (Platform.OS === 'web') {
      window.open(mailto, '_blank');
    } else {
      Linking.openURL(mailto).catch(() => showAlert('Error', 'Could not open email app'));
    }
  };

  const handleFeedback = () => {
    const subject = encodeURIComponent('Feedback - GullyCric App');
    const body = encodeURIComponent(`\nYour feedback:\n\n\nSuggestions:\n\n\n---\nApp: GullyCric\nUser: ${profile?.username || 'N/A'}\nPlatform: ${Platform.OS}`);
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    if (Platform.OS === 'web') {
      window.open(mailto, '_blank');
    } else {
      Linking.openURL(mailto).catch(() => showAlert('Error', 'Could not open email app'));
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

  const renderToggle = (icon: any, title: string, value: boolean, onToggle: (v: boolean) => void) => (
    <View style={styles.optionRow}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color="#10B981" />
      </View>
      <Text style={styles.optionText}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
        thumbColor={value ? '#10B981' : '#9CA3AF'}
      />
    </View>
  );

  const initials = (profile?.name || profile?.username || 'U').charAt(0).toUpperCase();

  return (
    <View style={[styles.container, Platform.OS === 'web' && { height: '100vh' as any }]}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        bounces={false}
      >
        {/* Own Settings Header */}
        <View style={styles.settingsHeader}>
          <Ionicons name="settings-outline" size={28} color="#111827" />
          <Text style={styles.pageTitle}>Settings</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{initials}</Text>
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
          {renderOption('notifications-outline', 'Notification Settings', () => setShowNotifications(true))}
        </View>

        <Text style={styles.sectionHeader}>Support & About</Text>
        <View style={styles.optionsCard}>
          {renderOption('bug-outline', 'Report a Problem', handleReportProblem)}
          <View style={styles.divider} />
          {renderOption('chatbubble-ellipses-outline', 'Feedback', handleFeedback)}
          <View style={styles.divider} />
          {renderOption('document-text-outline', 'Terms & Privacy', () => setShowTerms(true))}
        </View>

        <Text style={styles.sectionHeader}>Account Actions</Text>
        <View style={styles.optionsCard}>
          {renderOption('log-out-outline', 'Log Out', handleLogout, true)}
        </View>

        <Text style={styles.versionText}>GullyCric v1.0.0</Text>
      </ScrollView>

      {/* Notification Settings Modal */}
      <Modal visible={showNotifications} transparent animationType="slide">
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end'}}>
          <View style={{backgroundColor:'#FFF', padding:24, borderTopLeftRadius:24, borderTopRightRadius:24}}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
              <Text style={{fontSize:20, fontWeight:'800', color:'#111827'}}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {renderToggle('football-outline', 'Match Updates', matchUpdates, setMatchUpdates)}
            <View style={styles.divider} />
            {renderToggle('stats-chart-outline', 'Score Alerts', scoreAlerts, setScoreAlerts)}
            <View style={styles.divider} />
            {renderToggle('megaphone-outline', 'App Updates', appUpdates, setAppUpdates)}
            <View style={{height: 24}} />
            <TouchableOpacity
              style={{backgroundColor:'#10B981', padding:16, borderRadius:12, alignItems:'center'}}
              onPress={() => { showAlert('Saved', 'Notification preferences updated!'); setShowNotifications(false); }}
            >
              <Text style={{color:'#FFF', fontWeight:'700', fontSize:16}}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms & Privacy Modal */}
      <Modal visible={showTerms} transparent animationType="slide">
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end'}}>
          <View style={{backgroundColor:'#FFF', padding:24, borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'85%'}}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
              <Text style={{fontSize:20, fontWeight:'800', color:'#111827'}}>Terms & Privacy</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={true} style={{flex:1}}>
              <Text style={{fontSize:16, fontWeight:'700', color:'#111827', marginBottom:8}}>Terms of Service</Text>
              <Text style={{fontSize:14, color:'#374151', lineHeight:22, marginBottom:16}}>
                By using GullyCric, you agree to use the app responsibly and in accordance with applicable laws. GullyCric is a cricket scoring and management tool designed for personal and recreational use.{'\n\n'}
                You are responsible for the accuracy of match data you enter. We reserve the right to suspend accounts that misuse our platform.{'\n\n'}
                GullyCric is provided "as is" without warranties of any kind. We are not liable for any data loss or service interruptions.
              </Text>
              <Text style={{fontSize:16, fontWeight:'700', color:'#111827', marginBottom:8}}>Privacy Policy</Text>
              <Text style={{fontSize:14, color:'#374151', lineHeight:22, marginBottom:16}}>
                We collect minimal data necessary to provide our service:{'\n\n'}
                • Account information (email, username, name){'\n'}
                • Match data you create and manage{'\n'}
                • Device information for app performance{'\n\n'}
                We do not sell your data to third parties. Your match data is stored securely using Supabase infrastructure.{'\n\n'}
                You can request account deletion by contacting us at {SUPPORT_EMAIL}.
              </Text>
              <Text style={{fontSize:16, fontWeight:'700', color:'#111827', marginBottom:8}}>Contact Us</Text>
              <Text style={{fontSize:14, color:'#374151', lineHeight:22, marginBottom:24}}>
                For questions or concerns, email us at:{'\n'}{SUPPORT_EMAIL}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  contentContainer: { padding: 24, paddingBottom: 40 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  versionText: { textAlign: 'center', color: '#9CA3AF', fontSize: 13, marginTop: 16, fontWeight: '500' },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarInitial: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  profileUsername: { fontSize: 14, color: '#6B7280', marginBottom: 2 },
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