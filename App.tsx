import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { User } from '@supabase/supabase-js';
import { supabase } from './src/services/supabase';
import { DeviceEventEmitter, Platform } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { getUserProfile } from './src/services/userService';

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
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfile = async (uid: string) => {
      console.log('Checking profile for:', uid);
      try {
        const profile = await getUserProfile(uid);
        console.log('Profile found:', profile ? 'Yes' : 'No', profile?.username);
        setHasProfile(!!(profile && profile.username));
      } catch (e) {
        console.error('checkProfile error:', e);
        setHasProfile(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      } else {
        setHasProfile(false);
      }
      setLoading(false);
    }).catch(error => {
      console.error('Session error:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', session ? 'logged in' : 'logged out', session?.user?.id);
      setUser(session?.user ?? null);

      if (session?.user) {
        await checkProfile(session.user.id);
      } else {
        setHasProfile(false);
      }
    });

    const profileSub = DeviceEventEmitter.addListener('profileUpdated', async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        checkProfile(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      profileSub.remove();
    };
  }, []);

  if (loading) {
    return null; // A proper splash screen could go here
  }

  return (
    <NavigationContainer>
      <AppNavigator user={user} hasProfile={hasProfile} />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
