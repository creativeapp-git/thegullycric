import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, useWindowDimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithUsernameOrEmail, signInWithGoogleWeb } from '../services/authService';
import { AppNavigationProp } from '../navigation/navigation.types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

const LoginScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { height } = useWindowDimensions();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue scoring</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email or Username</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="john@example.com"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.inputField}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholderTextColor={COLORS.textMuted}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.linksRow}>
          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
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
          <ActivityIndicator color={COLORS.white} />
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
        <Ionicons name="logo-google" size={20} color={COLORS.text} style={styles.googleIcon} />
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
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: SPACING.xl, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginBottom: SPACING.xxl },
  logoCircle: { width: 100, height: 100, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.cardElevated, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.medium },
  logoImage: { width: 70, height: 70 },
  title: { fontSize: TYPOGRAPHY.sizes.xxxl, fontWeight: TYPOGRAPHY.weights.heavy, color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: TYPOGRAPHY.sizes.lg, color: COLORS.textSecondary, marginTop: SPACING.sm },
  card: { backgroundColor: COLORS.cardElevated, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: SPACING.xl, ...SHADOWS.medium },
  label: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  inputIcon: { marginRight: SPACING.md },
  inputField: { flex: 1, height: 52, fontSize: TYPOGRAPHY.sizes.md, color: COLORS.text },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.sm },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.border, marginRight: SPACING.sm, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  linkText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium },
  forgotText: { color: COLORS.primary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold },
  button: { backgroundColor: COLORS.primary, height: 56, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', justifyContent: 'center', ...SHADOWS.glowPrimary },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: COLORS.white, fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold, letterSpacing: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  dividerText: { color: COLORS.textMuted, paddingHorizontal: SPACING.lg, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold },
  googleButton: { flexDirection: 'row', backgroundColor: COLORS.cardElevated, height: 56, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: SPACING.xl, ...SHADOWS.small },
  googleIcon: { marginRight: SPACING.md },
  googleButtonText: { color: COLORS.text, fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold },
  createAccountContainer: { alignItems: 'center', paddingVertical: SPACING.md },
  createAccountText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.medium },
  createAccountBold: { color: COLORS.primary, fontWeight: TYPOGRAPHY.weights.bold },
});

export default LoginScreen;