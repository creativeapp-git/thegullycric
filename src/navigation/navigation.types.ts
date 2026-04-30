import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, NavigatorScreenParams } from '@react-navigation/native';

// Bottom tab screens
export type TabParamList = {
  Home: undefined;
  'My Space': undefined;
  Fixtures: undefined;
  Leaderboard: undefined;
  Settings: undefined;
};

// Root level navigators
export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  ProfileSetup: { uid: string };
  PublicMatch: { matchId: string };
};

// Auth stack screens
export type AuthStackParamList = {
  Login: undefined;
  EmailSignup: undefined;
};

// App stack screens
export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  CreateMatch: { matchId?: string } | undefined;
  MatchDetail: { matchId: string };
  MatchSummary: { matchId: string };
  Scoring: { matchId: string };
  EditProfile: undefined;
};

// Typed navigation props — union of all stacks for convenience
export type AppNavigationProp = StackNavigationProp<
  RootStackParamList & AuthStackParamList & AppStackParamList
>;

// Typed route props
export type MatchDetailRouteProp = RouteProp<AppStackParamList, 'MatchDetail'>;
export type ScoringRouteProp = RouteProp<AppStackParamList, 'Scoring'>;
export type ProfileSetupRouteProp = RouteProp<RootStackParamList, 'ProfileSetup'>;
