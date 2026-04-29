import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, DeviceEventEmitter, useWindowDimensions, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { saveUserProfile, getUserProfile, isUsernameTaken, isPhoneNumberTaken } from '../services/userService';
import { AppNavigationProp, ProfileSetupRouteProp } from '../navigation/navigation.types';

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const checkUsername = async (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);

    if (cleaned === originalUsername) {
      setUsernameAvailable(true);
      return;
    }

    setUsernameAvailable(null);
    if (cleaned.length < 3) return;

    setCheckingUsername(true);
    try {
      const taken = await isUsernameTaken(cleaned);
      setUsernameAvailable(!taken);
    } catch (error) {
      console.error('Error checking username:', error);
    } finally {
      setCheckingUsername(false);
    }
  };

  const checkPhoneNumber = async (value: string) => {
    const cleaned = value.replace(/[^0-9+]/g, '');
    setPhoneNumber(cleaned);
    setPhoneAvailable(null);

    if (cleaned.length < 10) return;

    setCheckingPhone(true);
    try {
      const formattedNumber = cleaned.startsWith('+') ? cleaned : `+91${cleaned}`;
      const taken = await isPhoneNumberTaken(formattedNumber);
      setPhoneAvailable(!taken);
    } catch (error) {
      console.error('Error checking phone:', error);
    } finally {
      setCheckingPhone(false);
    }
  };

  const handleSetup = async () => {
    if (!username || username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    if (usernameAvailable === false) {
      Alert.alert('Error', 'This username is already taken. Please choose another.');
      return;
    }
    if (phoneAvailable === false) {
      Alert.alert('Error', 'This phone number is already registered.');
      return;
    }

    setSaving(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

      if (username !== originalUsername) {
        const userTaken = await isUsernameTaken(username);
        if (userTaken) {
          Alert.alert('Error', 'This username was just taken. Please choose another.');
          setUsernameAvailable(false);
          setSaving(false);
          return;
        }
      }
      const phoneTaken = await isPhoneNumberTaken(formattedPhone);
      if (phoneTaken) {
        Alert.alert('Error', 'This phone number was just registered.');
        setPhoneAvailable(false);
        setSaving(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      await saveUserProfile(uid, {
        username,
        name: name.trim(),
        phoneNumber: formattedPhone,

        email: session?.user?.email || '',
      });
      DeviceEventEmitter.emit('profileUpdated');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set up profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const content = (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.headerSection}>
        <View style={styles.logoCircle}>
          <Image source={require('../../assets/app-logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Welcome Aboard!</Text>
        <Text style={styles.subtitle}>Let's get your profile set up</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Choose Username</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.prefix}>@</Text>
          <TextInput
            style={styles.inputField}
            placeholder="username"
            value={username}
            onChangeText={checkUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            placeholderTextColor="#9CA3AF"
          />
          {checkingUsername && <ActivityIndicator size="small" color="#9CA3AF" style={styles.statusIcon} />}
          {!checkingUsername && usernameAvailable === true && <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.statusIcon} />}
          {!checkingUsername && usernameAvailable === false && <Ionicons name="close-circle" size={24} color="#EF4444" style={styles.statusIcon} />}
        </View>
        {usernameAvailable === false && <Text style={styles.errorHint}>This username is taken</Text>}

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="John Doe"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.inputField}
            placeholder="9999999999"
            value={phoneNumber}
            onChangeText={checkPhoneNumber}
            keyboardType="phone-pad"
            maxLength={10}
            placeholderTextColor="#9CA3AF"
          />
          {checkingPhone && <ActivityIndicator size="small" color="#9CA3AF" style={styles.statusIcon} />}
          {!checkingPhone && phoneAvailable === true && <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.statusIcon} />}
          {!checkingPhone && phoneAvailable === false && <Ionicons name="close-circle" size={24} color="#EF4444" style={styles.statusIcon} />}
        </View>
        {phoneAvailable === false && <Text style={styles.errorHint}>This number is already registered</Text>}
      </View>

      <TouchableOpacity
        style={[styles.button, saving && styles.disabledButton]}
        onPress={handleSetup}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Complete Setup</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { height }]}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContainer: { flex: 1 },
  contentContainer: { padding: 24, paddingBottom: 60, flexGrow: 1 },
  headerSection: { alignItems: 'center', marginBottom: 32, marginTop: 40 },
  logoCircle: { width: 100, height: 100, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  logoImage: { width: 70, height: 70 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, overflow: 'hidden' },
  prefix: { fontSize: 16, fontWeight: '600', color: '#111827', paddingHorizontal: 16, paddingVertical: 16, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  inputField: { flex: 1, fontSize: 16, paddingHorizontal: 16, paddingVertical: 16, color: '#111827' },
  statusIcon: { marginRight: 16 },
  errorHint: { color: '#EF4444', fontSize: 13, marginTop: 6, marginLeft: 8 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#111827' },
  button: { backgroundColor: '#10B981', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
});

export default ProfileSetupScreen;
