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
  innings: number;
  over: number;
  ball: number;
  batter: string;
  bowler: string;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isBye: boolean;
  isLegBye: boolean;
  isWicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped' | 'hitwicket' | 'retired';
  dismissedPlayer?: string;
  extras: number;
  timestamp: number;
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