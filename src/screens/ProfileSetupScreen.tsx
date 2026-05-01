import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, DeviceEventEmitter, useWindowDimensions, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { saveUserProfile, getUserProfile, isUsernameTaken, isPhoneNumberTaken } from '../services/userService';
import { AppNavigationProp, ProfileSetupRouteProp } from '../navigation/navigation.types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../theme';
import { Button, Card } from '../components/UI';
import { Input } from '../components/Input';

const ProfileSetupScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<ProfileSetupRouteProp>();
  const { uid } = route.params;
  const { height } = useWindowDimensions();

  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [phoneAvailable, setPhoneAvailable] = useState<boolean | null>(null);
  const [checkingPhone, setCheckingPhone] = useState(false);

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
    } catch (e) { console.error(e); } finally { setLoading(false); }
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
    if (!username || username.length < 3) { Alert.alert('Error', 'Username too short'); return; }
    if (!name.trim()) { Alert.alert('Error', 'Name required'); return; }
    if (usernameAvailable === false) { Alert.alert('Error', 'Username taken'); return; }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const profileData = {
        username: username.trim(),
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        email: session?.user?.email || '',
      };

      await saveUserProfile(uid, profileData);
      DeviceEventEmitter.emit('profileUpdated');
      
      if (Platform.OS === 'web') window.alert('Profile set up!');
      else Alert.alert('Success', 'Profile set up!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Setup failed');
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
          <Input 
            label="Phone Number (Optional)" 
            value={phoneNumber} 
            onChangeText={setPhoneNumber} 
            placeholder="9999999999" 
            icon="call-outline"
            keyboardType="phone-pad"
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
});

export default ProfileSetupScreen;
