import {
  processBall,
  getMaxWickets,
  isOverComplete,
  shouldRotateStrike,
  getTeams,
  checkInningsEnd,
  formatOvers,
  getRunRate,
  getRequiredRunRate,
  BallInput,
  MatchState,
} from '../engine/scoringEngine';

// ─── Helper to create a default match state ───
const makeMatch = (overrides: Partial<MatchState> = {}): MatchState => ({
  current_innings: 1,
  team1: 'Lions',
  team2: 'Tigers',
  team1_players: ['A', 'B', 'C', 'D'],
  team2_players: ['X', 'Y', 'Z', 'W'],
  overs: 5,
  score1: 0,
  score2: 0,
  wickets1: 0,
  wickets2: 0,
  match_state: 'live',
  striker: 'A',
  non_striker: 'B',
  current_bowler: 'X',
  last_bowler: null,
  out_players: [],
  allow_super_over: false,
  ...overrides,
});

// ============================================================
//  1. processBall — ball classification
// ============================================================
describe('processBall', () => {
  test('normal dot ball', () => {
    const r = processBall({ r: 0, e: 0 });
    expect(r.isLegal).toBe(true);
    expect(r.totalRuns).toBe(0);
    expect(r.batterRuns).toBe(0);
    expect(r.isWicket).toBe(false);
  });

  test('single run', () => {
    const r = processBall({ r: 1, e: 0 });
    expect(r.isLegal).toBe(true);
    expect(r.totalRuns).toBe(1);
    expect(r.batterRuns).toBe(1);
  });

  test('boundary four', () => {
    const r = processBall({ r: 4, e: 0 });
    expect(r.totalRuns).toBe(4);
    expect(r.batterRuns).toBe(4);
    expect(r.isLegal).toBe(true);
  });

  test('six', () => {
    const r = processBall({ r: 6, e: 0 });
    expect(r.totalRuns).toBe(6);
    expect(r.batterRuns).toBe(6);
  });

  test('wide — not legal, 1 extra run', () => {
    const r = processBall({ r: 0, e: 1, type: 'wide' });
    expect(r.isLegal).toBe(false);
    expect(r.isWide).toBe(true);
    expect(r.totalRuns).toBe(1);
    expect(r.batterRuns).toBe(0);
    expect(r.extras).toBe(1);
  });

  test('no ball — not legal, 1 extra run', () => {
    const r = processBall({ r: 0, e: 1, type: 'noball' });
    expect(r.isLegal).toBe(false);
    expect(r.isNoBall).toBe(true);
    expect(r.totalRuns).toBe(1);
    expect(r.extras).toBe(1);
  });

  test('leg bye — legal, batter gets 0 runs, team gets extras', () => {
    const r = processBall({ r: 0, e: 2, type: 'legbye' });
    expect(r.isLegal).toBe(true);
    expect(r.isLegBye).toBe(true);
    expect(r.batterRuns).toBe(0);
    expect(r.totalRuns).toBe(2);
    expect(r.extras).toBe(2);
  });

  test('bye — legal, batter gets 0 runs', () => {
    const r = processBall({ r: 0, e: 3, type: 'bye' });
    expect(r.isLegal).toBe(true);
    expect(r.isBye).toBe(true);
    expect(r.batterRuns).toBe(0);
    expect(r.totalRuns).toBe(3);
  });

  test('leg bye 4 runs', () => {
    const r = processBall({ r: 0, e: 4, type: 'legbye' });
    expect(r.totalRuns).toBe(4);
    expect(r.batterRuns).toBe(0);
    expect(r.extras).toBe(4);
  });

  test('wicket delivery', () => {
    const r = processBall({ r: 0, e: 0, isW: true, wType: 'bowled', dismissedPlayer: 'A' });
    expect(r.isWicket).toBe(true);
    expect(r.isLegal).toBe(true);
    expect(r.totalRuns).toBe(0);
  });

  test('wide with no extra run (rules disabled)', () => {
    const r = processBall({ r: 0, e: 0, type: 'wide' });
    expect(r.isLegal).toBe(false);
    expect(r.totalRuns).toBe(0);
  });
});

