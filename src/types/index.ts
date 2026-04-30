export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  avatar?: string;
  bio?: string;
  preferences: {
    theme: 'light' | 'dark';
    defaultRules: {
      wideExtra: boolean;
      noBallExtra: boolean;
    };
    enableAnimation: boolean;
  };
  profileEdits?: {
    count: number;
    month: string;
  };
  location?: {
    lat: number;
    lng: number;
  };
  createdAt?: Date;
}

export interface Match {
  id?: string;
  matchId: string;
  name: string;
  type: 'Test' | 'ODI' | 'T20' | 'Gully';
  overs: number;
  location: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  team1Logo?: string;
  team2Logo?: string;
  team1Players?: string[];
  team2Players?: string[];
  tossWinner?: string;
  tossDecision?: 'Bat' | 'Bowl';
  score1?: string;
  score2?: string;
  currentInnings?: number;
  status: 'Scheduled' | 'Live' | 'Completed';
  description?: string;
  isDeleted?: boolean;
  createdBy: string;
  createdAt?: any;
  rules?: {
    wideExtraRun: boolean;
    noBallExtraRun: boolean;
    ballByBall: boolean;
  };
  ballLog?: BallEvent[];
}

export interface BallEvent {
  id: string;
  match_id: string;
  innings: number;
  over: number;
  ball: number;
  batter: string;
  bowler: string;
  runs: number;
  is_wide: boolean;
  is_no_ball: boolean;
  is_bye: boolean;
  is_leg_bye: boolean;
  is_wicket: boolean;
  wicket_type?: 'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped' | 'hitwicket' | 'retired';
  dismissed_player?: string;
  extras: number;
  created_at: string;
}

export interface InningsData {
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: number;
}

export interface PlayerStats {
  playerId: string;
  matchId: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  dots: number;
  boundaries: number;
  overs?: number;
  wickets?: number;
  runsConceded?: number;
  economy?: number;
}