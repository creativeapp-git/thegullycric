import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  'My Space': undefined;
  Fixtures: undefined;
  Leaderboard: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: NavigatorScreenParams<AppStackParamList> | undefined;
  ProfileSetup: { uid: string };
  PublicMatch: { matchId: string };
  PublicUserProfile: { username: string };
};

export type AuthStackParamList = {
  Login: undefined;
  EmailSignup: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  CreateMatch: { matchId?: string } | undefined;
  MatchDetail: { matchId: string };
  MatchSummary: { matchId: string };
  Scoring: { matchId: string };
  EditProfile: undefined;
};

export type AppNavigationProp = StackNavigationProp<
  RootStackParamList & AuthStackParamList & AppStackParamList
>;

export type MatchDetailRouteProp = RouteProp<AppStackParamList, 'MatchDetail'>;
export type ScoringRouteProp = RouteProp<AppStackParamList, 'Scoring'>;
export type ProfileSetupRouteProp = RouteProp<RootStackParamList, 'ProfileSetup'>;
