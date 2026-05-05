import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, BORDER_RADIUS } from '../theme';

interface Notification {
  id: string;
  message: string;
  type?: 'default' | 'wicket' | 'boundary' | 'success';
}

interface NotificationContextType {
  showNotification: (message: string, type?: Notification['type']) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  showNotification: () => {},
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((message: string, type: Notification['type'] = 'default') => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const id = Date.now().toString() + Math.random().toString();
    setNotification({ id, message, type });

    // Slide in
    Animated.spring(slideAnim, {
      toValue: 50,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();

    // Auto-dismiss after 4 seconds
    timeoutRef.current = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setNotification(null);
      });
    }, 4000);
  }, [slideAnim]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <Animated.View
          style={[
            styles.toastContainer,
            { transform: [{ translateY: slideAnim }] },
            notification.type === 'wicket' && { borderLeftColor: '#EF4444' },
            notification.type === 'boundary' && { borderLeftColor: '#3B82F6' },
            notification.type === 'success' && { borderLeftColor: '#10B981' },
          ]}
        >
          <View style={styles.iconBox}>
            {notification.type === 'wicket' ? (
              <Ionicons name="warning" size={20} color="#EF4444" />
            ) : notification.type === 'boundary' ? (
              <Ionicons name="flash" size={20} color="#3B82F6" />
            ) : notification.type === 'success' ? (
              <Ionicons name="trophy" size={20} color="#10B981" />
            ) : (
              <Ionicons name="information-circle" size={20} color="#6B7280" />
            )}
          </View>
          <Text style={styles.toastText}>{notification.message}</Text>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.medium,
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
    zIndex: 9999,
    elevation: 10,
    maxWidth: Platform.OS === 'web' ? 400 : '100%',
    alignSelf: Platform.OS === 'web' ? 'center' : 'auto',
  },
  iconBox: {
    marginRight: 12,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
});
