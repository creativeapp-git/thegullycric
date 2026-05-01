import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  type?: 'primary' | 'secondary' | 'danger' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  title, onPress, type = 'primary', loading, disabled, style, textStyle, icon 
}) => {
  const isPrimary = type === 'primary';
  const isDanger = type === 'danger';
  const isOutline = type === 'outline';

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled || loading}
      style={[
        styles.btn,
        isPrimary && styles.btnPrimary,
        isDanger && styles.btnDanger,
        isOutline && styles.btnOutline,
        disabled && styles.btnDisabled,
        style
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? COLORS.primary : COLORS.white} />
      ) : (
        <>
          {icon}
          <Text style={[
            styles.text, 
            isOutline && { color: COLORS.primary },
            textStyle
          ]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

import { View } from 'react-native';

const styles = StyleSheet.create({
  btn: {
    height: 56,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  btnPrimary: { backgroundColor: COLORS.primary, ...SHADOWS.medium },
  btnDanger: { backgroundColor: COLORS.danger },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: COLORS.primary },
  btnDisabled: { opacity: 0.5, backgroundColor: COLORS.textSecondary },
  text: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.soft,
  },
});
