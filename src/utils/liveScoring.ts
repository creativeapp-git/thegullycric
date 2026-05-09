import { getMaxWickets, shouldRotateStrike } from '../engine/scoringEngine';

export const EDITED_BALL_PREFIX = '[EDITED]';

export type LiveBall = {
  id?: string;
  innings: number;
  over: number;
  ball: number;
  runs?: number | null;
  extras?: number | null;
  extra_type?: string | null;
  is_legal?: boolean | null;
  is_wicket?: boolean | null;
  wicket_type?: string | null;
  dismissed_player?: string | null;
  batter?: string | null;
  bowler?: string | null;
  commentary_text?: string | null;
};

export const normalizePlayers = (players: string[] | null | undefined): string[] =>
  Array.from(new Set((players || []).filter(Boolean)));

export const getDismissedPlayer = (ball: Partial<LiveBall>): string | null =>
  ball.dismissed_player || (ball.is_wicket ? ball.batter || null : null);

export const isEditedBall = (ball: Partial<LiveBall>): boolean =>
  typeof ball.commentary_text === 'string' && ball.commentary_text.startsWith(EDITED_BALL_PREFIX);

export const getActiveBalls = <T extends Partial<LiveBall>>(balls: T[]): T[] =>
  balls.filter((ball) => !isEditedBall(ball));

export const getCurrentInningsBalls = <T extends Partial<LiveBall>>(balls: T[], innings: number): T[] =>
  getActiveBalls(balls).filter((ball) => Number(ball.innings) === Number(innings));

export const getCurrentLegalBallCount = (balls: Partial<LiveBall>[], innings: number): number =>
  getCurrentInningsBalls(balls, innings).filter((ball) => ball.is_legal !== false).length;

export const getCurrentScore = (balls: Partial<LiveBall>[], innings: number): number =>
  getCurrentInningsBalls(balls, innings).reduce(
    (sum, ball) => sum + Number(ball.runs || 0) + Number(ball.extras || 0),
    0,
  );

export const getCurrentWickets = (balls: Partial<LiveBall>[], innings: number): number =>
  getCurrentInningsBalls(balls, innings).filter((ball) => ball.is_wicket).length;

export const getOutPlayersForInnings = (balls: Partial<LiveBall>[], innings: number): string[] =>
  getCurrentInningsBalls(balls, innings)
    .map((ball) => getDismissedPlayer(ball))
    .filter((player): player is string => !!player);

export const getUndoWindowBalls = <T extends Partial<LiveBall>>(balls: T[], innings: number, limit = 6): T[] =>
  getCurrentInningsBalls(balls, innings).slice(-limit);

export const getExtraRunOptions = (type: 'legbye' | 'bye' | 'wide' | 'noball' | null): number[] => {
  if (type === 'noball') return [0, 1, 2, 3, 4, 6];
  return [0, 1, 2, 3, 4];
};

export const getPhysicalRuns = (payload: { r: number; e: number; type?: string | null }): number => {
  if (payload.type === 'bye' || payload.type === 'legbye') return payload.e;
  return payload.r;
};

export const getRunsToBatter = (payload: { r: number; type?: string | null }): number => {
  if (payload.type === 'bye' || payload.type === 'legbye' || payload.type === 'wide') return 0;
  return payload.r;
};

export const getRunsToBowler = (payload: { r: number; e: number; type?: string | null }): number => {
  if (payload.type === 'bye' || payload.type === 'legbye') return 0;
  return payload.r + payload.e;
};

export const getMaxWicketsForPlayers = (players: string[] | null | undefined): number =>
  getMaxWickets(normalizePlayers(players).length || 1);

export const didInningsEnd = (
  legalBalls: number,
  maxBalls: number,
  wickets: number,
  maxWickets: number,
) => legalBalls >= maxBalls || wickets >= maxWickets;

export const getBallResultLabel = (ball: Partial<LiveBall>): string => {
  if (isEditedBall(ball)) {
    return ball.commentary_text?.replace(EDITED_BALL_PREFIX, '').trim() || 'Edited';
  }
  if (ball.is_wicket) return 'W';
  if (ball.extra_type === 'wide') return `WD${Number(ball.extras || 0) > 1 ? Number(ball.extras || 0) : ''}`;
  if (ball.extra_type === 'noball') {
    const total = Number(ball.runs || 0) + Number(ball.extras || 0);
    return total > 1 ? `${total}NB` : 'NB';
  }
  if (ball.extra_type === 'bye') return `${Number(ball.extras || 0)}B`;
  if (ball.extra_type === 'legbye') return `${Number(ball.extras || 0)}LB`;
  return String(Number(ball.runs || 0));
};

export const buildEditedCommentary = (ball: Partial<LiveBall>): string => {
  const overBall = `${Number(ball.over)}.${Number(ball.ball)}`;
  const actor = ball.bowler && ball.batter ? `${ball.bowler} to ${ball.batter}` : 'ball';
  return `${EDITED_BALL_PREFIX} ${overBall} ${actor} ${getBallResultLabel(ball)}`.trim();
};

export const canAutoRestoreAfterUndo = (ball: Partial<LiveBall>, currentInnings: number, matchState?: string | null) => {
  if (!ball) return false;
  if (ball.is_wicket) return false;
  if (Number(ball.innings) !== Number(currentInnings)) return false;
  if (matchState === 'completed' || matchState === 'innings_break' || matchState === 'super_over_break' || matchState === 'super_over_setup') {
    return false;
  }
  return true;
};

export const restoreStrikeAfterUndo = (
  striker: string | null,
  nonStriker: string | null,
  ball: Partial<LiveBall>,
  legalBallsAfterEdit: number,
) => {
  if (!striker || !nonStriker) return { striker: null, nonStriker: null };

  let prevStriker = striker;
  let prevNonStriker = nonStriker;

  const overCompletedOnBall = ball.is_legal !== false && legalBallsAfterEdit % 6 === 0;
  if (overCompletedOnBall) {
    [prevStriker, prevNonStriker] = [prevNonStriker, prevStriker];
  }

  if (shouldRotateStrike(getPhysicalRuns({ r: Number(ball.runs || 0), e: Number(ball.extras || 0), type: ball.extra_type }))) {
    [prevStriker, prevNonStriker] = [prevNonStriker, prevStriker];
  }

  return { striker: prevStriker, nonStriker: prevNonStriker };
};
