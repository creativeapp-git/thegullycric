import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signUpWithEmail, signInWithGoogleWeb } from '../services/authService';
import { AppNavigationProp } from '../navigation/navigation.types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

const EmailSignupScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]               = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleGoogleSignup = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Notice', 'Google Sign-In is currently only supported on the web version.');
      return;
    }
    setLoading(true);
    try { await signInWithGoogleWeb(); }
    catch (e: any) { if (e.code !== 'auth/popup-closed-by-user') window.alert('Failed: ' + e.message); }
    finally { setLoading(false); }
  };

  const showAlert = (title: string, message: string) =>
    Platform.OS === 'web' ? window.alert(`${title}: ${message}`) : Alert.alert(title, message);

  const handleSignup = async () => {
    if (!email || !email.includes('@')) return showAlert('Error', 'Please enter a valid email address');
    if (password.length < 6)           return showAlert('Error', 'Password must be at least 6 characters');
    if (password !== confirmPassword)  return showAlert('Error', 'Passwords do not match');

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      setVerificationSent(true);
    } catch (e: any) {
      showAlert('Error', e.code === 'auth/email-already-in-use' ? 'This email is already in use.' : 'Failed to create account');
    } finally { setLoading(false); }
  };

  const InputRow = ({
    icon, placeholder, value, onChangeText, secure, showToggle, onToggle, keyboardType
  }: any) => (
    <View style={s.inputWrapper}>
      <Ionicons name={icon} size={19} color={COLORS.textMuted} style={{ marginRight: SPACING.md }} />
      <TextInput
        style={s.inputField}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize="none"
        keyboardType={keyboardType}
        placeholderTextColor={COLORS.textMuted}
      />
      {showToggle && (
        <TouchableOpacity onPress={onToggle} style={{ padding: 4 }}>
          <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );

  const content = (
    <ScrollView
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero Section */}
      <LinearGradient colors={['#0F1E35', '#0D1117'] as any} style={s.hero}>
        <View style={s.logoWrap}>
          <Image source={require('../../assets/app-logo.png')} style={s.logo} resizeMode="contain" />
        </View>
        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Join the GullyCric community</Text>
      </LinearGradient>

      {!verificationSent ? (
        <>
          {/* Form Card */}
          <View style={s.card}>
            <Text style={s.label}>Email Address</Text>
            <InputRow icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" secure={false} />

            <Text style={s.label}>Password</Text>
            <InputRow icon="lock-closed-outline" placeholder="••••••••" value={password} onChangeText={setPassword} secure={!showPass} showToggle onToggle={() => setShowPass(v => !v)} />

            <Text style={s.label}>Confirm Password</Text>
            <InputRow icon="lock-closed-outline" placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secure={!showConfirm} showToggle onToggle={() => setShowConfirm(v => !v)} />
          </View>

          {/* CTA */}
          <TouchableOpacity onPress={handleSignup} disabled={loading} style={{ borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.xl }}>
            <LinearGradient colors={[COLORS.primaryDark, COLORS.primary] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
              {loading ? <ActivityIndicator color={COLORS.black} /> : <Text style={s.btnText}>Create Account</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} /><Text style={s.dividerText}>OR</Text><View style={s.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[s.googleBtn, loading && { opacity: 0.5 }]}
            onPress={handleGoogleSignup}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={19} color={COLORS.text} style={{ marginRight: SPACING.md }} />
            <Text style={s.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Login link */}
          <TouchableOpacity style={s.linkRow} onPress={() => navigation.navigate('Login')}>
            <Text style={s.linkText}>Already have an account?{' '}<Text style={s.linkBold}>Log In</Text></Text>
          </TouchableOpacity>
        </>
      ) : (
        /* Verification sent */
        <View style={[s.card, { alignItems: 'center', paddingVertical: SPACING.xxxl }]}>
          <View style={s.verifyIconRing}>
            <Ionicons name="mail-open-outline" size={44} color={COLORS.primary} />
          </View>
          <Text style={s.verifyTitle}>Verify Your Email</Text>
          <Text style={s.verifyBody}>
            We've sent a secure link to{' '}
            <Text style={{ fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.text }}>{email}</Text>.{'\n'}
            Check your inbox to activate your account.
          </Text>
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: SPACING.xl }} />
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={[s.root, Platform.OS === 'web' && { height: '100vh' as any, overflow: 'hidden' as any }]}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">{content}</KeyboardAvoidingView>
      ) : content}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, paddingBottom: 60 },

  // Hero
  hero: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxxl, paddingBottom: SPACING.xxl, alignItems: 'center' },
  logoWrap: {
    width: 88, height: 88, borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.cardElevated, justifyContent: 'center', alignItems: 'center',
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderLight,
    ...SHADOWS.medium,
  },
  logo: { width: 64, height: 64 },
  title: { fontSize: TYPOGRAPHY.sizes.xxxl, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: TYPOGRAPHY.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.sm },

  // Card
  card: {
    backgroundColor: COLORS.cardElevated,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.borderLight,
    ...SHADOWS.medium,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.lg,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 4,
  },
  inputField: { flex: 1, height: 52, fontSize: TYPOGRAPHY.sizes.md, color: COLORS.text },

  // Buttons
  btn: { height: 56, justifyContent: 'center', alignItems: 'center', ...SHADOWS.glowPrimary },
  btnText: { color: COLORS.black, fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.black, letterSpacing: 0.5 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  dividerText: { color: COLORS.textMuted, paddingHorizontal: SPACING.lg, fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.semibold },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, marginHorizontal: SPACING.lg, marginBottom: SPACING.xl,
    backgroundColor: COLORS.cardElevated, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.small,
  },
  googleBtnText: { color: COLORS.text, fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold },
  linkRow: { alignItems: 'center', paddingVertical: SPACING.md },
  linkText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.md },
  linkBold: { color: COLORS.primary, fontWeight: TYPOGRAPHY.weights.bold },

  // Verification
  verifyIconRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(0,230,118,0.08)', borderWidth: 1.5,
    borderColor: 'rgba(0,230,118,0.25)', justifyContent: 'center',
    alignItems: 'center', marginBottom: SPACING.xl,
  },
  verifyTitle: { fontSize: TYPOGRAPHY.sizes.xxl, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.text, marginBottom: SPACING.md },
  verifyBody: { fontSize: TYPOGRAPHY.sizes.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24, paddingHorizontal: SPACING.md },
});

export default EmailSignupScreen;
