import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { getUserProfile, updateUserProfile, isUsernameTaken } from '../services/userService';
import { User } from '../types';
import { AppNavigationProp } from '../navigation/navigation.types';

const EditProfileScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [profile, setProfile] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [originalUsername, setOriginalUsername] = useState('');
  
  const [editsCount, setEditsCount] = useState(0);
  const [canEdit, setCanEdit] = useState(true);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      if (auth.currentUser) {
        const userProfile = await getUserProfile(auth.currentUser.uid);
        if (userProfile) {
          setProfile(userProfile);
          setName(userProfile.name || '');
          setUsername(userProfile.username || '');
          setOriginalUsername(userProfile.username || '');
          
          const currentMonth = new Date().toISOString().slice(0, 7);
          const profileEdits = userProfile.profileEdits;
          
          if (profileEdits && profileEdits.month === currentMonth) {
            setEditsCount(profileEdits.count);
            if (profileEdits.count >= 4) {
              setCanEdit(false);
            }
          } else {
            setEditsCount(0);
            setCanEdit(true);
          }
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUsername = async (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);

    if (cleaned === originalUsername) {
      setUsernameAvailable(null);
      return;
    }

    if (cleaned.length < 3) {
      setUsernameAvailable(null);
      return;
    }

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

  const handleSave = async () => {
    if (!canEdit) {
      showAlert('Error', 'You have exceeded the maximum of 4 profile edits this month.');
      return;
    }
    if (!name.trim()) {
      showAlert('Error', 'Name cannot be empty');
      return;
    }
    if (!username || username.length < 3) {
      showAlert('Error', 'Username must be at least 3 characters');
      return;
    }
    if (username !== originalUsername && usernameAvailable === false) {
      showAlert('Error', 'This username is already taken');
      return;
    }

    if (!auth.currentUser) return;

    setSaving(true);
    try {
      if (username !== originalUsername) {
        const taken = await isUsernameTaken(username);
        if (taken) {
          showAlert('Error', 'This username was just taken. Please choose another.');
          setUsernameAvailable(false);
          setSaving(false);
          return;
        }
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      
      await updateUserProfile(auth.currentUser.uid, {
        name: name.trim(),
        username,
        profileEdits: {
          count: editsCount + 1,
          month: currentMonth
        }
      });

      showAlert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update profile');
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
      contentContainerStyle={styles.contentContainer}
      style={[styles.scrollContainer, Platform.OS === 'web' && { height: '100%' }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={48} color="#10B981" />
        </View>
        <Text style={styles.phoneDisplay}>
          {profile?.phoneNumber || 'No phone'}
        </Text>
        
        <View style={styles.limitsBadge}>
          <Ionicons name="information-circle" size={16} color="#F59E0B" />
          <Text style={styles.limitsText}>
            {4 - editsCount} edits remaining this month
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.prefix}>@</Text>
          <TextInput
            style={styles.inputField}
            value={username}
            onChangeText={checkUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            editable={canEdit}
            placeholderTextColor="#9CA3AF"
          />
          {checkingUsername && <ActivityIndicator size="small" color="#9CA3AF" style={styles.statusIcon} />}
          {!checkingUsername && usernameAvailable === true && <Ionicons name="checkmark-circle" size={24} color="#10B981" style={styles.statusIcon} />}
          {!checkingUsername && usernameAvailable === false && <Ionicons name="close-circle" size={24} color="#EF4444" style={styles.statusIcon} />}
        </View>
        {usernameAvailable === false && <Text style={styles.errorHint}>Username is taken</Text>}

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          editable={canEdit}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {!canEdit && (
        <Text style={styles.blockedText}>
          You have reached your limit of 4 profile updates for this month. You can edit your profile again next month.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.saveButton, (!canEdit || saving) && styles.disabledButton]}
        onPress={handleSave}
        disabled={!canEdit || saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={[styles.container, Platform.OS === 'web' && { height: '100vh' as any, overflow: 'hidden' as any }]}>
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
  contentContainer: { padding: 24, paddingBottom: 120, flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, marginTop: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  phoneDisplay: { fontSize: 16, color: '#6B7280', marginBottom: 12, fontWeight: '500' },
  limitsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  limitsText: { fontSize: 14, color: '#D97706', fontWeight: '700', marginLeft: 6 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, overflow: 'hidden' },
  prefix: { fontSize: 16, fontWeight: '600', color: '#111827', paddingHorizontal: 16, paddingVertical: 16, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  inputField: { flex: 1, fontSize: 16, paddingHorizontal: 16, paddingVertical: 16, color: '#111827' },
  statusIcon: { marginRight: 16 },
  errorHint: { color: '#EF4444', fontSize: 13, marginTop: 6, marginLeft: 8 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#111827' },
  blockedText: { color: '#EF4444', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  saveButton: { backgroundColor: '#10B981', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
});

export default EditProfileScreen;
