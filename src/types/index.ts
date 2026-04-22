export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
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
  score1?: string;
  score2?: string;
  status: 'Scheduled' | 'Live' | 'Completed';
  createdBy: string;
  createdAt?: any;
  rules?: {
    powerPlay: boolean;
    bouncerLimit: boolean;
    wideLimit: boolean;
    ballByBall: boolean;
  };
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
  // Bowler stats if applicable
  overs?: number;
  wickets?: number;
  runsConceded?: number;
  economy?: number;
}