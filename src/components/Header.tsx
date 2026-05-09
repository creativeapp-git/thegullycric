import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../theme';

/**
 * GullyCric App Header v2 — gradient background, glass notification button
 */
const Header = React.memo(() => (
  <SafeAreaView style={styles.safeArea}>
    <LinearGradient
      colors={['#0F1E35', '#0D1117'] as any}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.logoRow}>
        <LinearGradient
          colors={[COLORS.primaryDark, COLORS.primary] as any}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.iconBg}
        >
          <Ionicons name="trophy" size={18} color={COLORS.black} />
        </LinearGradient>
        <View>
          <Text style={styles.title}>
            Gully<Text style={styles.titleAccent}>Cric</Text>
          </Text>
          <Text style={styles.tagline}>Live Scoring Platform</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.notifBtn} accessibilityLabel="Notifications">
        <Ionicons name="notifications-outline" size={19} color={COLORS.textSecondary} />
      </TouchableOpacity>
    </LinearGradient>
  </SafeAreaView>
));

Header.displayName = 'Header';

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#0F1E35',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: Platform.OS === 'ios' ? 44 : 64,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.glowPrimary,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weights.semibold,
    letterSpacing: 0.2,
  },
  titleAccent: {
    fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.primary,
  },
  tagline: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.weights.medium,
    letterSpacing: 0.3,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderGlass,
  },
});

export default Header;