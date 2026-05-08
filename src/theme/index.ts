import { Platform } from 'react-native';

export const COLORS = {
  primary: '#38BDF8',
  primaryLight: '#E0F2FE',
  background: '#FFFFFF',
  card: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#F1F5F9',
  white: '#FFFFFF',
  danger: '#EF4444',
  success: '#10B981',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

// Each shadow variant works on BOTH web (boxShadow) and native (shadowColor etc.)
export const SHADOWS = {
  small: Platform.select({
    web: { boxShadow: '0px 1px 6px rgba(0, 0, 0, 0.04)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
  })!,
  soft: Platform.select({
    web: { boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.05)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
  })!,
  medium: Platform.select({
    web: { boxShadow: '0px 4px 12px rgba(56, 189, 248, 0.1)' },
    default: {
      shadowColor: '#38BDF8',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
  })!,
};
