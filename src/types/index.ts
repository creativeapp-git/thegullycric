export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
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
  location?: {
    lat: number;
    lng: number;
  };
  createdAt?: Date;
}

export interface Match {
  // --- Primary key (DB: uuid) ---
  id?: string;

  // --- DB snake_case fields (returned from Supabase) ---
  match_id: string;
  match_state?: 'setup' | 'live' | 'innings_break' | 'completed';
  created_by?: string;
  team1: string;
  team2: string;
  team1_players?: string[];
  team2_players?: string[];
  team1_logo?: string;
  team2_logo?: string;
  overs: number;
  max_balls?: number;
  current_innings?: number;
  striker?: string;
  non_striker?: string;
  current_bowler?: string;
  last_bowler?: string;
  score1?: number;
  score2?: number;
  wickets1?: number;
  wickets2?: number;
  balls1?: number;
  balls2?: number;
  innings1_completed?: boolean;
  innings2_completed?: boolean;
  is_public?: boolean;
  winner?: string;
  allow_super_over?: boolean;
  super_score1?: number;
  super_wickets1?: number;
  super_score2?: number;
  super_wickets2?: number;
  creator_team?: string;
  toss_winner?: string;
  toss_decision?: string;
  created_at?: string;

  // --- Additional columns that need adding to DB ---
  name?: string;
  type?: 'Test' | 'ODI' | 'T20' | 'Gully';
  location?: string;
  date?: string;
  time?: string;
  description?: string;
  rules?: {
    wideExtraRun: boolean;
    noBallExtraRun: boolean;
    ballByBall: boolean;
    allow_super_over?: boolean;
  };
  target?: number;

  // --- Legacy camelCase aliases (kept for backward compatibility) ---
  /** @deprecated Use match_id */
  matchId?: string;
  /** @deprecated Use team1_players */
  team1Players?: string[];
  /** @deprecated Use team2_players */
  team2Players?: string[];
  /** @deprecated Use team1_logo */
  team1Logo?: string;
  /** @deprecated Use team2_logo */
  team2Logo?: string;
  /** @deprecated Use created_by */
  createdBy?: string;
  /** @deprecated Use toss_winner */
  tossWinner?: string;
  /** @deprecated Use toss_decision */
  tossDecision?: string;
  /** @deprecated Use current_innings */
  currentInnings?: number;
  /** @deprecated Use match_state */
  status?: 'Scheduled' | 'Live' | 'Completed';
  isDeleted?: boolean;
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
  extra_type?: 'wide' | 'noball' | 'bye' | 'legbye';
  is_legal?: boolean;
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