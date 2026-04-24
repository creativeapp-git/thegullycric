import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// Root level navigators
export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  ProfileSetup: { uid: string };
};

// Auth stack screens
export type AuthStackParamList = {
  Login: undefined;
  EmailSignup: undefined;
};

// App stack screens
export type AppStackParamList = {
  Tabs: undefined;
  CreateMatch: undefined;
  MatchDetail: { matchId: string };
  Scoring: { matchId: string };
  EditProfile: undefined;
};

// Bottom tab screens
export type TabParamList = {
  Home: undefined;
  'My Space': undefined;
  Fixtures: undefined;
  Settings: undefined;
};

// Typed navigation props for different stacks
export type AppNavigationProp = StackNavigationProp<RootStackParamList & AuthStackParamList & AppStackParamList>;

// Typed route props
export type MatchDetailRouteProp = RouteProp<AppStackParamList, 'MatchDetail'>;
export type ScoringRouteProp = RouteProp<AppStackParamList, 'Scoring'>;
export type ProfileSetupRouteProp = RouteProp<RootStackParamList, 'ProfileSetup'>;
