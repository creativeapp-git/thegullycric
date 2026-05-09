import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Share, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { COLORS, BORDER_RADIUS } from '../theme';
import { CONFIG } from '../config';
import { Button, Card } from '../components/UI';
import { useNotification } from '../context/NotificationContext';
import {
  buildEditedCommentary,
  canAutoRestoreAfterUndo,
  getActiveBalls,
  getBallResultLabel,
  getCurrentInningsBalls,
  getCurrentLegalBallCount,
  getCurrentScore,
  getCurrentWickets,
  getExtraRunOptions,
  getMaxWicketsForPlayers,
  getOutPlayersForInnings,
  getPhysicalRuns,
  getRunsToBatter,
  getRunsToBowler,
  isEditedBall,
  normalizePlayers,
  restoreStrikeAfterUndo,
} from '../utils/liveScoring';

const APP_URL = 'https://thegullycric.web.app';

export default function PublicMatchScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId } = route.params; // this is the short match_id

  const [match, setMatch] = useState<any>(null);
  const [matchUuid, setMatchUuid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpectator, setIsSpectator] = useState(true);
  const { showNotification } = useNotification();
  const lastBallIdRef = useRef<string | null>(null);
  const lastMatchStateRef = useRef<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState<'Live' | 'Scorecard' | 'Commentary' | 'Insights'>('Live');
  const [matchPlayers, setMatchPlayers] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchScorecard = useCallback(async () => {
    if (!matchUuid) return;
    const { data } = await supabase.from('match_players').select('*').eq('match_id', matchUuid);
    if (data) setMatchPlayers(data);
  }, [matchUuid]);

  useEffect(() => {
    if (activeTab === 'Scorecard') fetchScorecard();
  }, [activeTab, fetchScorecard]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOffline = () => setIsOffline(true);
      const handleOnline = () => setIsOffline(false);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
      setIsOffline(!navigator.onLine);
      return () => {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      };
    }
  }, []);

  const [inningsBalls, setInningsBalls] = useState<any[]>([]);
  const [totalLegalBalls, setTotalLegalBalls] = useState(0);
  const [currentOverNum, setCurrentOverNum] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [selectionType, setSelectionType] = useState<'initial'|'bowler'|'batter'|'wicket'>('initial');
  const [selectedStriker, setSelectedStriker] = useState<string|null>(null);
  const [selectedNonStriker, setSelectedNonStriker] = useState<string|null>(null);
  const [selectedBowler, setSelectedBowler] = useState<string|null>(null);
  const [wicketType, setWicketType] = useState<string|null>(null);
  const [wicketFielder, setWicketFielder] = useState<string|null>(null);
  const [runOutPlayer, setRunOutPlayer] = useState<string|null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingBowlerChange, setPendingBowlerChange] = useState(false);
  const [showExtraPicker, setShowExtraPicker] = useState(false);
  const [pendingExtraType, setPendingExtraType] = useState<'legbye'|'bye'|'wide'|'noball'|null>(null);
  const openSelectionModal = useCallback((type: 'initial'|'bowler'|'batter'|'wicket') => {
    setSelectionType(type);
    setSelectedStriker(null);
    setSelectedNonStriker(null);
    setSelectedBowler(null);
    setWicketType(null);
    setWicketFielder(null);
    setRunOutPlayer(null);
    setShowModal(true);
  }, []);

  const fetchBalls = useCallback(async (uuid: string, innings: number) => {
    try {
      const { data } = await supabase.from('balls').select('*').eq('match_id', uuid).eq('innings', innings).order('created_at', { ascending: true });
      const balls = data || [];
      setInningsBalls(balls);
      const legal = getCurrentLegalBallCount(balls, innings);
      setTotalLegalBalls(legal);
      setCurrentOverNum(Math.floor(legal / 6));
    } catch(e) { console.error('fetchBalls:', e); }
  }, []);

  const fetchMatch = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      setIsLoggedIn(!!uid);
      if (uid) {
        currentUserIdRef.current = uid;
        checkIfFollowing(uid);
      } else {
        currentUserIdRef.current = null;
        setIsFollowing(false);
      }

      // Fetch by short match_id
      const { data } = await supabase.from('matches').select('*').eq('match_id', matchId).single();
      if (data) {
        setMatch(data);
        setMatchUuid(data.id);
        const spectator = !uid || data.created_by !== uid;
        setIsSpectator(spectator);

        if (
          !spectator &&
          data.match_state !== 'completed' &&
          (
            data.match_state === 'setup' ||
            data.match_state === 'super_over_setup' ||
            !data.striker ||
            !data.non_striker ||
            !data.current_bowler
          )
        ) {
          openSelectionModal('initial');
        }
        await fetchBalls(data.id, data.current_innings || 1);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [matchId, fetchBalls, openSelectionModal]);

  const checkIfFollowing = async (uid: string) => {
    const { data } = await supabase.from('match_followers').select('*').eq('match_id', matchId).eq('user_id', uid).maybeSingle();
    setIsFollowing(!!data);
  };

  const toggleFollow = async () => {
    if (!currentUserIdRef.current) return alert("Please login to follow matches");
    
    if (isFollowing) {
      await supabase.from('match_followers').delete().eq('match_id', matchId).eq('user_id', currentUserIdRef.current);
      setIsFollowing(false);
    } else {
      await supabase.from('match_followers').insert({ match_id: matchId, user_id: currentUserIdRef.current });
      setIsFollowing(true);
    }
  };

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  // Realtime — subscribe after we have the UUID
  useEffect(() => {
    if (!matchUuid) return;
    const ch = supabase.channel(`pub:${matchUuid}`)
      // @ts-ignore
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchUuid}` }, (p: any) => {
        setMatch((m: any) => m ? { ...m, ...p.new } : p.new);
        const state = p.new.match_state;
        if (state && state !== lastMatchStateRef.current) {
          lastMatchStateRef.current = state;
          if (state === 'innings_break') showNotification('Innings Break', 'default');
          if (state === 'completed' && p.new.winner) {
            showNotification(p.new.winner === 'tie' ? 'Match Tied!' : `${p.new.winner} won the match!`, 'success');
          }
        }
      })
      // @ts-ignore
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'balls', filter: `match_id=eq.${matchUuid}` }, (p: any) => {
        const ball = p.new;
        if (lastBallIdRef.current === ball.id) return; // Prevent duplicates
        lastBallIdRef.current = ball.id;

        let type: 'default' | 'wicket' | 'boundary' = 'default';
        let msg = '';
        if (ball.is_wicket) {
          type = 'wicket';
          msg = `WICKET! ${ball.dismissed_player || 'Batter'} is out`;
        } else if (ball.runs === 4 && !ball.extra_type) {
          type = 'boundary';
          msg = `FOUR!`;
        } else if (ball.runs === 6 && !ball.extra_type) {
          type = 'boundary';
          msg = `SIX!`;
        } else if (ball.extra_type) {
          if (ball.extra_type === 'wide') msg = `Wide ball`;
          else if (ball.extra_type === 'noball') msg = `No ball`;
          else if (ball.extra_type === 'bye') msg = `${ball.extras} Bye`;
          else if (ball.extra_type === 'legbye') msg = `${ball.extras} Leg Bye`;
        } else if (ball.runs > 0) {
          msg = `${ball.runs} runs`;
        }

        if (msg) showNotification(msg, type);

        setInningsBalls((prev: any[]) => [...prev, ball]);
        if (ball.is_legal !== false) {
          setTotalLegalBalls(prev => {
            const next = prev + 1;
            setCurrentOverNum(Math.floor(next / 6));
            return next;
          });
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchUuid]);

  // ── HELPERS ──
const isLive = match?.match_state === 'live';
  const isSuperOver = match?.current_innings === 3 || match?.current_innings === 4;
  const maxBalls = isSuperOver ? 6 : (match?.overs * 6);
  
  // Dynamic Score Calculation (Single Source of Truth)
  const activeBalls = useMemo(() => getActiveBalls(inningsBalls), [inningsBalls]);
  const currentInningsBalls = useMemo(
    () => getCurrentInningsBalls(inningsBalls, match?.current_innings || 1),
    [inningsBalls, match?.current_innings],
  );
  const currentScore = getCurrentScore(inningsBalls, match?.current_innings || 1);
  const currentWickets = getCurrentWickets(inningsBalls, match?.current_innings || 1);
  
  const scoreField = match?.current_innings === 1 ? 'score1' : 'score2';
  const wicketsField = match?.current_innings === 1 ? 'wickets1' : 'wickets2';
  
  const outPlayers = useMemo(
    () => getOutPlayersForInnings(inningsBalls, match?.current_innings || 1),
    [inningsBalls, match?.current_innings],
  );
  const battingFirst = match?.toss_decision === 'Bat' ? match?.toss_winner : (match?.toss_winner === match?.team1 ? match?.team2 : match?.team1);
  const battingSecond = battingFirst === match?.team1 ? match?.team2 : match?.team1;
  const battingTeamName = match?.current_innings === 1 || match?.current_innings === 3 ? battingFirst : battingSecond;
  
  const battingTeamPlayers = normalizePlayers(battingTeamName === match?.team1 ? (match?.team1_players || match?.team1Players) : (match?.team2_players || match?.team2Players));
  const bowlingTeamPlayers = normalizePlayers(battingTeamName === match?.team1 ? (match?.team2_players || match?.team2Players) : (match?.team1_players || match?.team1Players));
  const availableBatters = battingTeamPlayers.filter((p: string) => !outPlayers.includes(p) && p !== match?.striker && p !== match?.non_striker);
  const availableBowlers = (bowlingTeamPlayers || []).filter((p: string) => p !== match?.last_bowler);
  const maxWickets = getMaxWicketsForPlayers(battingTeamPlayers);
  const getBowlerStats = (bName: string) => {
    const bBalls = activeBalls.filter((b: any) => b.bowler === bName);
    const legal = bBalls.filter((b: any) => b.is_legal !== false).length;
    const runs = bBalls.filter((b: any) => b.extra_type !== 'bye' && b.extra_type !== 'legbye').reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0);
    const wkts = bBalls.filter((b: any) => b.is_wicket && b.wicket_type !== 'runout').length;
    return `${Math.floor(legal / 6)}.${legal % 6}-${runs}-${wkts}`;
  };

  const getBatterStats = (pName: string) => {
    const bBalls = activeBalls.filter(b => b.batter === pName);
    const runs = bBalls.filter(b => b.extra_type !== 'bye' && b.extra_type !== 'legbye').reduce((sum, b) => sum + (b.runs || 0), 0);
    const balls = bBalls.filter(b => b.is_legal !== false).length;
    return `${runs} (${balls})`;
  };

  const handleShare = async () => {
    const url = `${APP_URL}/match/${matchId}`;
    if (!match) return;

    const overs = `${Math.floor(totalLegalBalls / 6)}.${totalLegalBalls % 6}`;
    let lines: string[] = [
      `🏏 ${match.team1} vs ${match.team2}`,
      `Score: ${currentScore}/${currentWickets} (${overs} ov)`,
    ];

    const isChasing = match.current_innings === 2 || match.current_innings === 4;
    if (isChasing && match.target) {
      const runsNeeded = match.target - currentScore;
      const ballsLeft = Math.max(0, maxBalls - totalLegalBalls);
      lines.push(`Target: ${match.target} | ${runsNeeded} needed from ${ballsLeft} balls`);
    }

    if (match.match_state === 'completed' && match.winner) {
      lines.push(match.winner === 'tie' ? '🤝 Match Tied' : `🏆 ${match.winner} won`);
    }

    lines.push(`\n🔥 Join & follow this match on GullyCric:\n${url}`);
    const message = lines.join('\n');

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({ title: 'GullyCric Match', text: message, url });
        } else {
          await navigator.clipboard.writeText(message);
          showNotification('Match details copied to clipboard!', 'default');
        }
      } else {
        await Share.share({ message, url });
      }
    } catch (e) { console.error(e); }
  };

  // ── SCORING LOGIC (creator only) ──
  const updateMatchStats = async (updates: any) => {
    if (!matchUuid) return;
    const { error } = await supabase.from('matches').update(updates).eq('id', matchUuid);
    if (error) throw error;
    setMatch((p: any) => p ? { ...p, ...updates } : p);
  };

  const updatePlayerStats = async (player: string, team: string, stats: any) => {
    if (!matchUuid) return;
    try {
      const { data: existing } = await supabase.from('match_players').select('*').eq('match_id', matchUuid).eq('player_name', player).maybeSingle();
      if (existing) {
        const nextStats = { ...stats };
        for (const k in stats) { if (typeof stats[k] === 'number') nextStats[k] = (existing[k] || 0) + stats[k]; }
        await supabase.from('match_players').update(nextStats).eq('id', existing.id);
      } else {
        await supabase.from('match_players').insert({ match_id: matchUuid, player_name: player, team, ...stats });
      }
    } catch(e) { console.error('Stat update err:', e); }
  };

  const togglePause = async () => {
    if (!matchUuid) return;
    const nextState = match.match_state === 'paused' ? 'live' : 'paused';
    await updateMatchStats({ match_state: nextState });
  };

  const recalculateMatchState = async (balls: any[], undoneBall?: any) => {
    if (!matchUuid) return;
    try {
      const active = getActiveBalls(balls);
      const currentInnings = match?.current_innings || 1;
      const rebuiltInnings =
        undoneBall && Number(undoneBall.innings) < currentInnings && getCurrentInningsBalls(active, currentInnings).length === 0
          ? Number(undoneBall.innings)
          : currentInnings;
      const score1 = getCurrentScore(active, 1);
      const wickets1 = getCurrentWickets(active, 1);
      const score2 = getCurrentScore(active, 2);
      const wickets2 = getCurrentWickets(active, 2);
      const currentOutPlayers = getOutPlayersForInnings(active, rebuiltInnings);

      await supabase.from('match_players').update({
        runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0,
        runs_conceded: 0, balls_bowled: 0, wickets_taken: 0,
        is_out: false
      }).eq('match_id', matchUuid);

      const pStats: Record<string, any> = {};

      active.forEach(b => {
        const pName = b.batter;
        const bName = b.bowler;
        const dName = b.dismissed_player || (b.is_wicket ? b.batter : null);

        if (pName) {
          if (!pStats[pName]) pStats[pName] = { runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0, is_out: false, runs_conceded: 0, balls_bowled: 0, wickets_taken: 0 };
          const isLegal = b.is_legal !== false;
          const runsToBatter = getRunsToBatter({ r: Number(b.runs || 0), type: b.extra_type });
          pStats[pName].runs_scored += runsToBatter;
          if (isLegal) pStats[pName].balls_faced += 1;
          if (runsToBatter === 4) pStats[pName].fours += 1;
          if (runsToBatter === 6) pStats[pName].sixes += 1;
          if (b.is_wicket && dName === pName) pStats[pName].is_out = true;
        }

        if (bName) {
          if (!pStats[bName]) pStats[bName] = { runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0, is_out: false, runs_conceded: 0, balls_bowled: 0, wickets_taken: 0 };
          const isLegal = b.is_legal !== false;
          const runsToBowler = getRunsToBowler({ r: Number(b.runs || 0), e: Number(b.extras || 0), type: b.extra_type });
          pStats[bName].runs_conceded += runsToBowler;
          if (isLegal) pStats[bName].balls_bowled += 1;
          if (b.is_wicket && b.wicket_type !== 'runout') pStats[bName].wickets_taken += 1;
        }
        
        if (dName && dName !== pName) {
          if (!pStats[dName]) pStats[dName] = { runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0, is_out: false, runs_conceded: 0, balls_bowled: 0, wickets_taken: 0 };
          pStats[dName].is_out = true;
        }
      });

      for (const pName of Object.keys(pStats)) {
        await supabase.from('match_players').update(pStats[pName]).eq('match_id', matchUuid).eq('player_name', pName);
      }

      const updates: any = {
        score1, wickets1, score2, wickets2,
        winner: null,
        current_innings: rebuiltInnings,
        target: rebuiltInnings >= 2 ? score1 + 1 : null,
        striker: null,
        non_striker: null,
        current_bowler: null,
        out_players: currentOutPlayers,
        match_state: getCurrentInningsBalls(active, rebuiltInnings).length > 0 ? 'live' : 'setup'
      };
      await updateMatchStats(updates);
      fetchMatch();
    } catch (e) {
      console.error('Recalculate error:', e);
    }
  };

  const handleUndo = async () => {
    if (isSubmitting || !matchUuid) return;
    const undo = async () => {
      setIsSubmitting(true);
      try {
        const { data: ballsBeforeUndo } = await supabase
          .from('balls')
          .select('*')
          .eq('match_id', matchUuid)
          .order('created_at', { ascending: true });
        const undoWindow = getActiveBalls(ballsBeforeUndo || []).slice(-6);
        if (!undoWindow.length) {
          setErrorMessage('You can only undo within the last 6 balls of this innings.');
          return;
        }
        const lastBall = undoWindow[undoWindow.length - 1];
        const { error: updateError } = await supabase.from('balls').update({
          commentary_text: buildEditedCommentary(lastBall),
          ball: Number(lastBall.ball || 0) + 1000 + undoWindow.length,
        }).eq('id', lastBall.id);
        if (updateError) throw updateError;

        const { data: balls } = await supabase
          .from('balls')
          .select('*')
          .eq('match_id', matchUuid)
          .order('created_at', { ascending: true });
        await recalculateMatchState(balls || [], lastBall);
        const rebuiltInnings =
          Number(lastBall.innings) < (match.current_innings || 1) && getCurrentInningsBalls(getActiveBalls(balls || []), match.current_innings || 1).length === 0
            ? Number(lastBall.innings)
            : match.current_innings || 1;
        const legalAfterUndo = getCurrentLegalBallCount(balls || [], rebuiltInnings);
        if (canAutoRestoreAfterUndo(lastBall, rebuiltInnings, match.match_state)) {
          const restored = restoreStrikeAfterUndo(match.striker || null, match.non_striker || null, lastBall, legalAfterUndo);
          await updateMatchStats({
            striker: restored.striker,
            non_striker: restored.nonStriker,
            current_bowler: lastBall.bowler || null,
            match_state: 'live',
          });
        } else {
          openSelectionModal('initial');
        }
        await fetchBalls(matchUuid, rebuiltInnings);
      } catch (e) { console.error(e); }
      finally { setIsSubmitting(false); }
    };

    if (Platform.OS === 'web') {
      if (!window.confirm('Undo the latest ball? It will stay visible as edited.')) return;
      undo();
      return;
    }

    Alert.alert("Undo", "Undo the latest ball? It will stay visible as edited.", [
      { text: "Cancel", style: "cancel" },
      { text: "Undo", style: "destructive", onPress: undo }
    ]);
  };

  const handleAddBall = async (p: { r: number; e: number; type?: string; isW?: boolean; wType?: string; dismissedPlayer?: string }) => {
    if (isSubmitting || !isLive || isSpectator || isOffline) return;
    if (!match?.striker || !match?.non_striker || !match?.current_bowler) {
      openSelectionModal('initial');
      setErrorMessage('Select striker, non-striker, and bowler before scoring.');
      return;
    }

    setIsSubmitting(true); setErrorMessage('');
    try {
      // Pre-flight check to block duplicate insertions
      const { data: lastBall } = await supabase.from('balls').select('over, ball').eq('match_id', matchUuid).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const targetBallNum = currentInningsBalls.length + 1;
      if (lastBall && lastBall.over === currentOverNum && lastBall.ball === targetBallNum) {

        setTimeout(() => setIsSubmitting(false), 300); // 300ms debounce
        return;
      }

      const isLegal = p.type !== 'wide' && p.type !== 'noball';
      const isByeOrLegBye = p.type === 'bye' || p.type === 'legbye';
      const ballRuns = p.type === 'wide' ? 0 : p.r;
      const ballExtras = p.e;
      const runsToBatter = getRunsToBatter(p);
      const runsToBowler = getRunsToBowler(p);
      const wTypeNormalized = p.wType ? p.wType.toLowerCase().replace(/\s/g, '') : null;

      try {
        const { error: insertError } = await supabase.from('balls').insert({
          match_id: matchUuid, innings: match.current_innings, over: currentOverNum, ball: targetBallNum,
          runs: ballRuns, extras: ballExtras, extra_type: p.type || null, is_legal: isLegal,
          is_wicket: !!p.isW, wicket_type: wTypeNormalized, dismissed_player: p.dismissedPlayer || null,
          batter: match.striker, bowler: match.current_bowler, fielder: wicketFielder
        });
        if (insertError) {
          if (insertError.code === '23505') {

            setTimeout(() => setIsSubmitting(false), 300);
            return;
          }
          throw insertError;
        }
      } catch (err: any) {
        throw err;
      }

      const bTeam = battingTeamName || match.team1;
      const fTeam = bTeam === match.team1 ? match.team2 : match.team1;
      await updatePlayerStats(match.striker, bTeam, { runs_scored: runsToBatter, balls_faced: isLegal ? 1 : 0, fours: runsToBatter === 4 ? 1 : 0, sixes: runsToBatter === 6 ? 1 : 0 });
      await updatePlayerStats(match.current_bowler, fTeam, { runs_conceded: isByeOrLegBye ? 0 : runsToBowler, balls_bowled: isLegal ? 1 : 0, wickets_taken: p.isW && wTypeNormalized !== 'runout' ? 1 : 0 });
      if (p.isW && p.dismissedPlayer) await updatePlayerStats(p.dismissedPlayer, bTeam, { is_out: true });

      let nextStriker = match.striker, nextNon = match.non_striker, nextBowler = match.current_bowler;
      let lastBowler = match.last_bowler, nextState = 'live';
      const dismissedPlayer = p.dismissedPlayer || match.striker;
      const nextOut = p.isW ? Array.from(new Set([...outPlayers, dismissedPlayer])) : [...outPlayers];
      const newScore = currentScore + ballRuns + ballExtras;
      const newWickets = currentWickets + (p.isW ? 1 : 0);
      const physicalRuns = getPhysicalRuns(p);
      const newTotalLegal = totalLegalBalls + (isLegal ? 1 : 0);
      const inningsFinished = newTotalLegal >= maxBalls || newWickets >= (isSuperOver ? 2 : maxWickets);
      const remainingBatters = battingTeamPlayers.filter((player) => !nextOut.includes(player));

      if (p.isW) {
        if (!inningsFinished && remainingBatters.length > 0) nextState = 'wicket_fall';
        if (dismissedPlayer === match.striker) nextStriker = null;
        if (dismissedPlayer === match.non_striker) nextNon = null;
      } else if (physicalRuns % 2 !== 0) { [nextStriker, nextNon] = [nextNon, nextStriker]; }

      const isOverEnd = isLegal && (newTotalLegal % 6 === 0);
      if (isOverEnd && !inningsFinished) { [nextStriker, nextNon] = [nextNon, nextStriker]; lastBowler = nextBowler; nextBowler = null; setPendingBowlerChange(true); if (nextState !== 'wicket_fall') nextState = 'over_break'; }

      const isChasing = match.current_innings === 2 || match.current_innings === 4;
      let winner = match.winner, newTarget = match.target;
      const battingTeam = battingTeamName || match.team1;
      const fieldingTeam = battingTeam === match.team1 ? match.team2 : match.team1;
      if (isChasing) {
        let target = match.target;
        if (match.current_innings === 4 && !target) {
          target = match.target;
        } else if (match.current_innings === 2) {
          target = match.target || ((match.score1 || 0) + 1);
        }

        if (target && newScore >= target) { 
          nextState = 'completed'; 
          winner = battingTeam; 
        }
        else if (inningsFinished) {
          if (target && newScore === target - 1) {
            if (match.current_innings === 2 && match.allow_super_over) {
              nextState = 'super_over_setup';
            } else {
              nextState = 'completed';
              winner = 'tie';
            }
          } else {
            nextState = 'completed';
            winner = fieldingTeam;
          }
        }
      } else {
        if (inningsFinished) { 
          nextState = isSuperOver ? 'super_over_break' : 'innings_break'; 
          newTarget = newScore + 1; 
        }
      }

      const updates: any = { striker: nextStriker, non_striker: nextNon, current_bowler: nextBowler, last_bowler: lastBowler, match_state: nextState, out_players: nextOut };
      if (!isSuperOver) {
        updates[scoreField] = newScore;
        updates[wicketsField] = newWickets;
      }
      
      if (nextState === 'innings_break') {
        updates.current_innings = 2;
        updates.striker = null;
        updates.non_striker = null;
        updates.current_bowler = null;
        updates.last_bowler = null;
        updates.out_players = [];
      } else if (nextState === 'super_over_setup') {
        updates.current_innings = 3;
        updates.target = null;
        updates.out_players = [];
        updates.striker = null;
        updates.non_striker = null;
        updates.current_bowler = null;
        updates.last_bowler = null;
      } else if (nextState === 'super_over_break') {
        updates.current_innings = 4;
        updates.target = newTarget;
        updates.out_players = [];
        updates.striker = null;
        updates.non_striker = null;
        updates.current_bowler = null;
        updates.last_bowler = null;
      }
      
      if (winner && nextState !== 'super_over_setup' && nextState !== 'super_over_break') updates.winner = winner;
      if (newTarget) updates.target = newTarget;
      await updateMatchStats(updates);
      if (matchUuid) await fetchBalls(matchUuid, match.current_innings);

      if (nextState === 'innings_break') { openSelectionModal('initial'); }
      else if (nextState === 'wicket_fall') { openSelectionModal('batter'); }
      else if (nextState === 'over_break') { openSelectionModal('bowler'); }
      else if (nextState === 'super_over_setup' || nextState === 'super_over_break') { openSelectionModal('initial'); }
      
      setTimeout(() => setIsSubmitting(false), 300); // 300ms debounce
    } catch(e: any) { 
      console.error('Add ball failed:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
      setErrorMessage(e.message); 
      setIsSubmitting(false);
    }
    finally { setWicketFielder(null); setRunOutPlayer(null); setWicketType(null); }
  };

  const handleConfirmSelection = async () => {
    if (isSubmitting || isSpectator) return;
    if (selectionType === 'wicket') {
      const dismissed = wicketType === 'Run Out' ? runOutPlayer : match.striker;
      if (!dismissed) return;
      setShowModal(false);
      handleAddBall({ r: 0, e: 0, isW: true, wType: wicketType!, dismissedPlayer: dismissed });
      return;
    }
    setIsSubmitting(true);
    try {
      const updates: any = { match_state: 'live' };
      if (selectedStriker) updates.striker = selectedStriker;
      if (selectedNonStriker) updates.non_striker = selectedNonStriker;
      if (selectedBowler) updates.current_bowler = selectedBowler;
      await updateMatchStats(updates);
      setShowModal(false);
    } catch(e) {}
    finally { 
      if (selectionType === 'batter' && pendingBowlerChange) {
        setPendingBowlerChange(false);
        setTimeout(() => { setSelectedBowler(null); setSelectionType('bowler'); setShowModal(true); }, 300);
      } else if (selectionType === 'bowler' || selectionType === 'initial') {
        setPendingBowlerChange(false);
      }
      setTimeout(() => setIsSubmitting(false), 300);
    }
  };

  const handleSwapStrikers = async () => {
    if (isSubmitting || isSpectator || !match?.striker || !match?.non_striker) return;
    setIsSubmitting(true);
    try {
      await updateMatchStats({
        striker: match.non_striker,
        non_striker: match.striker
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfirmDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (selectionType === 'initial') return !selectedStriker || !selectedNonStriker || !selectedBowler || selectedStriker === selectedNonStriker;
    if (selectionType === 'bowler') return !selectedBowler;
    if (selectionType === 'batter') return !selectedStriker;
    if (selectionType === 'wicket') return !wicketType || (wicketType === 'Caught' && !wicketFielder) || (wicketType === 'Run Out' && !runOutPlayer);
    return true;
  }, [selectionType, selectedStriker, selectedNonStriker, selectedBowler, wicketType, wicketFielder, runOutPlayer, isSubmitting]);

  const renderSelector = (title: string, list: string[], current: string | null, onSelect: any) => (
    <View style={s.selectorSection}>
      <Text style={s.selectorTitle}>{title}</Text>
      <View style={s.chipContainer}>{list.map(p => (<TouchableOpacity key={p} style={[s.chip, current === p && s.chipActive]} onPress={() => onSelect(p)}><Text style={[s.chipText, current === p && s.chipTextActive]}>{p}</Text></TouchableOpacity>))}</View>
    </View>
  );

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!match) return (
    <View style={s.container}>
      {isOffline && (
        <View style={{ backgroundColor: '#EF4444', padding: 8, alignItems: 'center' }}>
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>You are offline. Reconnecting...</Text>
        </View>
      )}
      <View style={s.center}>
        <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
        <Text style={{ marginTop: 12, fontWeight: '700', color: COLORS.text }}>Match Not Found</Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 4 }}>ID: {matchId}</Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      {isOffline && (
        <View style={{ backgroundColor: '#EF4444', padding: 8, alignItems: 'center' }}>
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>You are offline. Reconnecting...</Text>
        </View>
      )}
      {!isSpectator && (
        <Modal visible={showExtraPicker} transparent animationType="fade">
          <View style={s.modalOverlay}><View style={[s.modalContent, { maxHeight: '60%' }]}>
            <Text style={s.modalHeading}>{
              pendingExtraType === 'legbye' ? 'LEG BYES' : 
              pendingExtraType === 'noball' ? 'RUNS OFF NO BALL' : 
              pendingExtraType === 'wide' ? 'EXTRA WIDE RUNS' : 'BYES'
            }</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 16, flexWrap: 'wrap' }}>
              {getExtraRunOptions(pendingExtraType).map(n => (
                <TouchableOpacity key={n} style={[s.controlBtn, { flex: 0, width: 72, height: 72, margin: 8 }]} onPress={() => {
                  setShowExtraPicker(false);
                  if (pendingExtraType === 'noball') {
                    handleAddBall({ r: n, e: match?.rules?.noBallExtraRun !== false ? 1 : 0, type: 'noball' });
                  } else if (pendingExtraType === 'wide') {
                    handleAddBall({ r: 0, e: n + (match?.rules?.wideExtraRun !== false ? 1 : 0), type: 'wide' });
                  } else {
                    handleAddBall({ r: 0, e: n, type: pendingExtraType! });
                  }
                }}>
                  <Text style={s.controlText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setShowExtraPicker(false)} style={{ alignItems: 'center', marginTop: 16, padding: 12 }}>
              <Text style={{ color: COLORS.textSecondary, fontWeight: '700', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View></View>
        </Modal>
      )}
      {/* Selection Modal (creator only) */}
      {!isSpectator && (
        <Modal visible={showModal} transparent animationType="slide">
          <View style={s.modalOverlay}><View style={s.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalHeading}>{selectionType.toUpperCase()}</Text>
              {selectionType === 'initial' && <>{renderSelector('Striker', availableBatters, selectedStriker, setSelectedStriker)}{renderSelector('Non-Striker', availableBatters.filter((p: string) => p !== selectedStriker), selectedNonStriker, setSelectedNonStriker)}{renderSelector('Bowler', availableBowlers, selectedBowler, setSelectedBowler)}</>}
              {selectionType === 'bowler' && renderSelector('Bowler', availableBowlers, selectedBowler, setSelectedBowler)}
              {selectionType === 'batter' && renderSelector('Next Batter', availableBatters.filter((p: string) => p !== match?.non_striker), selectedStriker, setSelectedStriker)}
              {selectionType === 'wicket' && <>
                {renderSelector('Wicket Type', ['Bowled', 'Caught', 'Run Out', 'LBW', 'Stumped'], wicketType, setWicketType)}
                {wicketType === 'Caught' && renderSelector('Fielder', bowlingTeamPlayers || [], wicketFielder, setWicketFielder)}
                {wicketType === 'Run Out' && renderSelector('Dismissed', [match?.striker, match?.non_striker].filter(Boolean), runOutPlayer, setRunOutPlayer)}
              </>}
            </ScrollView>
            <Button title="Confirm" onPress={handleConfirmSelection} loading={isSubmitting} disabled={isConfirmDisabled} style={{ marginTop: 20 }} />
          </View></View>
        </Modal>
      )}

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('App')}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{match.team1} vs {match.team2}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={toggleFollow} style={s.shareBtn}>
            <Ionicons name={isFollowing ? "heart" : "heart-outline"} size={22} color={isFollowing ? COLORS.danger : COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={async () => {
            if (!matchUuid) return;
            const origin = Platform.OS === 'web' ? window.location.origin : CONFIG.APP_URL;
            const url = `${origin}/match/${matchUuid}`;
            await Share.share({ message: `Follow the match live at: ${url}` });
          }} style={s.shareBtn}>
            <Ionicons name="share-social" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Winner Banner */}
        {match.match_state === 'completed' && match.winner && (
          <View style={s.winnerBanner}>
            <Text style={s.winnerText}>{match.winner === 'tie' ? '🤝 MATCH TIED' : `🏆 ${match.winner.toUpperCase()} WINS!`}</Text>
          </View>
        )}

        {/* Scoreboard */}
        <Card style={s.mainCard}>
          {isSuperOver && (
            <View style={s.superOverBadge}>
              <Text style={s.superOverBadgeText}>SUPER OVER</Text>
            </View>
          )}
          <Text style={s.scoreText}>{currentScore}/{currentWickets}</Text>
          <Text style={s.overText}>Overs: {Math.floor(totalLegalBalls / 6)}.{totalLegalBalls % 6}</Text>
          {(match.current_innings === 2 || match.current_innings === 4) && match.match_state !== 'completed' && match.target && (
            <Text style={[s.overText, { color: '#FCD34D', marginTop: 4 }]}>
              {Math.max(0, match.target - currentScore)} runs needed in {Math.max(0, maxBalls - totalLegalBalls)} balls
            </Text>
          )}
          <View style={s.playersRow}>
            <View style={s.playerCol}>
              <Text style={s.playerRole}>BATTER</Text>
              <Text style={s.playerName}>🏏 {match?.striker || '-'}</Text>
              <Text style={s.playerStats}>{match?.striker ? getBatterStats(match.striker) : ''}</Text>
            </View>
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              {!isSpectator && (
                <TouchableOpacity onPress={handleSwapStrikers} style={s.swapBtn}>
                  <Ionicons name="swap-horizontal" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={s.playerCol}>
              <Text style={s.playerRole}>NON-STRIKER</Text>
              <Text style={s.playerName}>🏃 {match?.non_striker || '-'}</Text>
              <Text style={s.playerStats}>{match?.non_striker ? getBatterStats(match.non_striker) : ''}</Text>
            </View>
            <View style={s.playerBox}><Text style={s.pLabel}>BOWLER</Text><Text style={s.pName}>⚾ {match.current_bowler || '-'}{'\n'}({getBowlerStats(match.current_bowler || '')})</Text></View>
          </View>
        </Card>

        {errorMessage ? <Text style={{ color: COLORS.danger, marginBottom: 10 }}>{errorMessage}</Text> : null}

        {/* TABS */}
        <View style={s.tabsContainer}>
          {['Live', 'Scorecard', 'Commentary', 'Insights'].map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'Live' && (
          <>
            {/* Role-based controls */}
            {!isSpectator ? (
              <View style={[s.controls, (!isLive || isSubmitting) && { opacity: 0.4 }]} pointerEvents={isLive && !isSubmitting ? 'auto' : 'none'}>
                <View style={s.row}>{[0, 1, 2, 3].map(r => (<TouchableOpacity key={r} style={s.controlBtn} onPress={() => handleAddBall({ r, e: 0 })}><Text style={s.controlText}>{r}</Text></TouchableOpacity>))}</View>
                <View style={s.row}>
                  {[4, 6].map(r => (<TouchableOpacity key={r} style={[s.controlBtn, s.boundaryBtn]} onPress={() => handleAddBall({ r, e: 0 })}><Text style={[s.controlText, s.boundaryText]}>{r}</Text></TouchableOpacity>))}
                  <TouchableOpacity style={[s.controlBtn, s.extraBtn]} onPress={() => { setPendingExtraType('wide'); setShowExtraPicker(true); }}><Text style={s.controlText}>WD</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.controlBtn, s.extraBtn]} onPress={() => { setPendingExtraType('noball'); setShowExtraPicker(true); }}><Text style={s.controlText}>NB</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.controlBtn, s.extraBtn]} onPress={() => { setPendingExtraType('legbye'); setShowExtraPicker(true); }}><Text style={s.controlText}>LB/B</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.controlBtn, {backgroundColor: '#F59E0B'}]} onPress={() => {
                    if (Platform.OS === 'web') {
                      if (window.confirm('Pause match?')) updateMatchStats({ match_state: 'paused' });
                      return;
                    }
                    Alert.alert('Pause Match', 'Select break type:', [
                      { text: 'Drinks Break', onPress: () => updateMatchStats({ match_state: 'paused' }) },
                      { text: 'Rain', onPress: () => updateMatchStats({ match_state: 'paused' }) },
                      { text: 'Other', onPress: () => updateMatchStats({ match_state: 'paused' }) },
                      { text: 'Cancel', style: 'cancel' }
                    ]);
                  }}>
                    <Text style={[s.controlText, {color:COLORS.white, fontSize: 13, fontWeight: '700'}]}>BREAK</Text>
                  </TouchableOpacity>
                </View>
                <View style={s.row}>
                  <TouchableOpacity style={[s.controlBtn, s.wicketBtn]} onPress={() => { setSelectionType('wicket'); setShowModal(true); }}><Text style={[s.controlText, { color: COLORS.white }]}>WKT</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.controlBtn, s.undoBtn]} onPress={handleUndo}><Text style={[s.controlText, { color: '#EF4444' }]}>UNDO</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={s.spectatorCard}>
                <Ionicons name="eye" size={28} color="#94A3B8" />
                <Text style={s.spectatorTitle}>SPECTATOR MODE</Text>
                <Text style={s.spectatorStatus}>MATCH STATUS: {match.match_state?.toUpperCase().replace(/_/g, ' ')}</Text>
                {!isLoggedIn && (
                  <TouchableOpacity style={s.loginCta} onPress={() => navigation.navigate('Auth')}>
                    <Text style={s.loginCtaText}>Login to score matches →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!isSpectator && (
              <View style={s.hostControls}>
                <TouchableOpacity 
                  style={[s.hostBtn, { borderColor: '#E2E8F0' }]} 
                  onPress={togglePause}
                >
                  <Ionicons name={match.match_state === 'paused' ? "play" : "pause"} size={18} color={COLORS.text} />
                  <Text style={s.hostBtnText}>{match.match_state === 'paused' ? "Resume" : "Pause"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {activeTab === 'Scorecard' && (
          <View style={{ gap: 16 }}>
            {[1, 2].map((inningsNum) => {
              if (match.current_innings < inningsNum) return null;
              const team = inningsNum === 1 ? match.team1 : match.team2;
              const teamPlayers = matchPlayers.filter(p => p.team === team);
              const batters = teamPlayers.filter(p => p.balls_faced > 0 || p.is_out || p.player_name === match.striker || p.player_name === match.non_striker);
              
              const bowlingTeam = inningsNum === 1 ? match.team2 : match.team1;
              const bowlers = matchPlayers.filter(p => p.team === bowlingTeam && p.balls_bowled > 0);
              
              return (
                <Card key={inningsNum} style={{ padding: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: 12, color: COLORS.primary }}>{team} Innings</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={s.overStrip}>
                      {Object.entries(
                        inningsBalls
                          .filter((ball: any) => Number(ball.innings) === inningsNum)
                          .reduce((acc: Record<number, any[]>, ball: any) => {
                            const over = Number(ball.over || 0);
                            if (!acc[over]) acc[over] = [];
                            acc[over].push(ball);
                            return acc;
                          }, {})
                      ).map(([over, balls]) => (
                        <View key={`score-over-${inningsNum}-${over}`} style={s.overCard}>
                          <Text style={s.overCardTitle}>Over {Number(over) + 1}</Text>
                          <View style={s.ballPillRow}>
                            {(balls as any[]).map((ball) => (
                              <View key={ball.id} style={[s.ballPill, ball.is_wicket && s.ballPillWicket, isEditedBall(ball) && s.ballPillEdited]}>
                                <Text style={[s.ballPillText, ball.is_wicket && s.ballPillTextLight]}>{getBallResultLabel(ball)}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                  
                  {/* Batting */}
                  <View style={s.tableHeader}>
                    <Text style={[s.colName, s.colHeader, {fontWeight: '900', color: '#111827'}]}>Batter</Text>
                    <Text style={[s.colNum, s.colHeader, {fontWeight: '900', color: '#111827'}]}>R</Text>
                    <Text style={[s.colNum, s.colHeader, {fontWeight: '900', color: '#111827'}]}>B</Text>
                    <Text style={[s.colNum, s.colHeader, {fontWeight: '900', color: '#111827'}]}>4s</Text>
                    <Text style={[s.colNum, s.colHeader, {fontWeight: '900', color: '#111827'}]}>6s</Text>
                    <Text style={[s.colNum, s.colHeader, {flex: 1.5, fontWeight: '900', color: '#111827'}]}>SR</Text>
                  </View>
                  {batters.map((b, i) => {
                    const isStriker = b.player_name === match?.striker;
                    const isNonStriker = b.player_name === match?.non_striker;
                    return (
                    <View key={i} style={[s.tableRow, isStriker && {backgroundColor: '#ECFDF5', paddingHorizontal: 4, borderRadius: 4}]}>
                      <View style={s.colName}>
                        <Text style={{fontWeight: isStriker ? '900' : '600', color: isStriker ? '#047857' : '#111827'}} numberOfLines={1}>
                          {b.player_name} {isStriker ? '🏏' : isNonStriker ? '🏃' : ''}
                        </Text>
                        <Text style={s.outStr}>{b.is_out ? 'out' : 'not out'}</Text>
                      </View>
                      <Text style={[s.colNum, {fontWeight: '700'}]}>{b.runs_scored}</Text>
                      <Text style={s.colNum}>{b.balls_faced}</Text>
                      <Text style={s.colNum}>{b.fours || 0}</Text>
                      <Text style={s.colNum}>{b.sixes || 0}</Text>
                      <Text style={[s.colNum, {flex: 1.5}]}>{b.balls_faced > 0 ? ((b.runs_scored / b.balls_faced) * 100).toFixed(1) : '0.0'}</Text>
                    </View>
                  )})}

                  {/* Bowling */}
                  <View style={[s.tableHeader, { marginTop: 16 }]}>
                    <Text style={[s.colName, s.colHeader, {fontWeight: '900', color: '#111827'}]}>Bowler</Text>
                    <Text style={[s.colNum, s.colHeader, {fontWeight: '900', color: '#111827'}]}>O</Text>
                    <Text style={[s.colNum, s.colHeader, {fontWeight: '900', color: '#111827'}]}>M</Text>
                    <Text style={[s.colNum, s.colHeader, {fontWeight: '900', color: '#111827'}]}>R</Text>
                    <Text style={[s.colNum, s.colHeader, {fontWeight: '900', color: '#111827'}]}>W</Text>
                    <Text style={[s.colNum, s.colHeader, {flex: 1.5, fontWeight: '900', color: '#111827'}]}>Econ</Text>
                  </View>
                  {bowlers.map((b, i) => {
                    const overs = Math.floor(b.balls_bowled / 6) + (b.balls_bowled % 6) / 10;
                    return (
                      <View key={i} style={s.tableRow}>
                        <View style={s.colName}><Text style={{fontWeight: '600'}} numberOfLines={1}>{b.player_name}</Text></View>
                        <Text style={s.colNum}>{overs}</Text>
                        <Text style={s.colNum}>0</Text>
                        <Text style={s.colNum}>{b.runs_conceded}</Text>
                        <Text style={[s.colNum, {fontWeight: '700'}]}>{b.wickets_taken}</Text>
                        <Text style={[s.colNum, {flex: 1.5}]}>{b.balls_bowled > 0 ? ((b.runs_conceded / b.balls_bowled) * 6).toFixed(1) : '0.0'}</Text>
                      </View>
                    );
                  })}
                </Card>
              );
            })}
          </View>
        )}

        {activeTab === 'Commentary' && (
          <Card style={{ padding: 16 }}>
            {inningsBalls.length === 0 ? (
              <Text style={s.emptyText}>No commentary available yet.</Text>
            ) : (
              Object.entries(
                (() => {
                  const legalCounts: Record<number, number> = {};
                  const mappedBalls = inningsBalls.map(ball => {
                    if (!legalCounts[ball.over]) legalCounts[ball.over] = 0;
                    if (ball.is_legal) legalCounts[ball.over] += 1;
                    return { ...ball, displayBall: legalCounts[ball.over] };
                  });
                  return [...mappedBalls].reverse().reduce((acc, ball) => {
                    if (!acc[ball.over]) acc[ball.over] = [];
                    acc[ball.over].push(ball);
                    return acc;
                  }, {} as Record<number, any[]>);
                })()
              )
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([overNum, ballsInOver]) => {
                const typedBalls = ballsInOver as any[];
                return (
                <View key={`over-${overNum}`} style={{ marginBottom: 16 }}>
                  <View style={{ backgroundColor: '#F1F5F9', padding: 10, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '800', color: COLORS.text, fontSize: 13 }}>OVER {Number(overNum) + 1}</Text>
                    <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' }}>
                      {typedBalls.reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0)} runs • {typedBalls.filter((b: any) => b.is_wicket).length} wickets
                    </Text>
                  </View>
                  {typedBalls.map((ball: any, i: number) => {
                    const overStr = `${ball.over}.${ball.displayBall}`;
                    let eventText = `${ball.bowler} to ${ball.batter}`;
                    let runText = ball.runs > 0 ? `${ball.runs} runs` : 'no run';
                    let highlightStyle = {};
                    
                    if (ball.commentary_text) {
                      runText = ball.commentary_text;
                    } else if (ball.is_wicket) {
                      runText = `WICKET! ${ball.dismissed_player || 'Batter'} is out`;
                      highlightStyle = { color: COLORS.danger };
                    } else if (ball.extra_type) {
                      if (ball.extra_type === 'wide') runText = `Wide`;
                      else if (ball.extra_type === 'noball') runText = `No ball`;
                      else if (ball.extra_type === 'bye') runText = `${ball.extras} Byes`;
                      else if (ball.extra_type === 'legbye') runText = `${ball.extras} Leg Byes`;
                    } else if (ball.runs === 4) {
                      runText = `FOUR runs!`;
                      highlightStyle = { color: '#10B981' };
                    } else if (ball.runs === 6) {
                      runText = `SIX runs!`;
                      highlightStyle = { color: '#10B981' };
                    }

                    return (
                      <View key={ball.id || i} style={s.commentaryRow}>
                        <View style={s.commOvers}><Text style={s.commOversText}>{overStr}</Text></View>
                        <View style={s.commDetails}>
                          <Text style={s.commMainText}>{eventText}, <Text style={[s.commRunText, highlightStyle]}>{runText}</Text></Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                );
              })
            )}
          </Card>
        )}

        {activeTab === 'Insights' && (() => {
          // Compute all balls for both innings
          const allBallsForInsights = inningsBalls;

          // Compute per-over data for current innings
          const runsPerOver: Record<number, number> = {};
          const wicketsPerOver: Record<number, number> = {};
          let cumulative = 0;
          const cumulativeByOver: Record<number, number> = {};
          
          allBallsForInsights.forEach(b => {
            const o = b.over;
            runsPerOver[o] = (runsPerOver[o] || 0) + (b.runs || 0) + (b.extras || 0);
            if (b.is_wicket) wicketsPerOver[o] = (wicketsPerOver[o] || 0) + 1;
          });

          const overKeys = Object.keys(runsPerOver).map(Number).sort((a, b) => a - b);
          overKeys.forEach(o => {
            cumulative += runsPerOver[o];
            cumulativeByOver[o] = cumulative;
          });

          const maxOverRuns = Math.max(...Object.values(runsPerOver), 6);
          const maxCumulative = Math.max(...Object.values(cumulativeByOver), 1);

          // Scoring breakdown
          let dots = 0, ones = 0, twos = 0, threes = 0, fours = 0, sixes = 0, extras = 0;
          allBallsForInsights.forEach(b => {
            if (b.extra_type) { extras++; return; }
            const r = b.runs || 0;
            if (r === 0) dots++;
            else if (r === 1) ones++;
            else if (r === 2) twos++;
            else if (r === 3) threes++;
            else if (r === 4) fours++;
            else if (r === 6) sixes++;
          });
          const totalDeliveries = dots + ones + twos + threes + fours + sixes + extras;

          // Run rate per over
          const runRateByOver: Record<number, number> = {};
          let runsSoFar = 0;
          overKeys.forEach((o, idx) => {
            runsSoFar += runsPerOver[o];
            runRateByOver[o] = parseFloat((runsSoFar / (idx + 1)).toFixed(2));
          });
          const maxRR = Math.max(...Object.values(runRateByOver), 1);

          // Color palette for scoring zones
          const zoneColors: Record<string, string> = {
            Dots: '#94A3B8', '1s': '#38BDF8', '2s': '#10B981',
            '3s': '#F59E0B', '4s': '#8B5CF6', '6s': '#EF4444', 'Extras': '#F97316'
          };
          const zones = [
            { label: 'Dots', count: dots, color: zoneColors.Dots },
            { label: '1s', count: ones, color: zoneColors['1s'] },
            { label: '2s', count: twos, color: zoneColors['2s'] },
            { label: '3s', count: threes, color: zoneColors['3s'] },
            { label: '4s', count: fours, color: zoneColors['4s'] },
            { label: '6s', count: sixes, color: zoneColors['6s'] },
            { label: 'Extras', count: extras, color: zoneColors.Extras },
          ].filter(z => z.count > 0);

          const currentRR = totalLegalBalls > 0 ? ((currentScore / totalLegalBalls) * 6).toFixed(2) : '0.00';
          const boundaryPerc = totalDeliveries > 0 ? (((fours + sixes) / totalDeliveries) * 100).toFixed(1) : '0.0';
          const dotPerc = totalDeliveries > 0 ? ((dots / totalDeliveries) * 100).toFixed(1) : '0.0';

          return (
            <View style={{ gap: 16 }}>
              {/* ── RUNS PER OVER ── */}
              <Card style={{ padding: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', marginBottom: 16, color: COLORS.primary }}>📊 Runs Per Over</Text>
                {overKeys.length === 0 ? (
                  <Text style={s.emptyText}>No data yet.</Text>
                ) : (
                  <>
                    <View style={{ height: 180, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', borderLeftWidth: 1, borderLeftColor: '#E2E8F0', paddingBottom: 4, paddingLeft: 4 }}>
                      {overKeys.map(over => {
                        const runs = runsPerOver[over];
                        const height = (runs / maxOverRuns) * 160;
                        const hasWicket = (wicketsPerOver[over] || 0) > 0;
                        return (
                          <View key={over} style={{ flex: 1, alignItems: 'center' }}>
                            {hasWicket && <Text style={{ fontSize: 8, color: COLORS.danger, fontWeight: '800', marginBottom: 2 }}>W</Text>}
                            <View style={{ width: '70%', height: Math.max(height, 2), backgroundColor: hasWicket ? COLORS.danger : COLORS.primary, borderRadius: 4, justifyContent: 'flex-end' }}>
                              {runs > 0 && <Text style={{ fontSize: 9, color: '#FFF', fontWeight: '700', textAlign: 'center', marginBottom: 2 }}>{runs}</Text>}
                            </View>
                            <Text style={{ fontSize: 9, color: COLORS.textSecondary, marginTop: 4, fontWeight: '600' }}>{over + 1}</Text>
                          </View>
                        );
                      })}
                    </View>
                    <Text style={{ textAlign: 'center', fontSize: 10, color: COLORS.textSecondary, marginTop: 8, fontWeight: '600' }}>Overs</Text>
                  </>
                )}
              </Card>

              {/* ── SCORE WORM (Cumulative) ── */}
              <Card style={{ padding: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', marginBottom: 16, color: COLORS.primary }}>🐛 Score Worm</Text>
                {overKeys.length === 0 ? (
                  <Text style={s.emptyText}>No data yet.</Text>
                ) : (
                  <View style={{ height: 160, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', borderLeftWidth: 1, borderLeftColor: '#E2E8F0', paddingLeft: 4, paddingBottom: 4 }}>
                    {/* Y-axis labels */}
                    <View style={{ position: 'absolute', left: -30, top: 0, bottom: 20, justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 8, color: COLORS.textSecondary }}>{maxCumulative}</Text>
                      <Text style={{ fontSize: 8, color: COLORS.textSecondary }}>{Math.round(maxCumulative / 2)}</Text>
                      <Text style={{ fontSize: 8, color: COLORS.textSecondary }}>0</Text>
                    </View>
                    {/* SVG-like line using absolute positioned dots */}
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end' }}>
                      {overKeys.map((over, idx) => {
                        const score = cumulativeByOver[over];
                        const y = (score / maxCumulative) * 140;
                        return (
                          <View key={over} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                            <View style={{ height: y, width: 2, backgroundColor: '#10B981', borderRadius: 1 }} />
                            <View style={{ position: 'absolute', bottom: y - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                            <Text style={{ fontSize: 7, color: COLORS.textSecondary, marginTop: 4 }}>{over + 1}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </Card>

              {/* ── RUN RATE TREND ── */}
              <Card style={{ padding: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', marginBottom: 16, color: COLORS.primary }}>📈 Run Rate Trend</Text>
                {overKeys.length === 0 ? (
                  <Text style={s.emptyText}>No data yet.</Text>
                ) : (
                  <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', borderLeftWidth: 1, borderLeftColor: '#E2E8F0', paddingBottom: 4, paddingLeft: 4 }}>
                    {overKeys.map(over => {
                      const rr = runRateByOver[over];
                      const height = (rr / maxRR) * 120;
                      return (
                        <View key={over} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                          <View style={{ height: Math.max(height, 2), width: 2, backgroundColor: '#F59E0B', borderRadius: 1 }} />
                          <View style={{ position: 'absolute', bottom: Math.max(height - 4, 0), width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B' }} />
                          <Text style={{ fontSize: 7, color: COLORS.textSecondary, marginTop: 4 }}>{over + 1}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
                <Text style={{ textAlign: 'center', fontSize: 10, color: COLORS.textSecondary, marginTop: 8, fontWeight: '600' }}>Current RR: {currentRR}</Text>
              </Card>

              {/* ── SCORING BREAKDOWN ── */}
              <Card style={{ padding: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', marginBottom: 16, color: COLORS.primary }}>🎯 Scoring Breakdown</Text>
                {totalDeliveries === 0 ? (
                  <Text style={s.emptyText}>No data yet.</Text>
                ) : (
                  <>
                    {/* Horizontal stacked bar */}
                    <View style={{ height: 32, flexDirection: 'row', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                      {zones.map(z => (
                        <View key={z.label} style={{ flex: z.count, backgroundColor: z.color, justifyContent: 'center', alignItems: 'center' }}>
                          {z.count / totalDeliveries > 0.08 && (
                            <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '700' }}>{z.label}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                    {/* Legend */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      {zones.map(z => (
                        <View key={z.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: z.color }} />
                          <Text style={{ fontSize: 12, color: COLORS.text, fontWeight: '600' }}>{z.label}: {z.count} ({totalDeliveries > 0 ? ((z.count / totalDeliveries) * 100).toFixed(0) : 0}%)</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </Card>

              {/* ── KEY STATS ── */}
              <Card style={{ padding: 16 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', marginBottom: 16, color: COLORS.primary }}>📋 Key Stats</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {[
                    { label: 'Current RR', value: currentRR },
                    { label: 'Boundary %', value: `${boundaryPerc}%` },
                    { label: 'Dot Ball %', value: `${dotPerc}%` },
                    { label: 'Fours', value: String(fours) },
                    { label: 'Sixes', value: String(sixes) },
                    { label: 'Extras', value: String(extras) },
                    { label: 'Wickets', value: String(currentWickets) },
                    { label: 'Overs', value: `${Math.floor(totalLegalBalls / 6)}.${totalLegalBalls % 6}` },
                  ].map(stat => (
                    <View key={stat.label} style={{ backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, minWidth: '45%', flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.primary }}>{stat.value}</Text>
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginTop: 4 }}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </View>
          );
        })()}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, flex: 1, textAlign: 'center' },
  shareBtn: { padding: 4 },
  scroll: { padding: 16 },
  winnerBanner: { backgroundColor: '#10B981', padding: 16, borderRadius: BORDER_RADIUS.lg, marginBottom: 16, alignItems: 'center' },
  winnerText: { color: '#FFF', fontWeight: '900', fontSize: 18 },
  mainCard: { backgroundColor: COLORS.primary, padding: 32, borderRadius: BORDER_RADIUS.xl, marginBottom: 24 },
  scoreText: { color: COLORS.white, fontSize: 48, fontWeight: '900', textAlign: 'center' },
  overText: { color: COLORS.white, fontSize: 16, textAlign: 'center', marginTop: 8, opacity: 0.9, fontWeight: '700' },
  playersRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  playerCol: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: BORDER_RADIUS.lg, padding: 12 },
  playerRole: { color: COLORS.white, opacity: 0.65, fontSize: 10, fontWeight: '800', marginBottom: 6, letterSpacing: 0.6 },
  playerName: { color: COLORS.white, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  playerStats: { color: COLORS.white, opacity: 0.78, fontSize: 11, fontWeight: '700', marginTop: 4 },
  playerBox: { flex: 1, alignItems: 'center' },
  pLabel: { color: COLORS.white, opacity: 0.6, fontSize: 10, fontWeight: '800', marginBottom: 4 },
  pName: { color: COLORS.white, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  superOverBadge: { backgroundColor: '#FCD34D', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 12 },
  superOverBadgeText: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  controls: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  controlBtn: { flex: 1, height: 64, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  controlText: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  boundaryBtn: { backgroundColor: '#E0F2FE', borderColor: COLORS.primary },
  boundaryText: { color: COLORS.primary },
  extraBtn: { backgroundColor: '#F8FAFC' },
  wicketBtn: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  swapBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  undoBtn: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  spectatorCard: { backgroundColor: '#1E293B', padding: 32, borderRadius: BORDER_RADIUS.xl, alignItems: 'center' },
  spectatorTitle: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginTop: 8 },
  spectatorStatus: { color: '#94A3B8', fontSize: 13, fontWeight: '600', marginTop: 4 },
  loginCta: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 12 },
  loginCtaText: { color: COLORS.white, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeading: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginBottom: 16 },
  selectorSection: { marginBottom: 24 },
  selectorTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  chipTextActive: { color: COLORS.white },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: COLORS.primary, fontWeight: '800' },
  overStrip: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  overCard: { minWidth: 132, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10 },
  overCardTitle: { fontSize: 11, fontWeight: '800', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  ballPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ballPill: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.white, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  ballPillWicket: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  ballPillEdited: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  ballPillText: { fontSize: 10, fontWeight: '900', color: COLORS.text },
  ballPillTextLight: { color: COLORS.white },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: '#F8FAFC' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  colName: { flex: 3 },
  colNum: { flex: 1, textAlign: 'center', fontSize: 13, color: COLORS.textSecondary },
  colHeader: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  outStr: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#94A3B8', paddingVertical: 20 },
  commentaryRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  commOvers: { width: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderRadius: 8, paddingVertical: 4, marginRight: 12 },
  commOversText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  commDetails: { flex: 1, justifyContent: 'center' },
  commMainText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  commRunText: { fontWeight: '800' },
  hostControls: { flexDirection: 'row', gap: 12, marginTop: 24 },
  hostBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1, backgroundColor: COLORS.white },
  hostBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
});
