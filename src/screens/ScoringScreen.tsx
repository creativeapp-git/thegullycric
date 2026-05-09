import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Share, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// matchService functions are defined inline in this screen
import { CONFIG } from '../config';
import { supabase } from '../services/supabase';
import { COLORS, BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';
import { Button, Card, LiveBadge } from '../components/UI';
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
  normalizePlayers,
  restoreStrikeAfterUndo,
} from '../utils/liveScoring';

const withTimeout = <T,>(t: PromiseLike<T>, ms=10000): Promise<T> =>
  Promise.race([Promise.resolve(t), new Promise<never>((_,r)=>setTimeout(()=>r(new Error('TIMEOUT')),ms))]);

export default function ScoringScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { matchId } = route.params;

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  
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

  // ── INIT & REALTIME ──
  const fetchBalls = useCallback(async (innings: number) => {
    try {
      const { data } = await supabase.from('balls').select('*').eq('match_id', matchId).eq('innings', innings).order('created_at', { ascending: true });
      const balls = data || [];
      setInningsBalls(balls);
      const legal = getCurrentLegalBallCount(balls, innings);
      setTotalLegalBalls(legal);
      setCurrentOverNum(Math.floor(legal / 6));
    } catch(e) { console.error('fetchBalls:', e); }
  }, [matchId]);

  const fetchMatch = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;

      const { data } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (data) {
        setMatch(data);
        const spectator = data.created_by !== uid;
        setIsSpectator(spectator);

        if (!spectator) {
          if (data.match_state !== 'completed' && (!data.striker || !data.non_striker || !data.current_bowler)) {
            openSelectionModal('initial');
          }
        }
        await fetchBalls(data.current_innings || 1);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [matchId, fetchBalls, openSelectionModal]);

  useEffect(() => {
    fetchMatch();
    const ch = supabase.channel(`scoring:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (p) => setMatch((m:any) => m ? { ...m, ...p.new } : p.new))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'balls', filter: `match_id=eq.${matchId}` }, async () => {
        const currentInnings = match?.current_innings || 1;
        await fetchBalls(currentInnings);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchId, fetchMatch, fetchBalls, match?.current_innings]);

  // ── HELPERS ──
const isLive = match?.match_state === 'live';
  const maxBalls = match?.max_balls || (match?.overs * 6);
  const scoreField = match?.current_innings === 1 ? 'score1' : 'score2';
  const wicketsField = match?.current_innings === 1 ? 'wickets1' : 'wickets2';
  const activeBalls = useMemo(() => getActiveBalls(inningsBalls), [inningsBalls]);
  const currentInningsBalls = useMemo(
    () => getCurrentInningsBalls(inningsBalls, match?.current_innings || 1),
    [inningsBalls, match?.current_innings],
  );
  const outPlayers = useMemo(
    () => getOutPlayersForInnings(inningsBalls, match?.current_innings || 1),
    [inningsBalls, match?.current_innings],
  );
  const battingFirst = match?.toss_decision === 'Bat' ? match?.toss_winner : (match?.toss_winner === match?.team1 ? match?.team2 : match?.team1);
  const battingSecond = battingFirst === match?.team1 ? match?.team2 : match?.team1;
  const battingTeamName = match?.current_innings === 1 || match?.current_innings === 3 ? battingFirst : battingSecond;
  
  const battingTeamPlayers = normalizePlayers(battingTeamName === match?.team1 ? (match?.team1_players || match?.team1Players) : (match?.team2_players || match?.team2Players));
  const bowlingTeamPlayers = normalizePlayers(battingTeamName === match?.team1 ? (match?.team2_players || match?.team2Players) : (match?.team1_players || match?.team1Players));
  const availableBatters = battingTeamPlayers.filter((p:string) => !outPlayers.includes(p) && p !== match?.striker && p !== match?.non_striker);
  const availableBowlers = (bowlingTeamPlayers||[]).filter((p:string) => p !== match?.last_bowler);
  const maxWickets = getMaxWicketsForPlayers(battingTeamPlayers);
  const currentScore = getCurrentScore(inningsBalls, match?.current_innings || 1);
  const currentWickets = getCurrentWickets(inningsBalls, match?.current_innings || 1);

  const getBowlerStats = (bName: string) => {
    const bBalls = activeBalls.filter(b => b.bowler === bName);
    const legal = bBalls.filter(b => b.is_legal !== false).length;
    const runs = bBalls.filter(b => b.extra_type !== 'bye' && b.extra_type !== 'legbye').reduce((sum, b) => sum + (b.runs||0) + (b.extras||0), 0);
    const wkts = bBalls.filter(b => b.is_wicket && b.wicket_type !== 'Run Out').length;
    return `${Math.floor(legal/6)}.${legal%6}-${runs}-${wkts}`;
  };

  const getBatterStats = (pName: string) => {
    const bBalls = activeBalls.filter(b => b.batter === pName);
    const runs = bBalls.filter(b => b.extra_type !== 'bye' && b.extra_type !== 'legbye').reduce((sum, b) => sum + (b.runs||0), 0);
    const balls = bBalls.filter(b => b.is_legal !== false).length;
    return `${runs} (${balls})`;
  };

  // ── MODULAR SCORING ──
  const updateMatchStats = async (updates: any) => {
    const { error } = await supabase.from('matches').update(updates).eq('id', matchId);
    if (error) throw error;
    setMatch((p:any) => p ? { ...p, ...updates } : p);
  };

  const updatePlayerStats = async (player: string | null | undefined, team: string, stats: any) => {
    if (!player) return;
    // Quick inline upsert for player stats
    try {
      const { data: existing } = await supabase.from('match_players').select('*').eq('match_id', matchId).eq('player_name', player).maybeSingle();
      if (existing) {
        const nextStats = { ...stats };
        for (const k in stats) {
          if (typeof stats[k] === 'number') nextStats[k] = (existing[k] || 0) + stats[k];
        }
        await supabase.from('match_players').update(nextStats).eq('id', existing.id);
      } else {
        await supabase.from('match_players').insert({ match_id: matchId, player_name: player, team, ...stats });
      }
    } catch(e) { console.error('Stat update err:', e); }
  };

  const rebuildMatchFromBalls = useCallback(async (balls: any[], undoneBall?: any) => {
    const active = getActiveBalls(balls);
    const score1 = getCurrentScore(active, 1);
    const wickets1 = getCurrentWickets(active, 1);
    const score2 = getCurrentScore(active, 2);
    const wickets2 = getCurrentWickets(active, 2);
    const currentInnings = match?.current_innings || 1;
    const rebuiltInnings =
      undoneBall && Number(undoneBall.innings) < currentInnings && getCurrentInningsBalls(active, currentInnings).length === 0
        ? Number(undoneBall.innings)
        : currentInnings;
    const currentInningsActiveBalls = getCurrentInningsBalls(active, rebuiltInnings);
    const legalBalls = getCurrentLegalBallCount(active, rebuiltInnings);
    const currentOutPlayers = getOutPlayersForInnings(active, rebuiltInnings);

    await supabase.from('match_players').update({
      runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0,
      runs_conceded: 0, balls_bowled: 0, wickets_taken: 0,
      is_out: false,
    }).eq('match_id', matchId);

    const playerStats: Record<string, any> = {};
    const teamLookup = new Map<string, string>();
    [...normalizePlayers(match?.team1_players || match?.team1Players), ...normalizePlayers(match?.team2_players || match?.team2Players)].forEach((player) => {
      const team = (match?.team1_players || match?.team1Players || []).includes(player) ? match?.team1 : match?.team2;
      if (team) teamLookup.set(player, team);
    });

    active.forEach((ball) => {
      const total = Number(ball.runs || 0) + Number(ball.extras || 0);
      const batterName = ball.batter;
      const bowlerName = ball.bowler;
      const dismissedName = ball.dismissed_player || (ball.is_wicket ? ball.batter : null);
      const isLegal = ball.is_legal !== false;
      const batterRuns = getRunsToBatter({ r: Number(ball.runs || 0), type: ball.extra_type });
      const bowlerRuns = getRunsToBowler({ r: Number(ball.runs || 0), e: Number(ball.extras || 0), type: ball.extra_type });

      if (batterName) {
        if (!playerStats[batterName]) playerStats[batterName] = { runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0, is_out: false, runs_conceded: 0, balls_bowled: 0, wickets_taken: 0 };
        playerStats[batterName].runs_scored += batterRuns;
        if (isLegal) playerStats[batterName].balls_faced += 1;
        if (batterRuns === 4) playerStats[batterName].fours += 1;
        if (batterRuns === 6) playerStats[batterName].sixes += 1;
      }

      if (bowlerName) {
        if (!playerStats[bowlerName]) playerStats[bowlerName] = { runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0, is_out: false, runs_conceded: 0, balls_bowled: 0, wickets_taken: 0 };
        playerStats[bowlerName].runs_conceded += bowlerRuns;
        if (isLegal) playerStats[bowlerName].balls_bowled += 1;
        if (ball.is_wicket && ball.wicket_type !== 'runout' && ball.wicket_type !== 'Run Out') playerStats[bowlerName].wickets_taken += 1;
      }

      if (dismissedName) {
        if (!playerStats[dismissedName]) playerStats[dismissedName] = { runs_scored: 0, balls_faced: 0, fours: 0, sixes: 0, is_out: false, runs_conceded: 0, balls_bowled: 0, wickets_taken: 0 };
        playerStats[dismissedName].is_out = true;
      }
    });

    for (const [playerName, stats] of Object.entries(playerStats)) {
      const { data: existing } = await supabase.from('match_players').select('id').eq('match_id', matchId).eq('player_name', playerName).maybeSingle();
      if (existing?.id) {
        await supabase.from('match_players').update(stats).eq('id', existing.id);
      } else {
        await supabase.from('match_players').insert({ match_id: matchId, player_name: playerName, team: teamLookup.get(playerName) || match?.team1, ...stats });
      }
    }

    const updates: any = {
      score1,
      wickets1,
      score2,
      wickets2,
      out_players: currentOutPlayers,
      winner: null,
      current_innings: rebuiltInnings,
      target: rebuiltInnings >= 2 ? (score1 + 1) : null,
      match_state: currentInningsActiveBalls.length > 0 ? 'live' : 'setup',
    };

    if (canAutoRestoreAfterUndo(undoneBall, rebuiltInnings, match?.match_state)) {
      const restored = restoreStrikeAfterUndo(match?.striker || null, match?.non_striker || null, undoneBall, legalBalls);
      updates.striker = restored.striker;
      updates.non_striker = restored.nonStriker;
      updates.current_bowler = undoneBall?.bowler || null;
      updates.last_bowler = match?.last_bowler || null;
    } else {
      updates.striker = null;
      updates.non_striker = null;
      updates.current_bowler = null;
      updates.last_bowler = null;
    }

    await updateMatchStats(updates);
    await fetchBalls(rebuiltInnings);

    if (!updates.striker || !updates.non_striker || !updates.current_bowler) {
      openSelectionModal('initial');
    }
  }, [fetchBalls, match, matchId, openSelectionModal, updateMatchStats]);

  const handleAddBall = async (p: { r: number; e: number; type?: string; isW?: boolean; wType?: string; dismissedPlayer?: string }) => {
    if (isSubmitting || !isLive || isSpectator) return;
    if (!match?.striker || !match?.non_striker || !match?.current_bowler) {
      openSelectionModal('initial');
      setErrorMessage('Select striker, non-striker, and bowler before scoring.');
      return;
    }

    setIsSubmitting(true); setErrorMessage('');

    try {
      // 1. Calculate Ball Properties
      const isLegal = p.type !== 'wide' && p.type !== 'noball';
      const isByeOrLegBye = p.type === 'bye' || p.type === 'legbye';
      const ballRuns = p.type === 'wide' ? 0 : p.r;
      const ballExtras = p.e;
      const runsToBatter = getRunsToBatter(p);
      const runsToBowler = getRunsToBowler(p);

      const wTypeNormalized = p.wType ? p.wType.toLowerCase().replace(/\s/g, '') : null;

      // 2. Insert Ball
      await supabase.from('balls').insert({
        match_id: matchId, innings: match.current_innings, over: currentOverNum, ball: currentInningsBalls.length + 1,
        runs: ballRuns, extras: ballExtras, extra_type: p.type || null, is_legal: isLegal,
        is_wicket: !!p.isW, wicket_type: wTypeNormalized, dismissed_player: p.dismissedPlayer || null,
        batter: match.striker, bowler: match.current_bowler, fielder: wicketFielder
      });

      // 3. Update Player Stats
      const bTeam = battingTeamName || match.team1;
      const fTeam = bTeam === match.team1 ? match.team2 : match.team1;
      await updatePlayerStats(match.striker, bTeam, { runs_scored: runsToBatter, balls_faced: isLegal ? 1 : 0, fours: runsToBatter === 4 ? 1 : 0, sixes: runsToBatter === 6 ? 1 : 0 });
      await updatePlayerStats(match.current_bowler, fTeam, { runs_conceded: isByeOrLegBye ? 0 : runsToBowler, balls_bowled: isLegal ? 1 : 0, wickets_taken: p.isW && wTypeNormalized !== 'runout' ? 1 : 0 });
      if (p.isW && p.dismissedPlayer) {
        await updatePlayerStats(p.dismissedPlayer, bTeam, { is_out: true });
      }

      // 4. Update Match Logic
      let nextStriker = match.striker;
      let nextNon = match.non_striker;
      let nextBowler = match.current_bowler;
      let lastBowler = match.last_bowler;
      let nextState = 'live';
      const dismissedPlayer = p.dismissedPlayer || match.striker;
      const nextOut = p.isW ? Array.from(new Set([...outPlayers, dismissedPlayer])) : [...outPlayers];
      const newScore = currentScore + ballRuns + ballExtras;
      const newWickets = currentWickets + (p.isW ? 1 : 0);
      const physicalRuns = getPhysicalRuns(p);
      const newTotalLegal = totalLegalBalls + (isLegal ? 1 : 0);
      const isOverEnd = isLegal && (newTotalLegal % 6 === 0);
      const inningsFinished = newTotalLegal >= maxBalls || newWickets >= maxWickets;
      const remainingBatters = battingTeamPlayers.filter((player) => !nextOut.includes(player));

      if (p.isW) {
        if (!inningsFinished && remainingBatters.length > 0) {
          nextState = 'wicket_fall';
        }
        if (dismissedPlayer === match.striker) nextStriker = null;
        if (dismissedPlayer === match.non_striker) nextNon = null;
      } else if (physicalRuns % 2 !== 0) {
        [nextStriker, nextNon] = [nextNon, nextStriker];
      }
      
      if (isOverEnd && !inningsFinished) {
        [nextStriker, nextNon] = [nextNon, nextStriker];
        lastBowler = nextBowler; nextBowler = null;
        setPendingBowlerChange(true);
        if (nextState !== 'wicket_fall') nextState = 'over_break';
      }

      let winner = match.winner;
      let newTarget = match.target;
      const battingTeam = battingTeamName || match.team1;
      const fieldingTeam = battingTeam === match.team1 ? match.team2 : match.team1;

      if (match.current_innings === 2) {
        const target = match.target || ((match.score1 || 0) + 1);
        if (newScore >= target) {
          nextState = 'completed';
          winner = battingTeam;
        } else if (inningsFinished) {
          nextState = 'completed';
          if (newScore === target - 1) {
            winner = 'tie';
          } else {
            winner = fieldingTeam;
          }
        }
      } else {
        if (inningsFinished) nextState = 'innings_break';

        if (nextState === 'innings_break') {
          newTarget = newScore + 1;
        }
      }

      const updates: any = {
        [scoreField]: newScore,
        [wicketsField]: newWickets,
        striker: nextStriker, non_striker: nextNon,
        current_bowler: nextBowler, last_bowler: lastBowler,
        match_state: nextState, out_players: nextOut
      };

      if (winner) updates.winner = winner;
      if (newTarget) updates.target = newTarget;

      if (nextState === 'innings_break') {
        updates.current_innings = 2;
        updates.striker = null;
        updates.non_striker = null;
        updates.current_bowler = null;
        updates.last_bowler = null;
        updates.out_players = [];
      }

      await updateMatchStats(updates);
      const fetchInnings = nextState === 'innings_break' ? 2 : match.current_innings;
      await fetchBalls(fetchInnings);

      // 5. Open Modals if needed
      if (nextState === 'innings_break') { openSelectionModal('initial'); }
      else if (nextState === 'wicket_fall') { openSelectionModal('batter'); }
      else if (nextState === 'over_break') { openSelectionModal('bowler'); }
    } catch(e:any) {
      console.error('Add ball failed:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
      setErrorMessage(e.message);
    }
    finally { setIsSubmitting(false); setWicketFielder(null); setRunOutPlayer(null); setWicketType(null); }
  };

  const handleUndo = async () => {
    if (isSubmitting) return;
    const undo = async () => {
      setIsSubmitting(true);
      try {
        const { data: ballsBeforeUndo } = await supabase
          .from('balls').select('*').eq('match_id', match?.id)
          .order('created_at', { ascending: true });
        const undoWindow = getActiveBalls(ballsBeforeUndo || []).slice(-6);
        if (!undoWindow.length) {
          setErrorMessage('You can only undo within the last 6 balls of this innings.');
          return;
        }

        const lastBall = undoWindow[undoWindow.length - 1];
        const reassignedBallNumber = Number(lastBall.ball || 0) + 1000 + undoWindow.length;
        const { error: updateError } = await supabase.from('balls').update({
          commentary_text: buildEditedCommentary(lastBall),
          ball: reassignedBallNumber,
        }).eq('id', lastBall.id);

        if (updateError) throw updateError;

        const { data: allBalls } = await supabase
          .from('balls').select('*').eq('match_id', match?.id)
          .order('created_at', { ascending: true });
        await rebuildMatchFromBalls(allBalls || [], lastBall);
      } catch (e) { console.error('Undo error:', e); }
      finally { setIsSubmitting(false); }
    };
    if (Platform.OS === 'web') {
      if (!window.confirm('Undo the latest ball? It will stay in history as edited.')) return;
      undo();
    } else {
      Alert.alert("Undo", "Undo the latest ball? It will stay in history as edited.", [
        { text: "Cancel", style: "cancel" },
        { text: "Undo", style: "destructive", onPress: undo }
      ]);
    }
  };

  const handleConfirmSelection = async () => {
    if (isSubmitting || isSpectator) return;
    if (selectionType==='wicket') {
      const dismissed = wicketType==='Run Out' ? runOutPlayer : match.striker;
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
      
      if (selectionType === 'batter' && pendingBowlerChange) {
        setPendingBowlerChange(false);
        setTimeout(() => { openSelectionModal('bowler'); }, 300);
      } else if (selectionType === 'bowler' || selectionType === 'initial') {
        setPendingBowlerChange(false);
      }
    } catch(e) {}
    finally { setIsSubmitting(false); }
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

  // ── UI ──
  const isConfirmDisabled = useMemo(() => {
    if (isSubmitting) return true;
    if (selectionType==='initial') return !selectedStriker||!selectedNonStriker||!selectedBowler||selectedStriker===selectedNonStriker;
    if (selectionType==='bowler') return !selectedBowler;
    if (selectionType==='batter') return !selectedStriker;
    if (selectionType==='wicket') return !wicketType || (wicketType==='Caught'&&!wicketFielder) || (wicketType==='Run Out'&&!runOutPlayer);
    return true;
  }, [selectionType, selectedStriker, selectedNonStriker, selectedBowler, wicketType, wicketFielder, runOutPlayer, isSubmitting]);

  const renderSelector = (title:string,list:string[],current:string|null,onSelect:any) => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorTitle}>{title}</Text>
      <View style={styles.chipContainer}>{list.map(p=>(<TouchableOpacity key={p} style={[styles.chip,current===p&&styles.chipActive]} onPress={()=>onSelect(p)}><Text style={[styles.chipText,current===p&&styles.chipTextActive]}>{p}</Text></TouchableOpacity>))}</View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large"/></View>;

  return (
    <View style={styles.container}>
      <Modal visible={showExtraPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={[styles.modalContent, {maxHeight:'40%'}]}>
          <Text style={styles.modalHeading}>{
            pendingExtraType === 'legbye' ? 'LEG BYES' : 
            pendingExtraType === 'noball' ? 'RUNS OFF NO BALL' : 
            pendingExtraType === 'wide' ? 'EXTRA WIDE RUNS' : 'BYES'
          }</Text>
          <View style={{flexDirection:'row',justifyContent:'center',marginTop:24, marginBottom: 16, flexWrap: 'wrap', gap: 12}}>
            {getExtraRunOptions(pendingExtraType).map(n=>(
              <TouchableOpacity key={n} style={[styles.controlBtn,{flex:0,width:72,height:72}]} onPress={()=>{
                setShowExtraPicker(false);
                if (pendingExtraType === 'noball') {
                  handleAddBall({r:n, e:match?.rules?.noBallExtraRun!==false?1:0, type:'noball'});
                } else if (pendingExtraType === 'wide') {
                  handleAddBall({r:0, e:n + (match?.rules?.wideExtraRun!==false?1:0), type:'wide'});
                } else {
                  handleAddBall({r:0, e:n, type:pendingExtraType!});
                }
              }}>
                <Text style={styles.controlText}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={()=>setShowExtraPicker(false)} style={{alignItems:'center',marginTop:16, padding: 12}}>
            <Text style={{color:COLORS.textSecondary,fontWeight:'700', fontSize: 16}}>Cancel</Text>
          </TouchableOpacity>
        </View></View>
      </Modal>
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalHeading}>{selectionType.toUpperCase()}</Text>
            {selectionType==='batter'&&renderSelector('Next Batter',availableBatters.filter((p:string)=>p!==match?.non_striker),selectedStriker,setSelectedStriker)}
            {selectionType==='bowler'&&renderSelector('Next Bowler',availableBowlers,selectedBowler,setSelectedBowler)}
            {selectionType==='initial'&&renderSelector('Striker',availableBatters,selectedStriker,setSelectedStriker)}
            {selectionType==='initial'&&renderSelector('Non-Striker',availableBatters.filter((p:string)=>p!==selectedStriker),selectedNonStriker,setSelectedNonStriker)}
            {selectionType==='initial'&&renderSelector('Opening Bowler',availableBowlers,selectedBowler,setSelectedBowler)}
            {selectionType==='wicket'&& (
              <>
              {renderSelector('Wicket Type', ['Bowled', 'Caught', 'Run Out', 'LBW', 'Stumped'], wicketType, setWicketType)}
              {wicketType==='Caught'&&renderSelector('Fielder', bowlingTeamPlayers||[], wicketFielder, setWicketFielder)}
              {wicketType==='Run Out'&&renderSelector('Dismissed', [match?.striker, match?.non_striker].filter(Boolean), runOutPlayer, setRunOutPlayer)}
            </>)}
          </ScrollView>
          <Button title="Confirm" onPress={handleConfirmSelection} loading={isSubmitting} disabled={isConfirmDisabled} style={{marginTop:20}}/>
        </View></View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="chevron-back" size={24} color={COLORS.text}/></TouchableOpacity>
        <Text style={styles.headerTitle}>{match?.team1} vs {match?.team2}</Text>
        <TouchableOpacity onPress={async () => {
          const mid = match?.match_id || match?.matchId;
          if (!mid) return;
          const origin = Platform.OS === 'web' ? window.location.origin : CONFIG.APP_URL;
          const url = `${origin}/match/${mid}`;
          const overs = `${Math.floor(totalLegalBalls/6)}.${totalLegalBalls%6}`;
          const lines = [
            `🏏 ${match.team1} vs ${match.team2}`,
            `Score: ${match[scoreField]||0}/${match[wicketsField]||0} (${overs} ov)`,
            ...(match.current_innings===2 && match.target ? [`Target: ${match.target} | ${match.target-(match[scoreField]||0)} needed in ${maxBalls-totalLegalBalls} balls`] : []),
            ...(match.match_state==='completed' && match.winner ? [match.winner==='tie'?'🤝 Match Tied':`🏆 ${match.winner} won`] : []),
            `\nWatch live on GullyCric:\n${url}`,
          ];
          const msg = lines.join('\n');
          try {
            if (Platform.OS === 'web') { await navigator.clipboard.writeText(url); alert('Link copied!'); }
            else await Share.share({ message: msg, url });
          } catch(e) {}
        }} style={{padding:4}}>
          <Ionicons name="share-social" size={20} color={COLORS.primary}/>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {match?.match_state === 'completed' && match?.winner && (
          <LinearGradient colors={['rgba(0,230,118,0.15)', 'rgba(0,230,118,0.05)'] as any} style={{padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, marginBottom: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)'}}>
            <Ionicons name="trophy" size={22} color={COLORS.primary} style={{marginBottom: 6}} />
            <Text style={{color: COLORS.primary, fontWeight: TYPOGRAPHY.weights.black, fontSize: TYPOGRAPHY.sizes.lg, letterSpacing: 1}}>
              {match.winner === 'tie' ? 'MATCH TIED' : `${match.winner.toUpperCase()} WINS!`}
            </Text>
          </LinearGradient>
        )}
        <LinearGradient colors={['#0F1E35', '#0A2540', '#071830'] as any} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.mainCard}>
          {/* Decorative glow */}
          <View style={{ position:'absolute', top:-30, right:-30, width:100, height:100, borderRadius:50, backgroundColor:'rgba(0,230,118,0.06)' }} />

          <Text style={styles.scoreText}>{currentScore}/{currentWickets}</Text>
          <Text style={styles.overText}>Overs: {Math.floor(totalLegalBalls/6)}.{totalLegalBalls%6}</Text>
          {match?.current_innings === 2 && match?.match_state !== 'completed' && match?.target && (
             <Text style={[styles.overText, { color: COLORS.warning, marginTop: 4, fontWeight: TYPOGRAPHY.weights.bold }]}>
               {match.target - (match?.[scoreField] || 0)} to win · {maxBalls - totalLegalBalls} balls left
             </Text>
          )}
          <View style={styles.playersRow}>
            <View style={styles.playerCol}>
              <Text style={styles.playerRole}>STRIKER</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4}}>
                <Ionicons name="flash" size={13} color={COLORS.primary} />
                <Text style={styles.playerName}>{match?.striker || '-'}</Text>
              </View>
              {match?.striker && <Text style={{color: COLORS.primary, fontWeight: TYPOGRAPHY.weights.bold, fontSize: TYPOGRAPHY.sizes.xs}}>{getBatterStats(match.striker)}</Text>}
            </View>
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              {!isSpectator && (
                <TouchableOpacity onPress={handleSwapStrikers} style={styles.swapBtn}>
                  <Ionicons name="swap-horizontal" size={22} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.playerCol}>
              <Text style={styles.playerRole}>NON-STRIKER</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4}}>
                <Ionicons name="walk" size={14} color={COLORS.textMuted} />
                <Text style={styles.playerName}>{match?.non_striker || '-'}</Text>
              </View>
              {match?.non_striker && <Text style={{color: COLORS.textSecondary, fontWeight: TYPOGRAPHY.weights.bold, fontSize: TYPOGRAPHY.sizes.xs}}>{getBatterStats(match.non_striker)}</Text>}
            </View>
          </View>
          <View style={styles.playersRow}>
            <View style={styles.playerBox}>
              <Text style={styles.pLabel}>BOWLER</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4}}>
                <Ionicons name="baseball" size={13} color={COLORS.secondary} />
                <Text style={styles.pName}>{match?.current_bowler || '-'}</Text>
              </View>
              {match?.current_bowler && <Text style={{color: COLORS.secondary, fontWeight: TYPOGRAPHY.weights.bold, fontSize: TYPOGRAPHY.sizes.xs}}>{getBowlerStats(match.current_bowler)}</Text>}
            </View>
            <View style={styles.playerBox}>
              <Text style={styles.pLabel}>LAST BOWLER</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4}}>
                <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
                <Text style={styles.pName}>{match?.last_bowler || '-'}</Text>
              </View>
              {match?.last_bowler && <Text style={{color: COLORS.textMuted, fontWeight: TYPOGRAPHY.weights.bold, fontSize: TYPOGRAPHY.sizes.xs}}>{getBowlerStats(match.last_bowler)}</Text>}
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity 
          style={{ marginBottom: SPACING.lg, backgroundColor: COLORS.cardElevated, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.borderLight }}
          onPress={() => (navigation as any).navigate('PublicMatch', { matchId: match?.match_id })}
        >
          <Ionicons name="stats-chart" size={18} color={COLORS.primary} style={{marginRight: 8}} />
          <Text style={{ color: COLORS.primary, fontWeight: TYPOGRAPHY.weights.bold, fontSize: TYPOGRAPHY.sizes.md }}>View Full Scorecard & Insights</Text>
        </TouchableOpacity>

        {errorMessage ? <Text style={{color:COLORS.danger, marginBottom:10, fontWeight: TYPOGRAPHY.weights.bold}}>{errorMessage}</Text> : null}

        {match?.match_state === 'paused' && !isSpectator && (
          <TouchableOpacity 
            style={{ marginBottom: SPACING.lg, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' }}
            onPress={() => updateMatchStats({ match_state: 'live' })}
          >
            <LinearGradient colors={[COLORS.primaryDark, COLORS.primary] as any} start={{x:0,y:0}} end={{x:1,y:0}} style={{ height: 60, justifyContent: 'center', alignItems: 'center', borderRadius: BORDER_RADIUS.lg, ...SHADOWS.glowPrimary }}>
              <Text style={{ color: COLORS.black, fontWeight: TYPOGRAPHY.weights.black, fontSize: TYPOGRAPHY.sizes.lg, letterSpacing: 1 }}>▶  RESUME MATCH</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {!isSpectator ? (
          <View style={[styles.controls, (!isLive || isSubmitting) && {opacity:0.4}]} pointerEvents={isLive && !isSubmitting ? 'auto' : 'none'}>
            <View style={styles.row}>{[0,1,2,3].map(r=>(<TouchableOpacity key={r} style={styles.controlBtn} onPress={()=>handleAddBall({r,e:0})}><Text style={styles.controlText}>{r}</Text></TouchableOpacity>))}</View>
            <View style={styles.row}>
              {[4,6].map(r=>(<TouchableOpacity key={r} style={[styles.controlBtn, styles.boundaryBtn]} onPress={()=>handleAddBall({r,e:0})}><Text style={[styles.controlText, styles.boundaryText]}>{r}</Text></TouchableOpacity>))}
              <TouchableOpacity style={[styles.controlBtn, styles.extraBtn]} onPress={()=>{setPendingExtraType('wide');setShowExtraPicker(true);}}><Text style={styles.controlText}>WD</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, styles.extraBtn]} onPress={()=>{setPendingExtraType('noball');setShowExtraPicker(true);}}><Text style={styles.controlText}>NB</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, styles.extraBtn]} onPress={()=>{setPendingExtraType('legbye');setShowExtraPicker(true);}}><Text style={styles.controlText}>LB/B</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, {backgroundColor: '#F59E0B'}]} onPress={() => {
                if (Platform.OS === 'web') {
                  if (window.confirm('Pause match?')) updateMatchStats({ match_state: 'paused' });
                  return;
                }
                Alert.alert('Pause Match', 'Select break type:', [
                  { text: 'Drinks Break', onPress: () => updateMatchStats({ match_state: 'paused' }) },
                  { text: 'Rain', onPress: () => updateMatchStats({ match_state: 'paused' }) },
                  { text: 'Suspend/Abandon Match', onPress: () => updateMatchStats({ match_state: 'completed', winner: 'abandoned' }), style: 'destructive' },
                  { text: 'Other', onPress: () => updateMatchStats({ match_state: 'paused' }) },
                  { text: 'Cancel', style: 'cancel' }
                ]);
              }}>
                <Text style={[styles.controlText, {color:COLORS.white, fontSize: 13, fontWeight: '700'}]}>BREAK</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.controlBtn, styles.wicketBtn]} onPress={()=>{setSelectionType('wicket');setShowModal(true);}}><Text style={[styles.controlText,{color:COLORS.white, letterSpacing: 1}]}>WKT</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: 'rgba(255,82,82,0.12)', borderColor: COLORS.danger, borderWidth: 1.5 }]} onPress={handleUndo}><Text style={[styles.controlText, {color: COLORS.danger, letterSpacing: 1}]}>UNDO</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.cardElevated, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.medium }}>
             <Ionicons name="eye-outline" size={36} color={COLORS.textMuted} />
             <Text style={{color: COLORS.text, fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.black, marginTop: SPACING.md, letterSpacing: 0.5}}>SPECTATOR MODE</Text>
             <Text style={{color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm, marginTop: SPACING.sm, fontWeight: TYPOGRAPHY.weights.semibold, letterSpacing: 0.3}}>STATUS: {match?.match_state?.toUpperCase().replace('_', ' ')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Layout
  container:  { flex:1, backgroundColor:COLORS.background },
  center:     { flex:1, justifyContent:'center', alignItems:'center' },
  scroll:     { padding:SPACING.lg, paddingBottom: 40 },

  // Header bar
  header: {
    flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    padding:SPACING.lg, paddingTop: Platform.OS==='ios' ? 50 : SPACING.lg,
    backgroundColor:'#0F1E35', borderBottomWidth:1, borderBottomColor:COLORS.borderLight,
  },
  headerTitle: { fontSize:TYPOGRAPHY.sizes.md, fontWeight:TYPOGRAPHY.weights.bold, color:COLORS.text, flex:1, textAlign:'center' },

  // Main score card
  mainCard:   { borderRadius:BORDER_RADIUS.xl, marginBottom:SPACING.xl, overflow:'hidden', ...SHADOWS.large },
  scoreText:  { color:COLORS.text, fontSize:TYPOGRAPHY.sizes.display, fontWeight:TYPOGRAPHY.weights.black, textAlign:'center', letterSpacing:-2 },
  overText:   { color:COLORS.textSecondary, fontSize:TYPOGRAPHY.sizes.md, textAlign:'center', marginTop:SPACING.xs, fontWeight:TYPOGRAPHY.weights.semibold, letterSpacing:0.5 },
  playersRow: { flexDirection:'row', justifyContent:'space-between', marginTop:SPACING.xl, gap:SPACING.md },
  playerCol:  { flex:1, alignItems:'center', backgroundColor:'rgba(255,255,255,0.07)', padding:SPACING.md, borderRadius:BORDER_RADIUS.lg, borderWidth:1, borderColor:COLORS.borderGlass },
  playerBox:  { flex:1, alignItems:'center', backgroundColor:'rgba(255,255,255,0.05)', padding:SPACING.md, borderRadius:BORDER_RADIUS.lg, borderWidth:1, borderColor:COLORS.borderGlass },
  playerRole: { color:COLORS.textMuted, fontSize:9, fontWeight:TYPOGRAPHY.weights.black, marginBottom:4, letterSpacing:0.8, textTransform:'uppercase' },
  playerName: { color:COLORS.text, fontSize:TYPOGRAPHY.sizes.sm, fontWeight:TYPOGRAPHY.weights.bold, textAlign:'center', marginBottom:4 },
  pLabel:     { color:COLORS.textMuted, fontSize:9, fontWeight:TYPOGRAPHY.weights.black, marginBottom:4, letterSpacing:0.8, textTransform:'uppercase' },
  pName:      { color:COLORS.text, fontSize:TYPOGRAPHY.sizes.xs, fontWeight:TYPOGRAPHY.weights.bold, textAlign:'center' },

  // Control pad
  controls: { gap:10 },
  row:      { flexDirection:'row', gap:10 },
  controlBtn: {
    flex:1, height:66,
    backgroundColor:COLORS.cardElevated,
    borderRadius:BORDER_RADIUS.lg,
    justifyContent:'center', alignItems:'center',
    borderWidth:1, borderColor:COLORS.border,
    ...SHADOWS.medium,
  },
  controlText:  { fontSize:TYPOGRAPHY.sizes.xl, fontWeight:TYPOGRAPHY.weights.black, color:COLORS.text, letterSpacing:0.3 },
  boundaryBtn:  { backgroundColor:'rgba(41,182,246,0.10)', borderColor:'rgba(41,182,246,0.35)' },
  boundaryText: { color:COLORS.secondary },
  extraBtn:     { backgroundColor:COLORS.card, borderColor:COLORS.border },
  wicketBtn:    { backgroundColor:'rgba(255,82,82,0.15)', borderColor:COLORS.danger, borderWidth:1.5 },
  swapBtn:      { padding:SPACING.sm, backgroundColor:'rgba(255,255,255,0.12)', borderRadius:BORDER_RADIUS.pill },

  // Modal
  modalOverlay: { flex:1, backgroundColor:COLORS.overlay, justifyContent:'flex-end' },
  modalContent: {
    backgroundColor:COLORS.cardElevated, borderTopLeftRadius:BORDER_RADIUS.xl, borderTopRightRadius:BORDER_RADIUS.xl,
    padding:SPACING.xl, maxHeight:'82%', borderWidth:1, borderColor:COLORS.borderLight,
    ...SHADOWS.large,
  },
  modalHeading: { fontSize:TYPOGRAPHY.sizes.xl, fontWeight:TYPOGRAPHY.weights.black, color:COLORS.text, marginBottom:SPACING.lg, textTransform:'uppercase', letterSpacing:1 },
  selectorSection: { marginBottom:SPACING.xl },
  selectorTitle:   { fontSize:TYPOGRAPHY.sizes.xs, fontWeight:TYPOGRAPHY.weights.black, color:COLORS.textSecondary, marginBottom:SPACING.md, textTransform:'uppercase', letterSpacing:0.8 },
  chipContainer:   { flexDirection:'row', flexWrap:'wrap', gap:SPACING.sm },
  chip:            { paddingHorizontal:SPACING.lg, paddingVertical:SPACING.md, borderRadius:BORDER_RADIUS.lg, backgroundColor:COLORS.card, borderWidth:1, borderColor:COLORS.border },
  chipActive:      { backgroundColor:COLORS.primary, borderColor:COLORS.primary },
  chipText:        { fontSize:TYPOGRAPHY.sizes.md, fontWeight:TYPOGRAPHY.weights.bold, color:COLORS.textSecondary },
  chipTextActive:  { color:COLORS.black, fontWeight:TYPOGRAPHY.weights.black },
});
