import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../theme';

/**
 * Static app header — memoized so it never re-renders on parent state changes.
 * Uses TouchableOpacity from react-native (not gesture-handler) to avoid
 * the import-after-use bug that existed before.
 */
const Header = React.memo(() => (
  <SafeAreaView style={styles.safeArea}>
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.iconBg}>
          <Ionicons name="trophy" size={20} color={COLORS.white} />
        </View>
        <Text style={styles.title}>Gully<Text style={styles.titleBold}>Cric</Text></Text>
      </View>
      <TouchableOpacity style={styles.notifBtn} accessibilityLabel="Notifications">
        <Ionicons name="notifications-outline" size={22} color={COLORS.text} />
      </TouchableOpacity>
    </View>
  </SafeAreaView>
));

Header.displayName = 'Header';

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    height: Platform.OS === 'ios' ? 44 : 56,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: '500',
  },
  titleBold: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Header;