// ============================================================
//  2. getMaxWickets — dynamic all-out
// ============================================================
describe('getMaxWickets', () => {
  test('11-player team: all out at 10', () => {
    expect(getMaxWickets(11)).toBe(10);
  });

  test('4-player team: all out at 3', () => {
    expect(getMaxWickets(4)).toBe(3);
  });

  test('2-player team: all out at 1', () => {
    expect(getMaxWickets(2)).toBe(1);
  });

  test('1-player team: minimum 1 wicket', () => {
    expect(getMaxWickets(1)).toBe(1);
  });

  test('5-player team: all out at 4', () => {
    expect(getMaxWickets(5)).toBe(4);
  });
});

// ============================================================
//  3. isOverComplete
// ============================================================
describe('isOverComplete', () => {
  test('5 legal balls — over not done', () => {
    expect(isOverComplete(5)).toBe(false);
  });

  test('6 legal balls — over complete', () => {
    expect(isOverComplete(6)).toBe(true);
  });

  test('0 balls — over not done', () => {
    expect(isOverComplete(0)).toBe(false);
  });

  test('12 balls — over complete (2 overs)', () => {
    expect(isOverComplete(12)).toBe(true);
  });
});

// ============================================================
//  4. shouldRotateStrike
// ============================================================
describe('shouldRotateStrike', () => {
  test('0 runs — no rotation', () => {
    expect(shouldRotateStrike(0)).toBe(false);
  });

  test('1 run — rotate', () => {
    expect(shouldRotateStrike(1)).toBe(true);
  });

  test('2 runs — no rotation', () => {
    expect(shouldRotateStrike(2)).toBe(false);
  });

  test('3 runs — rotate', () => {
    expect(shouldRotateStrike(3)).toBe(true);
  });

  test('4 runs — no rotation (boundary)', () => {
    expect(shouldRotateStrike(4)).toBe(false);
  });

  test('6 runs — no rotation (six)', () => {
    expect(shouldRotateStrike(6)).toBe(false);
  });
});

// ============================================================
//  5. getTeams — batting/fielding assignment
// ============================================================
describe('getTeams', () => {
  test('innings 1 — team1 bats', () => {
    const m = makeMatch({ current_innings: 1 });
    const t = getTeams(m);
    expect(t.battingTeam).toBe('Lions');
    expect(t.fieldingTeam).toBe('Tigers');
    expect(t.battingPlayers).toEqual(['A', 'B', 'C', 'D']);
    expect(t.bowlingPlayers).toEqual(['X', 'Y', 'Z', 'W']);
  });

  test('innings 2 — team2 bats', () => {
    const m = makeMatch({ current_innings: 2 });
    const t = getTeams(m);
    expect(t.battingTeam).toBe('Tigers');
    expect(t.fieldingTeam).toBe('Lions');
  });

  test('innings 3 (super over) — team1 bats', () => {
    const m = makeMatch({ current_innings: 3 });
    const t = getTeams(m);
    expect(t.battingTeam).toBe('Lions');
    expect(t.fieldingTeam).toBe('Tigers');
  });

  test('innings 4 (super over chase) — team2 bats', () => {
    const m = makeMatch({ current_innings: 4 });
    const t = getTeams(m);
    expect(t.battingTeam).toBe('Tigers');
    expect(t.fieldingTeam).toBe('Lions');
  });
});

