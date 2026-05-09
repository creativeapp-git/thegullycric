import React, { useCallback, useEffect, useState } from 'react';
import { LinkingOptions, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { User } from '@supabase/supabase-js';
import { supabase } from './src/services/supabase';
import { Platform, View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PWAProvider } from './src/context/PWAContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ProfileRefreshContext } from './src/services/profileContext';
import { RootStackParamList } from './src/navigation/navigation.types';

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

type InitState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retryable: boolean }
  | { status: 'ready' };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [initState, setInitState] = useState<InitState>({ status: 'loading' });

  const checkProfile = useCallback(async (uid: string, isInitial = true) => {
    if (isInitial) setInitState({ status: 'loading' });

    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const fetchPromise = supabase
        .from('users')
        .select('id, username, name')
        .eq('id', uid)
        .single();

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('TIMEOUT')), 7000);
      });

      const { data: profile, error } = await Promise.race([fetchPromise, timeoutPromise]);

      if (error) {
        if (error.code === 'PGRST116') {
          setHasProfile(false);
          if (isInitial) setInitState({ status: 'ready' });
        } else if (error.message?.toLowerCase().includes('abort')) {
          if (isInitial) setInitState({
            status: 'error',
            message: 'Connection timed out. Check your internet and retry.',
            retryable: true,
          });
        } else {
          if (isInitial) setInitState({ status: 'error', message: `DB error: ${error.message}`, retryable: true });
        }
        return;
      }

      setHasProfile(Boolean(profile?.username && profile?.name));
      if (isInitial) setInitState({ status: 'ready' });
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown startup error');
      const isTimeout =
        error.message === 'TIMEOUT' ||
        error.name === 'AbortError' ||
        error.message.toLowerCase().includes('abort');

      if (isInitial) setInitState({
        status: 'error',
        message: isTimeout
          ? 'Connection timed out. Check your internet and retry.'
          : `Startup error: ${error.message}`,
        retryable: true,
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) await checkProfile(session.user.id, false);
  }, [checkProfile]);

  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          await checkProfile(currentUser.id, true);
        } else {
          setHasProfile(false);
          setInitState({ status: 'ready' });
        }
        initialCheckDone = true;
      })
      .catch(() => {
        if (!mounted) return;
        setHasProfile(false);
        setInitState({ status: 'ready' });
        initialCheckDone = true;
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') return;
      if (event === 'TOKEN_REFRESHED') return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        if (!initialCheckDone) {
          await checkProfile(currentUser.id, true);
        } else {
          // Silent refresh
          await checkProfile(currentUser.id, false);
        }
      } else {
        setHasProfile(false);
        setInitState({ status: 'ready' });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkProfile]);

  if (initState.status === 'loading') {
    return (
      <View style={styles.center}>
        <Text style={styles.splashEmoji}>🏏</Text>
        <ActivityIndicator size="large" color="#38BDF8" style={{ marginTop: 24 }} />
        <Text style={styles.splashText}>Loading GullyCric...</Text>
      </View>
    );
  }

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
              if (user) {
                checkProfile(user.id);
                return;
              }

              setInitState({ status: 'loading' });
              supabase.auth
                .getSession()
                .then(({ data: { session } }) => {
                  if (session?.user) checkProfile(session.user.id);
                  else setInitState({ status: 'ready' });
                })
                .catch(() => setInitState({ status: 'ready' }));
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [Platform.OS === 'web' ? window.location.origin : 'gullycric://', 'gullycric://'],
    config: {
      screens: {
        PublicMatch: 'match/:matchId',
        PublicUserProfile: 'user/:username',
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
