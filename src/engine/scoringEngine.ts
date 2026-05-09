/**
 * Pure scoring logic — extracted for testing and reuse.
 * No React, no Supabase, no side-effects.
 */

export const BALLS_PER_OVER = 6;

export interface BallInput {
  r: number;        // batter runs
  e: number;        // extra runs
  type?: 'wide' | 'noball' | 'legbye' | 'bye';
  isW?: boolean;    // is wicket
  wType?: string;   // wicket type
  dismissedPlayer?: string;
}

export interface MatchState {
  current_innings: number;
  team1: string;
  team2: string;
  team1_players: string[];
  team2_players: string[];
  overs: number;
  score1: number;
  score2: number;
  wickets1: number;
  wickets2: number;
  target?: number;
  winner?: string;
  match_state: string;
  striker: string | null;
  non_striker: string | null;
  current_bowler: string | null;
  last_bowler: string | null;
  out_players: string[];
  allow_super_over?: boolean;
  rules?: {
    wideExtraRun: boolean;
    noBallExtraRun: boolean;
  };
}

export interface BallResult {
  isLegal: boolean;
  totalRuns: number;        // runs added to team score
  batterRuns: number;       // runs credited to batter
  extras: number;           // extra runs
  isWide: boolean;
  isNoBall: boolean;
  isBye: boolean;
  isLegBye: boolean;
  isWicket: boolean;
}

export interface InningsEndResult {
  nextState: string;
  winner?: string;
  target?: number;
  switchInnings: boolean;
}

/** Calculate results of a single ball delivery */
export function processBall(input: BallInput): BallResult {
  const isWide = input.type === 'wide';
  const isNoBall = input.type === 'noball';
  const isBye = input.type === 'bye';
  const isLegBye = input.type === 'legbye';
  const isLegal = !isWide && !isNoBall;

  // Batter gets credited runs only on normal deliveries (not byes/leg byes)
  const batterRuns = (isBye || isLegBye) ? 0 : input.r;
  // Total runs added to team score
  const totalRuns = input.r + input.e;

  return {
    isLegal,
    totalRuns,
    batterRuns,
    extras: input.e,
    isWide,
    isNoBall,
    isBye,
    isLegBye,
    isWicket: !!input.isW,
  };
}

/** Determine max wickets for a team (N-1 rule) */
export function getMaxWickets(teamSize: number): number {
  return Math.max(teamSize - 1, 1);
}

/** Check if over is complete */
export function isOverComplete(legalBallsInOver: number): boolean {
  return legalBallsInOver >= BALLS_PER_OVER;
}

/** Check if striker should change (odd physical runs) */
export function shouldRotateStrike(physicalRuns: number): boolean {
  return physicalRuns % 2 !== 0;
}

/** Determine batting and fielding teams based on innings */
export function getTeams(match: MatchState) {
  const isFirstInnings = match.current_innings === 1 || match.current_innings === 3;
  return {
    battingTeam: isFirstInnings ? match.team1 : match.team2,
    fieldingTeam: isFirstInnings ? match.team2 : match.team1,
    battingPlayers: isFirstInnings ? match.team1_players : match.team2_players,
    bowlingPlayers: isFirstInnings ? match.team2_players : match.team1_players,
  };
}

/** Check if innings should end and determine match state */
export function checkInningsEnd(
  currentInnings: number,
  totalLegalBalls: number,
  maxBalls: number,
  wickets: number,
  maxWickets: number,
  score: number,
  target: number | undefined,
  battingTeam: string,
  fieldingTeam: string,
  allowSuperOver: boolean = false,
): InningsEndResult {
  const isChasing = currentInnings === 2 || currentInnings === 4;

  if (isChasing && target) {
    // Chasing team passes the target — they win
    if (score >= target) {
      return { nextState: 'completed', winner: battingTeam, switchInnings: false };
    }

    // All out or overs done while chasing
    if (totalLegalBalls >= maxBalls || wickets >= maxWickets) {
      if (score === target - 1) {
        // Tie
        if (currentInnings === 2 && allowSuperOver) {
          return { nextState: 'super_over_setup', switchInnings: false };
        }
        return { nextState: 'completed', winner: 'tie', switchInnings: false };
      }
      // Chasing team loses
      return { nextState: 'completed', winner: fieldingTeam, switchInnings: false };
    }
  } else {
    // First innings — check all out or overs done
    if (totalLegalBalls >= maxBalls || wickets >= maxWickets) {
      return {
        nextState: 'innings_break',
        target: score + 1,
        switchInnings: true,
      };
    }
  }

  return { nextState: 'live', switchInnings: false };
}

/** Format overs from legal ball count: e.g. 14 balls = "2.2" */
export function formatOvers(legalBalls: number): string {
  return `${Math.floor(legalBalls / BALLS_PER_OVER)}.${legalBalls % BALLS_PER_OVER}`;
}

/** Calculate run rate */
export function getRunRate(totalRuns: number, legalBalls: number): string {
  if (legalBalls === 0) return '0.00';
  const overs = legalBalls / BALLS_PER_OVER;
  return (totalRuns / overs).toFixed(2);
}

/** Calculate required run rate */
export function getRequiredRunRate(
  runsNeeded: number,
  ballsRemaining: number,
): string {
  if (ballsRemaining <= 0) return '∞';
  const oversRemaining = ballsRemaining / BALLS_PER_OVER;
  return (runsNeeded / oversRemaining).toFixed(2);
}