// ============================================================
//  6. checkInningsEnd — the big one
// ============================================================
describe('checkInningsEnd', () => {
  const maxBalls = 30; // 5 overs
  const maxWickets = 3; // 4-player team

  // ── FIRST INNINGS ──
  describe('first innings', () => {
    test('innings continues — balls and wickets within limit', () => {
      const r = checkInningsEnd(1, 12, maxBalls, 1, maxWickets, 30, undefined, 'Lions', 'Tigers');
      expect(r.nextState).toBe('live');
      expect(r.switchInnings).toBe(false);
    });

    test('innings ends — all overs bowled', () => {
      const r = checkInningsEnd(1, 30, maxBalls, 2, maxWickets, 80, undefined, 'Lions', 'Tigers');
      expect(r.nextState).toBe('innings_break');
      expect(r.target).toBe(81);
      expect(r.switchInnings).toBe(true);
    });

    test('innings ends — all out (3 wickets in 4-player team)', () => {
      const r = checkInningsEnd(1, 18, maxBalls, 3, maxWickets, 45, undefined, 'Lions', 'Tigers');
      expect(r.nextState).toBe('innings_break');
      expect(r.target).toBe(46);
      expect(r.switchInnings).toBe(true);
    });

    test('innings does NOT end at 2 wickets in 4-player team', () => {
      const r = checkInningsEnd(1, 18, maxBalls, 2, maxWickets, 45, undefined, 'Lions', 'Tigers');
      expect(r.nextState).toBe('live');
    });
  });

  // ── SECOND INNINGS ──
  describe('second innings', () => {
    test('batting team wins — chases target', () => {
      const r = checkInningsEnd(2, 20, maxBalls, 1, maxWickets, 82, 81, 'Tigers', 'Lions');
      expect(r.nextState).toBe('completed');
      expect(r.winner).toBe('Tigers'); // batting team wins
    });

    test('batting team wins — exactly meets target', () => {
      const r = checkInningsEnd(2, 20, maxBalls, 0, maxWickets, 81, 81, 'Tigers', 'Lions');
      expect(r.nextState).toBe('completed');
      expect(r.winner).toBe('Tigers');
    });

    test('fielding team wins — all out before target', () => {
      const r = checkInningsEnd(2, 24, maxBalls, 3, maxWickets, 60, 81, 'Tigers', 'Lions');
      expect(r.nextState).toBe('completed');
      expect(r.winner).toBe('Lions'); // fielding team wins
    });

    test('fielding team wins — overs done, score below target', () => {
      const r = checkInningsEnd(2, 30, maxBalls, 2, maxWickets, 70, 81, 'Tigers', 'Lions');
      expect(r.nextState).toBe('completed');
      expect(r.winner).toBe('Lions');
    });

    test('tie — scores level after all out', () => {
      const r = checkInningsEnd(2, 24, maxBalls, 3, maxWickets, 80, 81, 'Tigers', 'Lions');
      expect(r.nextState).toBe('completed');
      expect(r.winner).toBe('tie');
    });

    test('tie — scores level after overs done', () => {
      const r = checkInningsEnd(2, 30, maxBalls, 2, maxWickets, 80, 81, 'Tigers', 'Lions');
      expect(r.nextState).toBe('completed');
      expect(r.winner).toBe('tie');
    });

    test('super over on tie — when allow_super_over is true', () => {
      const r = checkInningsEnd(2, 30, maxBalls, 2, maxWickets, 80, 81, 'Tigers', 'Lions', true);
      expect(r.nextState).toBe('super_over_setup');
    });

    test('match continues — still chasing, balls and wickets OK', () => {
      const r = checkInningsEnd(2, 18, maxBalls, 1, maxWickets, 60, 81, 'Tigers', 'Lions');
      expect(r.nextState).toBe('live');
    });
  });

  // ── EDGE CASES ──
  describe('edge cases', () => {
    test('11-player team — all out at 10 wickets', () => {
      const r = checkInningsEnd(1, 48, 60, 10, 10, 200, undefined, 'Lions', 'Tigers');
      expect(r.nextState).toBe('innings_break');
      expect(r.target).toBe(201);
    });

    test('2-player team — all out at 1 wicket', () => {
      const r = checkInningsEnd(1, 3, 30, 1, 1, 10, undefined, 'Lions', 'Tigers');
      expect(r.nextState).toBe('innings_break');
      expect(r.target).toBe(11);
    });

    test('first ball of match — nothing ends', () => {
      const r = checkInningsEnd(1, 1, 30, 0, 3, 1, undefined, 'Lions', 'Tigers');
      expect(r.nextState).toBe('live');
    });

    test('chasing team wins off first ball of innings 2', () => {
      const r = checkInningsEnd(2, 1, 30, 0, 3, 7, 7, 'Tigers', 'Lions');
      expect(r.nextState).toBe('completed');
      expect(r.winner).toBe('Tigers');
    });

    test('target = 1, score = 0, all out — match tied', () => {
      const r = checkInningsEnd(2, 6, 30, 3, 3, 0, 1, 'Tigers', 'Lions');
      expect(r.nextState).toBe('completed');
      expect(r.winner).toBe('tie');
    });
  });
});

