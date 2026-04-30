import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@supabase/supabase-js';

import HomeScreen from '../screens/HomeScreen';
import MySpaceScreen from '../screens/MySpaceScreen';
import FixturesScreen from '../screens/FixturesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateMatchScreen from '../screens/CreateMatchScreen';
import LoginScreen from '../screens/LoginScreen';
import EmailSignupScreen from '../screens/EmailSignupScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import MatchDetailScreen from '../screens/MatchDetailScreen';
import MatchSummaryScreen from '../screens/MatchSummaryScreen';
import ScoringScreen from '../screens/ScoringScreen';
import { RootStackParamList, TabParamList, AuthStackParamList, AppStackParamList } from './navigation.types';

const Tab = createBottomTabNavigator<TabParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const AppStack = createStackNavigator<AppStackParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'My Space') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Fixtures') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#fff' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="My Space" component={MySpaceScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Fixtures" component={FixturesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="EmailSignup" component={EmailSignupScreen} />
  </AuthStack.Navigator>
);

export const MainAppNavigator = () => (
  <AppStack.Navigator screenOptions={{ headerShown: false }}>
    <AppStack.Screen name="Tabs" component={TabNavigator} />
    <AppStack.Screen name="CreateMatch" component={CreateMatchScreen} />
    <AppStack.Screen name="MatchDetail" component={MatchDetailScreen} />
    <AppStack.Screen name="MatchSummary" component={MatchSummaryScreen} />
    <AppStack.Screen name="Scoring" component={ScoringScreen} />
    <AppStack.Screen name="EditProfile" component={EditProfileScreen} />
  </AppStack.Navigator>
);

interface AppNavigatorProps {
  user: User | null;
  hasProfile: boolean;
}

const AppNavigator = ({ user, hasProfile }: AppNavigatorProps) => {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      ) : !hasProfile ? (
        <RootStack.Screen name="ProfileSetup" component={ProfileSetupScreen} initialParams={{ uid: user.id }} />
      ) : (
        <RootStack.Screen name="App" component={MainAppNavigator} />
      )}
    </RootStack.Navigator>
  );
};

export default AppNavigator;