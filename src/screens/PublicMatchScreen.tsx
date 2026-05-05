import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Share, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { COLORS, BORDER_RADIUS } from '../theme';
import { Button, Card } from '../components/UI';
import { useNotification } from '../context/NotificationContext';

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

  const fetchBalls = useCallback(async (uuid: string, innings: number) => {
    try {
      const { data } = await supabase.from('balls').select('*').eq('match_id', uuid).eq('innings', innings).order('created_at', { ascending: true });
      const balls = data || [];
      setInningsBalls(balls);
      const legal = balls.filter((b: any) => b.is_legal !== false).length;
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

        if (!spectator && (data.match_state === 'setup' || data.match_state === 'super_over_setup' || (!data.striker && !data.current_bowler && data.match_state !== 'live' && data.match_state !== 'completed'))) {
          setSelectionType('initial'); setShowModal(true);
        }
        await fetchBalls(data.id, data.current_innings || 1);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [matchId, fetchBalls]);

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
          setTotalLegalBalls(prev => prev + 1);
          setCurrentOverNum(prev => Math.floor((prev + 1) / 6));
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchUuid]);

  // ── HELPERS ──
  const isLive = match?.match_state === 'live';
  const isSuperOver = match?.current_innings === 3 || match?.current_innings === 4;
  const maxBalls = isSuperOver ? 6 : (match?.overs * 6);
  
  // Dynamic Score Calculation (Single Source of Truth)
  const currentInningsBalls = inningsBalls; // Already filtered for current_innings by fetchMatch
  const currentScore = currentInningsBalls.reduce((s, b) => s + (b.runs || 0) + (b.extras || 0), 0);
  const currentWickets = currentInningsBalls.filter(b => b.is_wicket).length;
  
  const scoreField = match?.current_innings === 1 ? 'score1' : 'score2';
  const wicketsField = match?.current_innings === 1 ? 'wickets1' : 'wickets2';
  
  const outPlayers = match?.out_players || [];
  const battingTeamPlayers = (match?.current_innings === 1 || match?.current_innings === 3) ? match?.team1_players : match?.team2_players;
  const bowlingTeamPlayers = (match?.current_innings === 1 || match?.current_innings === 3) ? match?.team2_players : match?.team1_players;
  const availableBatters = (battingTeamPlayers || []).filter((p: string) => !outPlayers.includes(p));
  const availableBowlers = (bowlingTeamPlayers || []).filter((p: string) => p !== match?.last_bowler);

  const getBowlerStats = (bName: string) => {
    const bBalls = inningsBalls.filter((b: any) => b.bowler === bName);
    const legal = bBalls.filter((b: any) => b.is_legal !== false).length;
    const runs = bBalls.filter((b: any) => b.extra_type !== 'bye' && b.extra_type !== 'legbye').reduce((sum: number, b: any) => sum + (b.runs || 0) + (b.extras || 0), 0);
    const wkts = bBalls.filter((b: any) => b.is_wicket && b.wicket_type !== 'runout').length;
    return `${Math.floor(legal / 6)}.${legal % 6}-${runs}-${wkts}`;
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
      const { data: existing } = await supabase.from('match_players').select('*').eq('match_id', matchUuid).eq('player_name', player).single();
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

  const recalculateMatchState = async (balls: any[]) => {
    if (!matchUuid) return;
    try {
      await supabase.from('match_players').update({
        runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0,
        runs_conceded: 0, balls_bowled: 0, wickets_taken: 0,
        is_out: false
      }).eq('match_id', matchUuid);

      let s1 = 0, w1 = 0, s2 = 0, w2 = 0;
      const pStats: Record<string, any> = {};

      balls.forEach(b => {
        const runs = (b.runs || 0) + (b.extras || 0);
        if (b.innings === 1) { s1 += runs; if (b.is_wicket) w1++; }
        else if (b.innings === 2) { s2 += runs; if (b.is_wicket) w2++; }
        // Innings 3 & 4 (Super Over) are NOT stored in match columns, derived from balls instead.

        const pName = b.batter;
        const bName = b.bowler;
        const dName = b.dismissed_player;

        if (pName) {
          if (!pStats[pName]) pStats[pName] = { runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0, is_out: false, runs_conceded: 0, balls_bowled: 0, wickets_taken: 0 };
          const isLegal = b.is_legal !== false;
          const isByeOrLegBye = b.extra_type === 'bye' || b.extra_type === 'legbye';
          let runsToBatter = b.runs;
          if (isByeOrLegBye || !isLegal) runsToBatter = 0;
          pStats[pName].runs_scored += runsToBatter;
          if (isLegal) pStats[pName].balls_faced += 1;
          if (runsToBatter === 4) pStats[pName].fours += 1;
          if (runsToBatter === 6) pStats[pName].sixes += 1;
          if (b.is_wicket && dName === pName) pStats[pName].is_out = true;
        }

        if (bName) {
          if (!pStats[bName]) pStats[bName] = { runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0, is_out: false, runs_conceded: 0, balls_bowled: 0, wickets_taken: 0 };
          const isLegal = b.is_legal !== false;
          const isByeOrLegBye = b.extra_type === 'bye' || b.extra_type === 'legbye';
          let runsToBowler = (b.runs || 0) + (b.extras || 0);
          if (isByeOrLegBye) runsToBowler = 0;
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

      const lastB = balls[balls.length - 1];
      const updates: any = {
        score1: s1, wickets1: w1, score2: s2, wickets2: w2,
        winner: null,
        striker: lastB?.batter || null,
        current_bowler: lastB?.bowler || null,
        match_state: balls.length > 0 ? 'live' : 'setup'
      };
      await updateMatchStats(updates);
      fetchMatch();
    } catch (e) {
      console.error('Recalculate error:', e);
    }
  };

  const handleUndo = async () => {
    if (isSubmitting || !matchUuid) return;
    Alert.alert("Undo", "Delete last ball and recalculate?", [
      { text: "Cancel", style: "cancel" },
      { text: "Undo", style: "destructive", onPress: async () => {
        setIsSubmitting(true);
        try {
          const { data: lastBall } = await supabase.from('balls').select('id').eq('match_id', matchUuid).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (lastBall) {
            await supabase.from('balls').delete().eq('id', lastBall.id);
            const { data: balls } = await supabase.from('balls').select('*').eq('match_id', matchUuid).order('created_at', { ascending: true });
            await recalculateMatchState(balls || []);
          }
        } catch (e) { console.error(e); }
        finally { setIsSubmitting(false); }
      }}
    ]);
  };

  const handleAddBall = async (p: { r: number; e: number; type?: string; isW?: boolean; wType?: string; dismissedPlayer?: string }) => {
    if (isSubmitting || !isLive || isSpectator || isOffline) return;
    setIsSubmitting(true); setErrorMessage('');
    try {
      // Pre-flight check to block duplicate insertions
      const { data: lastBall } = await supabase.from('balls').select('over, ball').eq('match_id', matchUuid).order('created_at', { ascending: false }).limit(1).maybeSingle();
      const targetBallNum = totalLegalBalls + 1;
      if (lastBall && lastBall.over === currentOverNum && lastBall.ball === targetBallNum) {

        setTimeout(() => setIsSubmitting(false), 300); // 300ms debounce
        return;
      }

      const isLegal = p.type !== 'wide' && p.type !== 'noball';
      const isByeOrLegBye = p.type === 'bye' || p.type === 'legbye';
      let ballRuns = p.r, ballExtras = p.e, runsToBatter = p.r, runsToBowler = p.r + p.e;
      if (isByeOrLegBye) { runsToBatter = 0; runsToBowler = 0; }
      if (!isLegal) { runsToBatter = 0; ballRuns = 0; }
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

      await updatePlayerStats(match.striker, match.current_innings===1?match.team1:match.team2, { runs_scored: runsToBatter, balls_faced: isLegal ? 1 : 0, fours: runsToBatter === 4 ? 1 : 0, sixes: runsToBatter === 6 ? 1 : 0 });
      await updatePlayerStats(match.current_bowler, match.current_innings===1?match.team2:match.team1, { runs_conceded: isByeOrLegBye ? 0 : runsToBowler, balls_bowled: isLegal ? 1 : 0, wickets_taken: p.isW && wTypeNormalized !== 'runout' ? 1 : 0 });
      if (p.isW && p.dismissedPlayer) await updatePlayerStats(p.dismissedPlayer, match.current_innings===1?match.team1:match.team2, { is_out: true });

      let nextStriker = match.striker, nextNon = match.non_striker, nextBowler = match.current_bowler;
      let lastBowler = match.last_bowler, nextState = 'live';
      const nextOut = [...outPlayers];
      const newScore = (match[scoreField] || 0) + ballRuns + ballExtras;
      const newWickets = (match[wicketsField] || 0) + (p.isW ? 1 : 0);
      let physicalRuns = isByeOrLegBye ? p.e : p.r;

      if (p.isW) {
        nextOut.push(p.dismissedPlayer || match.striker);
        nextState = 'wicket_fall';
        if (p.dismissedPlayer === match.striker) nextStriker = null;
        if (p.dismissedPlayer === match.non_striker) nextNon = null;
      } else if (physicalRuns % 2 !== 0) { [nextStriker, nextNon] = [nextNon, nextStriker]; }

      const newTotalLegal = totalLegalBalls + (isLegal ? 1 : 0);
      const isOverEnd = isLegal && (newTotalLegal % 6 === 0);
      if (isOverEnd) { [nextStriker, nextNon] = [nextNon, nextStriker]; lastBowler = nextBowler; nextBowler = null; if (nextState !== 'wicket_fall') nextState = 'over_break'; }

      const isChasing = match.current_innings === 2 || match.current_innings === 4;
      let winner = match.winner, newTarget = match.target;
      if (isChasing) {
        // For super over target, we calculate it from previous balls (innings 3)
        let target = match.target;
        if (match.current_innings === 4 && !target) {
          // This case shouldn't happen if break is handled correctly, but for safety:
          // We'd need the score from innings 3. For now, assume target is set in state.
          target = match.target;
        } else if (match.current_innings === 2) {
          target = match.target || ((match.score1 || 0) + 1);
        }

        if (target && newScore >= target) { 
          nextState = 'completed'; 
          winner = match.team2; 
        }
        else if (newTotalLegal >= maxBalls || newWickets >= (isSuperOver ? 2 : 10)) {
          if (target && newScore === target - 1) {
            if (match.current_innings === 2 && match.allow_super_over) {
              nextState = 'super_over_setup';
            } else {
              nextState = 'completed';
              winner = 'tie';
            }
          } else {
            nextState = 'completed';
            winner = match.team1;
          }
        }
      } else {
        if (newTotalLegal >= maxBalls || newWickets >= (isSuperOver ? 2 : 10)) { 
          nextState = isSuperOver ? 'super_over_break' : 'innings_break'; 
          newTarget = newScore + 1; 
        }
      }

      const updates: any = { striker: nextStriker, non_striker: nextNon, current_bowler: nextBowler, last_bowler: lastBowler, match_state: nextState, out_players: nextOut };
      if (!isSuperOver) {
        updates[scoreField] = newScore;
        updates[wicketsField] = newWickets;
      }
      
      if (nextState === 'super_over_setup') {
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

      if (nextState === 'wicket_fall') { setSelectionType('batter'); setShowModal(true); }
      else if (nextState === 'over_break') { setSelectionType('bowler'); setShowModal(true); }
      else if (nextState === 'super_over_setup' || nextState === 'super_over_break') { setSelectionType('initial'); setShowModal(true); }
      
      setTimeout(() => setIsSubmitting(false), 300); // 300ms debounce
    } catch(e: any) { 
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
      setTimeout(() => setIsSubmitting(false), 300);
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
          <TouchableOpacity onPress={handleShare} style={s.shareBtn}>
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
            <View style={s.playerBox}><Text style={s.pLabel}>BATTER</Text><Text style={s.pName}>🏏 {match.striker || '-'}</Text></View>
            <View style={s.playerBox}><Text style={s.pLabel}>NON-STRIKER</Text><Text style={s.pName}>🏃 {match.non_striker || '-'}</Text></View>
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
                  <TouchableOpacity style={[s.controlBtn, s.extraBtn]} onPress={() => handleAddBall({ r: 0, e: 1, type: 'wide' })}><Text style={s.controlText}>WD</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.controlBtn, s.extraBtn]} onPress={() => handleAddBall({ r: 0, e: 1, type: 'noball' })}><Text style={s.controlText}>NB</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.controlBtn, s.extraBtn]} onPress={() => handleAddBall({ r: 0, e: 1, type: 'legbye' })}><Text style={s.controlText}>LB</Text></TouchableOpacity>
                  <TouchableOpacity style={[s.controlBtn, s.extraBtn]} onPress={() => handleAddBall({ r: 0, e: 1, type: 'bye' })}><Text style={s.controlText}>BYE</Text></TouchableOpacity>
                </View>
                <View style={s.row}>
                  <TouchableOpacity style={[s.controlBtn, s.wicketBtn]} onPress={() => { setSelectionType('wicket'); setShowModal(true); }}><Text style={[s.controlText, { color: COLORS.white }]}>WKT</Text></TouchableOpacity>
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
                <TouchableOpacity 
                  style={[s.hostBtn, { borderColor: '#FEE2E2' }]} 
                  onPress={handleUndo}
                >
                  <Ionicons name="refresh-outline" size={18} color="#EF4444" />
                  <Text style={[s.hostBtnText, { color: '#EF4444' }]}>Undo Ball</Text>
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
                  
                  {/* Batting */}
                  <View style={s.tableHeader}>
                    <Text style={[s.colName, s.colHeader]}>Batter</Text>
                    <Text style={[s.colNum, s.colHeader]}>R</Text>
                    <Text style={[s.colNum, s.colHeader]}>B</Text>
                    <Text style={[s.colNum, s.colHeader]}>4s</Text>
                    <Text style={[s.colNum, s.colHeader]}>6s</Text>
                    <Text style={[s.colNum, s.colHeader, {flex: 1.5}]}>SR</Text>
                  </View>
                  {batters.map((b, i) => (
                    <View key={i} style={s.tableRow}>
                      <View style={s.colName}>
                        <Text style={{fontWeight: '600'}} numberOfLines={1}>{b.player_name}</Text>
                        <Text style={s.outStr}>{b.is_out ? 'out' : 'not out'}</Text>
                      </View>
                      <Text style={[s.colNum, {fontWeight: '700'}]}>{b.runs_scored}</Text>
                      <Text style={s.colNum}>{b.balls_faced}</Text>
                      <Text style={s.colNum}>{b.fours || 0}</Text>
                      <Text style={s.colNum}>{b.sixes || 0}</Text>
                      <Text style={[s.colNum, {flex: 1.5}]}>{b.balls_faced > 0 ? ((b.runs_scored / b.balls_faced) * 100).toFixed(1) : '0.0'}</Text>
                    </View>
                  ))}

                  {/* Bowling */}
                  <View style={[s.tableHeader, { marginTop: 16 }]}>
                    <Text style={[s.colName, s.colHeader]}>Bowler</Text>
                    <Text style={[s.colNum, s.colHeader]}>O</Text>
                    <Text style={[s.colNum, s.colHeader]}>M</Text>
                    <Text style={[s.colNum, s.colHeader]}>R</Text>
                    <Text style={[s.colNum, s.colHeader]}>W</Text>
                    <Text style={[s.colNum, s.colHeader, {flex: 1.5}]}>Econ</Text>
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
                [...inningsBalls].reverse().reduce((acc, ball) => {
                  if (!acc[ball.over]) acc[ball.over] = [];
                  acc[ball.over].push(ball);
                  return acc;
                }, {} as Record<number, any[]>)
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
                    const overStr = `${ball.over}.${ball.ball}`;
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

        {activeTab === 'Insights' && (
          <Card style={{ padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', marginBottom: 20, color: COLORS.primary }}>Run Rate Graph</Text>
            {inningsBalls.length === 0 ? (
              <Text style={s.emptyText}>No data yet.</Text>
            ) : (() => {
              const runsPerOverMap = inningsBalls.reduce((acc, ball) => {
                if (!acc[ball.over]) acc[ball.over] = 0;
                acc[ball.over] += (ball.runs || 0) + (ball.extras || 0);
                return acc;
              }, {} as Record<number, number>);
              const maxInningsRuns = Math.max(...(Object.values(runsPerOverMap) as number[]), 6);
              
              return (
                <View style={{ height: 200, flexDirection: 'row', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', borderLeftWidth: 1, borderLeftColor: '#CBD5E1', paddingBottom: 5, paddingLeft: 5 }}>
                  {Object.entries(runsPerOverMap).map(([over, runsVal]) => {
                    const runs = runsVal as number;
                    const height = (runs / maxInningsRuns) * 180;
                    return (
                      <View key={over} style={{ flex: 1, alignItems: 'center' }}>
                        <View style={{ width: '70%', height: Math.max(height, 2), backgroundColor: COLORS.primary, borderRadius: 4, justifyContent: 'flex-end' }}>
                          {runs > 0 && <Text style={{ fontSize: 9, color: COLORS.white, fontWeight: '700', textAlign: 'center', marginBottom: 2 }}>{runs}</Text>}
                        </View>
                        <Text style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 4 }}>{Number(over) + 1}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
            <Text style={{ textAlign: 'center', fontSize: 11, color: COLORS.textSecondary, marginTop: 12 }}>Overs</Text>
          </Card>
        )}
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
