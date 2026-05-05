import React, { useEffect, useState, useCallback, createContext } from 'react';
// VERSION 1.1.0 - STABILIZATION REFACTOR
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { User } from '@supabase/supabase-js';
import { supabase } from './src/services/supabase';
import { Platform, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PWAProvider } from './src/context/PWAContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';


if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    #root {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
      overflow-y: scroll;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
    }
    /* Ensure all RN scroll containers work on web */
    [data-testid], [class*="r-overflow"] {
      -webkit-overflow-scrolling: touch;
    }
  `;
  document.head.appendChild(style);

  // Clean up stale service workers to prevent white screens on new deployments
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}

// Global context so ProfileSetupScreen can trigger profile re-check
import { ProfileRefreshContext } from './src/services/profileContext';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [profileChecked, setProfileChecked] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);

  const checkProfile = useCallback(async (uid: string) => {
    console.log('App[1.2.0]: Gating profile for UID:', uid);
    setInitError(null);
    
    try {
      const { data: profile, error } = await supabase.from('users').select('id, username, name').eq('id', uid).single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('App: No profile found. Sending to setup.');
          setHasProfile(false);
        } else {
          setInitError(`Database Error: ${error.message} (Code: ${error.code})`);
          console.error(`Supabase Error: ${error.message}`);
        }
      } else if (!profile || !profile.username || !profile.name) {
        console.log('App: Profile incomplete. Sending to setup.');
        setHasProfile(false);
      } else {
        console.log('App: Profile complete.', profile.username);
        setHasProfile(true);
      }
    } catch (e: any) {
      console.error('App: Gatekeeper exception:', e);
      setInitError(`Network/Client Error: ${e.message}`);
    } finally {
      setProfileChecked(true);
    }
  }, []);

  // Exposed via context so child screens can trigger a re-check
  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await checkProfile(session.user.id);
    }
  }, [checkProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      } else {
        setHasProfile(false);
        setProfileChecked(true);
      }
    }).catch(() => setProfileChecked(true));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setHasProfile(false);
        setProfileChecked(false);
        await checkProfile(session.user.id);
      } else {
        setHasProfile(false);
        setProfileChecked(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkProfile]);


  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA', padding: 20 }}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={{ marginTop: 16, color: '#EF4444', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>{initError}</Text>
        <TouchableOpacity style={{ marginTop: 24, padding: 12, backgroundColor: '#10B981', borderRadius: 8 }} onPress={() => { setInitError(null); setProfileChecked(false); if(user) checkProfile(user.id); else supabase.auth.getSession(); }}>
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profileChecked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ marginTop: 16, color: '#6B7280', fontWeight: '500' }}>Initializing GullyCric...</Text>
      </View>
    );
  }

  const linking: any = {
    prefixes: [Platform.OS === 'web' ? window.location.origin : 'gullycric://', 'gullycric://'],
    config: {
      screens: {
        PublicMatch: 'match/:matchId',
        App: {
          path: '',
          screens: {
            Tabs: {
              path: '',
              screens: {
                Home: 'home',
                Leaderboard: 'leaderboard'
              }
            }
          }
        }
      }
    }
  };

  return (
    <ProfileRefreshContext.Provider value={refreshProfile}>
      <PWAProvider>
        <NotificationProvider>
          <NavigationContainer linking={linking} fallback={<ActivityIndicator size="large" />}>
            <AppNavigator user={user} hasProfile={hasProfile} />
            <StatusBar style="auto" />
          </NavigationContainer>
        </NotificationProvider>
      </PWAProvider>
    </ProfileRefreshContext.Provider>
  );
}
