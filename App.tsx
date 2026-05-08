import React, { useEffect, useState, useCallback, createContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { User } from '@supabase/supabase-js';
import { supabase } from './src/services/supabase';
import { Platform, View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PWAProvider } from './src/context/PWAContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ProfileRefreshContext } from './src/services/profileContext';

// ── Web global styles ──────────────────────────────────────────────────────────
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      height: 100%; width: 100%; margin: 0; padding: 0; overflow: hidden;
    }
    #root {
      display: flex; flex-direction: column; height: 100vh; width: 100%;
      overflow-y: scroll; overflow-x: hidden; -webkit-overflow-scrolling: touch;
    }
    [data-testid], [class*="r-overflow"] { -webkit-overflow-scrolling: touch; }
  `;
  document.head.appendChild(style);
}

// ── Types ──────────────────────────────────────────────────────────────────────
type InitState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retryable: boolean }
  | { status: 'ready' };

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [initState, setInitState] = useState<InitState>({ status: 'loading' });

  /**
   * Check whether the authenticated user has a complete profile row.
   *
   * Outcomes:
   *  PGRST116  → definitively no profile → go to ProfileSetup
   *  data ok   → profile exists           → go to App
   *  timeout   → network is slow          → show retry (do NOT redirect to ProfileSetup)
   *  other err → DB/infra error           → show retry
   */
  const checkProfile = useCallback(async (uid: string) => {
    setInitState({ status: 'loading' });

    // Per-query timeout via AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, username, name')
        .eq('id', uid)
        .single()
        .abortSignal(controller.signal);

      clearTimeout(timer);

      if (error) {
        if (error.code === 'PGRST116') {
          // Row genuinely does not exist → send to ProfileSetup
          setHasProfile(false);
          setInitState({ status: 'ready' });
        } else if (error.message?.toLowerCase().includes('abort')) {
          setInitState({ status: 'error', message: 'Connection timed out. Check your internet and retry.', retryable: true });
        } else {
          setInitState({ status: 'error', message: `DB error: ${error.message}`, retryable: true });
        }
        return;
      }

      if (!profile || !profile.username || !profile.name) {
        // Row exists but incomplete → send to ProfileSetup
        setHasProfile(false);
      } else {
        setHasProfile(true);
      }
      setInitState({ status: 'ready' });

    } catch (e: any) {
      clearTimeout(timer);
      const isTimeout = e.name === 'AbortError' || e.message?.toLowerCase().includes('abort');
      setInitState({
        status: 'error',
        message: isTimeout
          ? 'Connection timed out. Check your internet and retry.'
          : `Startup error: ${e.message}`,
        retryable: true,
      });
    }
  }, []);

  // Refresh called from child screens (e.g. after ProfileSetup saves)
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) await checkProfile(session.user.id);
  }, [checkProfile]);

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION on mount.
    // We rely solely on this — no separate getSession() needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await checkProfile(currentUser.id);
      } else {
        // Logged out → go to auth screens
        setHasProfile(false);
        setInitState({ status: 'ready' });
      }
    });

    return () => subscription.unsubscribe();
  }, [checkProfile]);

  // ── Splash / Loading ───────────────────────────────────────────────────────
  if (initState.status === 'loading') {
    return (
      <View style={styles.center}>
        <Text style={styles.splashEmoji}>🏏</Text>
        <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 24 }} />
        <Text style={styles.splashText}>Loading GullyCric...</Text>
      </View>
    );
  }

  // ── Error / Retry ──────────────────────────────────────────────────────────
  if (initState.status === 'error') {
    return (
      <View style={styles.center}>
        <Ionicons name="wifi-outline" size={52} color="#EF4444" />
        <Text style={styles.errorTitle}>Connection Problem</Text>
        <Text style={styles.errorMsg}>{initState.message}</Text>
        {initState.retryable && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              if (user) checkProfile(user.id);
              else {
                setInitState({ status: 'loading' });
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session?.user) checkProfile(session.user.id);
                  else setInitState({ status: 'ready' });
                });
              }
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── App ────────────────────────────────────────────────────────────────────
  const linking: any = {
    prefixes: [
      Platform.OS === 'web' ? window.location.origin : 'gullycric://',
      'gullycric://',
    ],
    config: {
      screens: {
        PublicMatch: 'match/:matchId',
        App: {
          path: '',
          screens: {
            Tabs: {
              path: '',
              screens: { Home: 'home', Leaderboard: 'leaderboard' },
            },
          },
        },
      },
    },
  };

  return (
    <ProfileRefreshContext.Provider value={refreshProfile}>
      <PWAProvider>
        <NotificationProvider>
          <NavigationContainer linking={linking} fallback={<ActivityIndicator size="large" color="#38BDF8" />}>
            <AppNavigator user={user} hasProfile={hasProfile} />
            <StatusBar style="auto" />
          </NavigationContainer>
        </NotificationProvider>
      </PWAProvider>
    </ProfileRefreshContext.Provider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 32,
  },
  splashEmoji: { fontSize: 64 },
  splashText: {
    marginTop: 16,
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
  errorTitle: {
    marginTop: 16,
    color: '#111827',
    fontWeight: '800',
    fontSize: 20,
    textAlign: 'center',
  },
  errorMsg: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 28,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
