import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/services/firebase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'logged in' : 'logged out', user?.email);
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <AppNavigator initialRouteName={user ? 'Tabs' : 'Login'} />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