// ============================================================
//  7. formatOvers
// ============================================================
describe('formatOvers', () => {
  test('0 balls = 0.0', () => expect(formatOvers(0)).toBe('0.0'));
  test('1 ball = 0.1', () => expect(formatOvers(1)).toBe('0.1'));
  test('6 balls = 1.0', () => expect(formatOvers(6)).toBe('1.0'));
  test('14 balls = 2.2', () => expect(formatOvers(14)).toBe('2.2'));
  test('30 balls = 5.0', () => expect(formatOvers(30)).toBe('5.0'));
  test('59 balls = 9.5', () => expect(formatOvers(59)).toBe('9.5'));
});

// ============================================================
//  8. getRunRate
// ============================================================
describe('getRunRate', () => {
  test('0 balls = 0.00', () => expect(getRunRate(0, 0)).toBe('0.00'));
  test('30 runs in 12 balls = 15.00', () => expect(getRunRate(30, 12)).toBe('15.00'));
  test('60 runs in 30 balls = 12.00', () => expect(getRunRate(60, 30)).toBe('12.00'));
  test('7 runs in 6 balls = 7.00', () => expect(getRunRate(7, 6)).toBe('7.00'));
});

// ============================================================
//  9. getRequiredRunRate
// ============================================================
describe('getRequiredRunRate', () => {
  test('0 balls remaining = infinity', () => expect(getRequiredRunRate(50, 0)).toBe('∞'));
  test('30 needed from 18 = 10.00', () => expect(getRequiredRunRate(30, 18)).toBe('10.00'));
  test('6 needed from 6 = 6.00', () => expect(getRequiredRunRate(6, 6)).toBe('6.00'));
  test('1 needed from 1 = 6.00', () => expect(getRequiredRunRate(1, 1)).toBe('6.00'));
});

// ============================================================
// 10. Full match simulation — end-to-end
// ============================================================
describe('Full match simulation', () => {
  test('4-player, 2-over match — team1 scores 20, team2 chases and wins', () => {
    const maxBalls = 12;
    const maxWickets = 3;

    // Innings 1: Lions bat, score 20 in 12 balls, 1 wicket
    let result = checkInningsEnd(1, 12, maxBalls, 1, maxWickets, 20, undefined, 'Lions', 'Tigers');
    expect(result.nextState).toBe('innings_break');
    expect(result.target).toBe(21);

    // Innings 2: Tigers chase 21, score 21 off 10 balls
    result = checkInningsEnd(2, 10, maxBalls, 0, maxWickets, 21, 21, 'Tigers', 'Lions');
    expect(result.nextState).toBe('completed');
    expect(result.winner).toBe('Tigers');
  });

  test('4-player, 2-over match — team2 all out while chasing', () => {
    const maxBalls = 12;
    const maxWickets = 3;

    // Innings 1: Lions score 30
    let result = checkInningsEnd(1, 12, maxBalls, 0, maxWickets, 30, undefined, 'Lions', 'Tigers');
    expect(result.nextState).toBe('innings_break');

    // Innings 2: Tigers all out at 25 (3 wickets in 4-player team)
    result = checkInningsEnd(2, 8, maxBalls, 3, maxWickets, 25, 31, 'Tigers', 'Lions');
    expect(result.nextState).toBe('completed');
    expect(result.winner).toBe('Lions');
  });

  test('tie goes to super over when enabled', () => {
    const maxBalls = 12;
    const maxWickets = 3;

    // Innings 1: Lions 30
    let result = checkInningsEnd(1, 12, maxBalls, 2, maxWickets, 30, undefined, 'Lions', 'Tigers');
    expect(result.target).toBe(31);

    // Innings 2: Tigers 30 all out — tie + super over
    result = checkInningsEnd(2, 10, maxBalls, 3, maxWickets, 30, 31, 'Tigers', 'Lions', true);
    expect(result.nextState).toBe('super_over_setup');
  });

  test('11-player full match — 20 overs', () => {
    const maxBalls = 120;
    const maxWickets = 10;

    // First innings: score 150, all overs done
    let result = checkInningsEnd(1, 120, maxBalls, 7, maxWickets, 150, undefined, 'India', 'Australia');
    expect(result.nextState).toBe('innings_break');
    expect(result.target).toBe(151);

    // Second innings: chase successful at ball 110
    result = checkInningsEnd(2, 110, maxBalls, 4, maxWickets, 151, 151, 'Australia', 'India');
    expect(result.nextState).toBe('completed');
    expect(result.winner).toBe('Australia');
  });
});
