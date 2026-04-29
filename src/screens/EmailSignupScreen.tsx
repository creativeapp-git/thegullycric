import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { signUpWithEmail, signInWithGoogleWeb } from '../services/authService';
import { supabase } from '../services/supabase';
import { AppNavigationProp } from '../navigation/navigation.types';

const EmailSignupScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);



  const handleGoogleSignup = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Notice', 'Google Sign-In is currently only supported on the web version.');
      return;
    }
    
    setLoading(true);
    try {
      await signInWithGoogleWeb();
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        window.alert('Failed to sign up with Google. ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSignup = async () => {
    if (!email || !email.includes('@')) {
      showAlert('Error', 'Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      setVerificationSent(true);
    } catch (error: any) {
      let msg = 'Failed to create account';
      if (error.code === 'auth/email-already-in-use') {
        msg = 'This email is already in use.';
      }
      showAlert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
      showAlert('Sent', 'Verification email resent.');
    } catch (e) {
      showAlert('Error', 'Failed to resend email. Try again later.');
    }
  };

  const content = (
    <ScrollView 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSection}>
        <View style={styles.logoCircle}>
          <Image source={require('../../assets/app-logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the GullyCric community</Text>
      </View>

      {!verificationSent ? (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="john@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, loading && styles.disabledButton]}
            onPress={handleGoogleSignup}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="#1F2937" style={styles.googleIcon} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.createAccountContainer} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.createAccountText}>Already have an account? <Text style={styles.createAccountBold}>Log In</Text></Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
          <View style={[styles.iconCircle, { width: 100, height: 100, borderRadius: 50, marginBottom: 24 }]}>
            <Ionicons name="mail-open" size={48} color="#10B981" />
          </View>
          <Text style={[styles.title, { fontSize: 24, marginBottom: 16 }]}>Verify Your Email</Text>
          <Text style={styles.verificationText}>
            We've sent a secure link to <Text style={{fontWeight: '700', color: '#111827'}}>{email}</Text>. 
            Please check your inbox and click the link to verify your account.
          </Text>
          
          <ActivityIndicator color="#10B981" size="large" style={{ marginVertical: 32 }} />

          <TouchableOpacity style={styles.secondaryButton} onPress={handleResend}>
            <Text style={styles.secondaryButtonText}>Resend Email</Text>
          </TouchableOpacity>
        </View>
      )}
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
  contentContainer: { padding: 24, paddingBottom: 60, flexGrow: 1, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 100, height: 100, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  logoImage: { width: 70, height: 70 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2, marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  inputField: { flex: 1, height: 56, fontSize: 16, color: '#111827' },
  button: { backgroundColor: '#10B981', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', paddingHorizontal: 16, fontSize: 14, fontWeight: '600' },
  
  googleButton: { flexDirection: 'row', backgroundColor: '#FFFFFF', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  googleIcon: { marginRight: 12 },
  googleButtonText: { color: '#1F2937', fontSize: 16, fontWeight: '700' },
  
  secondaryButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16, backgroundColor: '#F3F4F6' },
  secondaryButtonText: { color: '#4B5563', fontSize: 16, fontWeight: '600' },
  createAccountContainer: { alignItems: 'center', paddingVertical: 12 },
  createAccountText: { color: '#6B7280', fontSize: 15, fontWeight: '500' },
  createAccountBold: { color: '#10B981', fontWeight: '700' },
  iconCircle: { backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  verificationText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 24, paddingHorizontal: 16 },
});

export default EmailSignupScreen;
