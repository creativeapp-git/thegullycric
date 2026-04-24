import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithUsernameOrEmail, signInWithGoogleWeb } from '../services/authService';
import { AppNavigationProp } from '../navigation/navigation.types';

const LoginScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { height } = useWindowDimensions();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      if (Platform.OS === 'web') {
        window.alert('Please enter both username/email and password');
      } else {
        Alert.alert('Error', 'Please enter both username/email and password');
      }
      return;
    }

    setLoading(true);
    try {
      await signInWithUsernameOrEmail(identifier.trim(), password);
    } catch (error: any) {
      let msg = 'Failed to sign in. Please check your credentials.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = 'Invalid username/email or password.';
      }
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Notice', 'Google Sign-In is currently only supported on the web version.');
      return;
    }
    
    setLoading(true);
    try {
      await signInWithGoogleWeb();
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        window.alert('Failed to sign in with Google. ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (Platform.OS === 'web') {
      window.alert('Password reset link will be sent to your registered email.');
    } else {
      Alert.alert('Forgot Password', 'Password reset link will be sent to your registered email.');
    }
  };

  const content = (
    <View style={styles.content}>
      <View style={styles.headerSection}>
        <View style={styles.logoCircle}>
          <Image source={require('../../assets/app-logo.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Sign in to continue scoring</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email or Username</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="john@example.com"
            value={identifier}
            onChangeText={setIdentifier}
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

        <View style={styles.linksRow}>
          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <Text style={styles.linkText}>Remember me</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.googleButton, loading && styles.disabledButton]}
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        <Ionicons name="logo-google" size={20} color="#1F2937" style={styles.googleIcon} />
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.createAccountContainer} onPress={() => navigation.navigate('EmailSignup')}>
        <Text style={styles.createAccountText}>Don't have an account? <Text style={styles.createAccountBold}>Sign Up</Text></Text>
      </TouchableOpacity>
    </View>
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
  content: { flex: 1, padding: 24, justifyContent: 'center' },
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
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 18, height: 18, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },
  linkText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  forgotText: { color: '#10B981', fontSize: 14, fontWeight: '600' },
  button: { backgroundColor: '#10B981', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 4 },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', paddingHorizontal: 16, fontSize: 14, fontWeight: '600' },
  
  googleButton: { flexDirection: 'row', backgroundColor: '#FFFFFF', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  googleIcon: { marginRight: 12 },
  googleButtonText: { color: '#1F2937', fontSize: 16, fontWeight: '700' },
  
  createAccountContainer: { alignItems: 'center', paddingVertical: 12 },
  createAccountText: { color: '#6B7280', fontSize: 15, fontWeight: '500' },
  createAccountBold: { color: '#10B981', fontWeight: '700' },
});

export default LoginScreen;