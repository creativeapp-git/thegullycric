import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { saveUserProfile, getUserProfile, isUsernameTaken } from '../services/userService';
import { AppNavigationProp, ProfileSetupRouteProp } from '../navigation/navigation.types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme';
import { Button, Card } from '../components/UI';
import { Input } from '../components/Input';
import { ProfileRefreshContext } from '../services/profileContext';

const ProfileSetupScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<ProfileSetupRouteProp>();
  const { uid } = route.params;
  const { height } = useWindowDimensions();
  const refreshProfile = useContext(ProfileRefreshContext);

  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    loadExistingProfile();
  }, []);

  const loadExistingProfile = async () => {
    try {
      const profile = await getUserProfile(uid);
      if (profile) {
        if (profile.username) {
          setUsername(profile.username);
          setOriginalUsername(profile.username);
          setUsernameAvailable(true);
        }
        if (profile.name) setName(profile.name);
      }
    } catch (e: any) {
      if (e.message === 'TIMEOUT') {
        setErrorMessage('Slow connection — existing data may not have loaded.');
      }
    } finally { setLoading(false); }
  };

  const checkUsername = async (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    if (cleaned === originalUsername) { setUsernameAvailable(true); return; }
    setUsernameAvailable(null);
    if (cleaned.length < 3) return;
    setCheckingUsername(true);
    try {
      const taken = await isUsernameTaken(cleaned);
      setUsernameAvailable(!taken);
    } catch (e) { console.error(e); } finally { setCheckingUsername(false); }
  };

  const handleSetup = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!username || username.length < 3) { setErrorMessage('Username must be at least 3 characters.'); return; }
    if (!name.trim()) { setErrorMessage('Name is required.'); return; }
    if (usernameAvailable === false) { setErrorMessage('Username is already taken.'); return; }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const profileData = {
        username: username.trim(),
        name: name.trim(),
        email: session?.user?.email || '',
      };

      await saveUserProfile(uid, profileData);
      
      const verifyProfile = await getUserProfile(uid);

      if (!verifyProfile) {
        // Timeout or network error during verify — profile was saved, safe to proceed
        setSuccessMessage('Profile saved!');
        await refreshProfile();
        return;
      }

      setSuccessMessage('Profile set up successfully!');
      
      // Trigger App.tsx to re-check profile — flips hasProfile to true,
      // which causes the conditional navigator to switch to the main App stack automatically
      await refreshProfile();
    } catch (error: any) {
      setErrorMessage(error.message || 'Setup failed. Please try again.');
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Image source={require('../../assets/app-logo.png')} style={styles.logo} />
          <Text style={styles.title}>Complete Profile</Text>
          <Text style={styles.subtitle}>Set your unique identity on GullyCric</Text>
        </View>

        <Card>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
          {successMessage ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          <Input 
            label="Username" 
            value={username} 
            onChangeText={checkUsername} 
            placeholder="cricket_pro" 
            icon="at"
            autoCapitalize="none"
            error={usernameAvailable === false ? 'Username already taken' : undefined}
          />
          <Input 
            label="Full Name" 
            value={name} 
            onChangeText={setName} 
            placeholder="John Doe" 
            icon="person-outline"
          />

          <Button 
            title="Finish Setup" 
            onPress={handleSetup} 
            loading={saving} 
            style={{ marginTop: 20 }}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 40 },
  logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.text },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '600', flex: 1 },
  successBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, marginBottom: 16, gap: 8 },
  successText: { color: COLORS.success, fontSize: 13, fontWeight: '600', flex: 1 },
});

export default ProfileSetupScreen;
