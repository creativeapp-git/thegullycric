import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Switch, Modal, Linking } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { signOutUser } from '../services/authService';
import { supabase } from '../services/supabase';
import { getUserProfile, saveUserProfile } from '../services/userService';
import { User } from '../types';
import { AppNavigationProp } from '../navigation/navigation.types';
import { usePWA } from '../context/PWAContext';
import { COLORS, SHADOWS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../theme';

const SUPPORT_EMAIL = 'creative.app.mail@gmail.com';

const SettingsScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { isInstallable, promptInstall, isInstalled } = usePWA();
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
      <View style={[styles.iconContainer, isDestructive && { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
        <Ionicons name={icon} size={20} color={isDestructive ? COLORS.danger : COLORS.primary} />
      </View>
      <Text style={[styles.optionText, isDestructive && { color: COLORS.danger }]}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const renderToggle = (icon: any, title: string, value: boolean, onToggle: (v: boolean) => void) => (
    <View style={styles.optionRow}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={COLORS.primary} />
      </View>
      <Text style={styles.optionText}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: 'rgba(16,185,129,0.4)' }}
        thumbColor={value ? COLORS.primary : COLORS.textSecondary}
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
          <Ionicons name="settings-outline" size={28} color={COLORS.primary} />
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

        {isInstallable && !isInstalled && (
          <View style={{ marginBottom: SPACING.xl }}>
            <Text style={styles.sectionHeader}>App</Text>
            <TouchableOpacity 
              style={[styles.optionsCard, { borderColor: COLORS.primary, borderWidth: 1.5, backgroundColor: 'rgba(16,185,129,0.05)' }]} 
              onPress={promptInstall}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                  <Ionicons name="download-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionText, { fontWeight: TYPOGRAPHY.weights.heavy, color: COLORS.primary }]}>Install App</Text>
                  <Text style={{ fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textSecondary, marginTop: 2 }}>Install for faster access & full-screen experience</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}

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
        <View style={{flex:1, backgroundColor:'rgba(11,15,25,0.8)', justifyContent:'flex-end'}}>
          <View style={{backgroundColor:COLORS.cardElevated, padding:SPACING.xl, borderTopLeftRadius:BORDER_RADIUS.xl, borderTopRightRadius:BORDER_RADIUS.xl, borderWidth:1, borderColor:COLORS.borderLight}}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:SPACING.xl}}>
              <Text style={{fontSize:TYPOGRAPHY.sizes.xl, fontWeight:TYPOGRAPHY.weights.heavy, color:COLORS.text}}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {renderToggle('football-outline', 'Match Updates', matchUpdates, setMatchUpdates)}
            <View style={styles.divider} />
            {renderToggle('stats-chart-outline', 'Score Alerts', scoreAlerts, setScoreAlerts)}
            <View style={styles.divider} />
            {renderToggle('megaphone-outline', 'App Updates', appUpdates, setAppUpdates)}
            <View style={{height: SPACING.xl}} />
            <TouchableOpacity
              style={{backgroundColor:COLORS.primary, padding:SPACING.lg, borderRadius:BORDER_RADIUS.lg, alignItems:'center', ...SHADOWS.glowPrimary}}
              onPress={() => { showAlert('Saved', 'Notification preferences updated!'); setShowNotifications(false); }}
            >
              <Text style={{color:COLORS.white, fontWeight:TYPOGRAPHY.weights.bold, fontSize:TYPOGRAPHY.sizes.md}}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Terms & Privacy Modal */}
      <Modal visible={showTerms} transparent animationType="slide">
        <View style={{flex:1, backgroundColor:'rgba(11,15,25,0.8)', justifyContent:'flex-end'}}>
          <View style={{backgroundColor:COLORS.cardElevated, padding:SPACING.xl, borderTopLeftRadius:BORDER_RADIUS.xl, borderTopRightRadius:BORDER_RADIUS.xl, maxHeight:'85%', borderWidth:1, borderColor:COLORS.borderLight}}>
            <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:SPACING.lg}}>
              <Text style={{fontSize:TYPOGRAPHY.sizes.xl, fontWeight:TYPOGRAPHY.weights.heavy, color:COLORS.text}}>Terms & Privacy</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={true} style={{flex:1}}>
              <Text style={{fontSize:TYPOGRAPHY.sizes.md, fontWeight:TYPOGRAPHY.weights.bold, color:COLORS.text, marginBottom:SPACING.sm}}>Terms of Service</Text>
              <Text style={{fontSize:TYPOGRAPHY.sizes.sm, color:COLORS.textSecondary, lineHeight:22, marginBottom:SPACING.lg}}>
                By using GullyCric, you agree to use the app responsibly and in accordance with applicable laws. GullyCric is a cricket scoring and management tool designed for personal and recreational use.{'\n\n'}
                You are responsible for the accuracy of match data you enter. We reserve the right to suspend accounts that misuse our platform.{'\n\n'}
                GullyCric is provided "as is" without warranties of any kind. We are not liable for any data loss or service interruptions.
              </Text>
              <Text style={{fontSize:TYPOGRAPHY.sizes.md, fontWeight:TYPOGRAPHY.weights.bold, color:COLORS.text, marginBottom:SPACING.sm}}>Privacy Policy</Text>
              <Text style={{fontSize:TYPOGRAPHY.sizes.sm, color:COLORS.textSecondary, lineHeight:22, marginBottom:SPACING.lg}}>
                We collect minimal data necessary to provide our service:{'\n\n'}
                • Account information (email, username, name){'\n'}
                • Match data you create and manage{'\n'}
                • Device information for app performance{'\n\n'}
                We do not sell your data to third parties. Your match data is stored securely using Supabase infrastructure.{'\n\n'}
                You can request account deletion by contacting us at {SUPPORT_EMAIL}.
              </Text>
              <Text style={{fontSize:TYPOGRAPHY.sizes.md, fontWeight:TYPOGRAPHY.weights.bold, color:COLORS.text, marginBottom:SPACING.sm}}>Contact Us</Text>
              <Text style={{fontSize:TYPOGRAPHY.sizes.sm, color:COLORS.textSecondary, lineHeight:22, marginBottom:SPACING.xl}}>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { padding: SPACING.xl, paddingBottom: 40 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: SPACING.xl },
  pageTitle: { fontSize: TYPOGRAPHY.sizes.xxxl, fontWeight: TYPOGRAPHY.weights.heavy, color: COLORS.text, letterSpacing: -0.5 },
  versionText: { textAlign: 'center', color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, marginTop: SPACING.lg, fontWeight: TYPOGRAPHY.weights.medium },
  profileCard: { backgroundColor: COLORS.cardElevated, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.xxl, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.medium },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.lg },
  avatarInitial: { fontSize: TYPOGRAPHY.sizes.xxl, fontWeight: TYPOGRAPHY.weights.heavy, color: COLORS.white },
  profileInfo: { flex: 1 },
  profileName: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.text, marginBottom: 4 },
  profileUsername: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, marginBottom: 2 },
  editButton: { backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', ...SHADOWS.glowPrimary },
  editButtonText: { color: COLORS.white, fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.semibold },
  sectionHeader: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.heavy, color: COLORS.textSecondary, marginBottom: SPACING.md, marginLeft: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  optionsCard: { backgroundColor: COLORS.cardElevated, borderRadius: BORDER_RADIUS.xl, padding: SPACING.sm, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.small },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md },
  iconContainer: { width: 40, height: 40, borderRadius: BORDER_RADIUS.md, backgroundColor: 'rgba(16,185,129,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.lg },
  optionText: { flex: 1, fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.medium, color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 68 },
});

export default SettingsScreen;