import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS, SPACING } from '../theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  style?: ViewStyle;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const Input: React.FC<InputProps> = ({
  label, value, onChangeText, placeholder, icon, secureTextEntry, keyboardType, error, style, autoCapitalize
}) => {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        {icon && <Ionicons name={icon} size={20} color={COLORS.textSecondary} style={styles.icon} />}
        <TextInput
          style={styles.field}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md, width: '100%' },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 56,
    paddingHorizontal: 16,
  },
  inputError: { borderColor: COLORS.danger },
  icon: { marginRight: 12 },
  field: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text, height: '100%' },
  errorText: { color: COLORS.danger, fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: '600' },
});
