import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Share, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
// matchService functions are defined inline in this screen
import { CONFIG } from '../config';
import { supabase } from '../services/supabase';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../theme';
import { Button, Card } from '../components/UI';

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

  // ── INIT & REALTIME ──
  const fetchBalls = useCallback(async (innings: number) => {
    try {
      const { data } = await supabase.from('balls').select('*').eq('match_id', matchId).eq('innings', innings).order('created_at', { ascending: true });
      const balls = data || [];
      setInningsBalls(balls);
      const legal = balls.filter(b => b.is_legal !== false).length;
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
            setSelectionType('initial'); setShowModal(true);
          }
        }
        await fetchBalls(data.current_innings || 1);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [matchId, fetchBalls]);

  useEffect(() => {
    fetchMatch();
    const ch = supabase.channel(`scoring:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, (p) => setMatch((m:any) => m ? { ...m, ...p.new } : p.new))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'balls', filter: `match_id=eq.${matchId}` }, (p) => {
        setInningsBalls(prev => [...prev, p.new]);
        if (p.new.is_legal !== false) {
          setTotalLegalBalls(prev => {
            const next = prev + 1;
            setCurrentOverNum(Math.floor(next / 6));
            return next;
          });
        }
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [matchId, fetchMatch]);

  // ── HELPERS ──
  const isLive = match?.match_state === 'live';
  const maxBalls = match?.max_balls || (match?.overs * 6);
  const scoreField = match?.current_innings === 1 ? 'score1' : 'score2';
  const wicketsField = match?.current_innings === 1 ? 'wickets1' : 'wickets2';
  const outPlayers = match?.out_players || [];
  const battingFirst = match?.toss_decision === 'Bat' ? match?.toss_winner : (match?.toss_winner === match?.team1 ? match?.team2 : match?.team1);
  const battingSecond = battingFirst === match?.team1 ? match?.team2 : match?.team1;
  const battingTeamName = match?.current_innings === 1 || match?.current_innings === 3 ? battingFirst : battingSecond;
  
  const battingTeamPlayers = battingTeamName === match?.team1 ? (match?.team1_players || match?.team1Players) : (match?.team2_players || match?.team2Players);
  const bowlingTeamPlayers = battingTeamName === match?.team1 ? (match?.team2_players || match?.team2Players) : (match?.team1_players || match?.team1Players);
  const availableBatters = (battingTeamPlayers||[]).filter((p:string) => !outPlayers.includes(p));
  const availableBowlers = (bowlingTeamPlayers||[]).filter((p:string) => p !== match?.last_bowler);
  const maxWickets = (battingTeamPlayers?.length ?? 11) - 1;

  const getBowlerStats = (bName: string) => {
    const bBalls = inningsBalls.filter(b => b.bowler === bName);
    const legal = bBalls.filter(b => b.is_legal !== false).length;
    const runs = bBalls.filter(b => b.extra_type !== 'bye' && b.extra_type !== 'legbye').reduce((sum, b) => sum + (b.runs||0) + (b.extras||0), 0);
    const wkts = bBalls.filter(b => b.is_wicket && b.wicket_type !== 'Run Out').length;
    return `${Math.floor(legal/6)}.${legal%6}-${runs}-${wkts}`;
  };

  const getBatterStats = (pName: string) => {
    const bBalls = inningsBalls.filter(b => b.batter === pName);
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

  const handleAddBall = async (p: { r: number; e: number; type?: string; isW?: boolean; wType?: string; dismissedPlayer?: string }) => {
    if (isSubmitting || !isLive || isSpectator) return;
    if (!match?.striker || !match?.non_striker || !match?.current_bowler) {
      setSelectionType('initial');
      setShowModal(true);
      setErrorMessage('Select striker, non-striker, and bowler before scoring.');
      return;
    }

    setIsSubmitting(true); setErrorMessage('');

    try {
      // 1. Calculate Ball Properties
      const isLegal = p.type !== 'wide' && p.type !== 'noball';
      const isByeOrLegBye = p.type === 'bye' || p.type === 'legbye';
      
      let ballRuns = p.r;
      let ballExtras = p.e;
      let runsToBatter = p.r;
      let runsToBowler = p.r + p.e;

      if (isByeOrLegBye) { runsToBatter = 0; runsToBowler = 0; }
      // No ball: batter gets credited for runs hit, only the extra penalty is not batter's
      // Wide: batter gets 0 runs (ballRuns = 0)
      if (p.type === 'wide') { runsToBatter = 0; ballRuns = 0; }

      const wTypeNormalized = p.wType ? p.wType.toLowerCase().replace(/\s/g, '') : null;

      // 2. Insert Ball
      await supabase.from('balls').insert({
        match_id: matchId, innings: match.current_innings, over: currentOverNum, ball: inningsBalls.length + 1,
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
      const nextOut = [...outPlayers];
      const newScore = (match[scoreField] || 0) + ballRuns + ballExtras;
      const newWickets = (match[wicketsField] || 0) + (p.isW ? 1 : 0);

      let physicalRuns = p.r;
      if (isByeOrLegBye) physicalRuns = p.e;

      if (p.isW) {
        nextOut.push(p.dismissedPlayer || match.striker);
        nextState = 'wicket_fall';
        if (p.dismissedPlayer === match.striker) nextStriker = null;
        if (p.dismissedPlayer === match.non_striker) nextNon = null;
      } else if (physicalRuns % 2 !== 0) {
        [nextStriker, nextNon] = [nextNon, nextStriker];
      }

      const newTotalLegal = totalLegalBalls + (isLegal ? 1 : 0);
      const isOverEnd = isLegal && (newTotalLegal % 6 === 0);
      
      if (isOverEnd) {
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
        } else if (newTotalLegal >= maxBalls || newWickets >= maxWickets) {
          nextState = 'completed';
          if (newScore === target - 1) {
            winner = 'tie';
          } else {
            winner = fieldingTeam;
          }
        }
      } else {
        if (newTotalLegal >= maxBalls || newWickets >= maxWickets) nextState = 'innings_break';

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
      if (nextState === 'innings_break') { setSelectionType('initial'); setShowModal(true); }
      else if (nextState === 'wicket_fall') { setSelectionType('batter'); setShowModal(true); }
      else if (nextState === 'over_break') { setSelectionType('bowler'); setShowModal(true); }
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
        const { data: lastBall } = await supabase
          .from('balls').select('*').eq('match_id', matchId)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (lastBall) {
          await supabase.from('balls').delete().eq('id', lastBall.id);
          // Re-fetch all balls & recalculate
          const { data: allBalls } = await supabase
            .from('balls').select('*').eq('match_id', matchId)
            .order('created_at', { ascending: true });
          const balls = allBalls || [];
          // Recalculate scores
          let s1 = 0, w1 = 0, s2 = 0, w2 = 0;
          const outP: string[] = [];
          balls.forEach(b => {
            const total = (b.runs || 0) + (b.extras || 0);
            if (b.innings === 1) { s1 += total; if (b.is_wicket) w1++; }
            else if (b.innings === 2) { s2 += total; if (b.is_wicket) w2++; }
            if (b.is_wicket && (b.dismissed_player || b.batter)) outP.push(b.dismissed_player || b.batter);
          });
          await updateMatchStats({
            score1: s1, wickets1: w1, score2: s2, wickets2: w2,
            striker: lastBall.batter || match?.striker || null,
            non_striker: match?.non_striker || null,
            current_bowler: lastBall.bowler || match?.current_bowler || null,
            match_state: balls.length > 0 ? 'live' : 'setup',
            out_players: outP,
            winner: null,
          });
          await fetchBalls(match.current_innings || 1);
        }
      } catch (e) { console.error('Undo error:', e); }
      finally { setIsSubmitting(false); }
    };
    if (Platform.OS === 'web') {
      if (!window.confirm('Delete last ball and recalculate?')) return;
      undo();
    } else {
      Alert.alert("Undo", "Delete last ball and recalculate?", [
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
        setTimeout(() => { setSelectedBowler(null); setSelectionType('bowler'); setShowModal(true); }, 300);
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
          <View style={{flexDirection:'row',gap:24,justifyContent:'center',marginTop:24, marginBottom: 16, flexWrap: 'wrap'}}>
            {[0,1,2,3,4,6].map(n=>(
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
          <View style={{backgroundColor: '#10B981', padding: 16, borderRadius: BORDER_RADIUS.lg, marginBottom: 16, alignItems: 'center'}}>
            <Text style={{color: '#FFF', fontWeight: '900', fontSize: 18}}>
              {match.winner === 'tie' ? 'MATCH TIED' : `${match.winner.toUpperCase()} WINS!`}
            </Text>
          </View>
        )}
        <Card style={styles.mainCard}>
          <Text style={styles.scoreText}>{match?.[scoreField]}/{match?.[wicketsField]}</Text>
          <Text style={styles.overText}>Overs: {Math.floor(totalLegalBalls/6)}.{totalLegalBalls%6}</Text>
          {match?.current_innings === 2 && match?.match_state !== 'completed' && match?.target && (
             <Text style={[styles.overText, { color: '#FCD34D', marginTop: 4 }]}>
               {match.target - (match?.[scoreField] || 0)} runs needed in {maxBalls - totalLegalBalls} balls
             </Text>
          )}
          <View style={styles.playersRow}>
            <View style={styles.playerCol}>
              <Text style={styles.playerRole}>BATTER</Text>
              <Text style={styles.playerName}>🏏 {match?.striker || '-'}</Text>
            </View>
            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
              {!isSpectator && (
                <TouchableOpacity onPress={handleSwapStrikers} style={styles.swapBtn}>
                  <Ionicons name="swap-horizontal" size={24} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.playerCol}>
              <Text style={styles.playerRole}>NON-STRIKER</Text>
              <Text style={styles.playerName}>🏃 {match?.non_striker || '-'}</Text>
            </View>
          </View>
          <View style={styles.playersRow}>
            <View style={styles.playerBox}><Text style={styles.pLabel}>BOWLER</Text><Text style={styles.pName}>🎯 {match?.current_bowler}</Text></View>
            <View style={styles.playerBox}><Text style={styles.pLabel}>LAST BOWLER</Text><Text style={styles.pName}>🎯 {match?.last_bowler || '-'}</Text></View>
          </View>
        </Card>

        {errorMessage ? <Text style={{color:COLORS.danger, marginBottom:10}}>{errorMessage}</Text> : null}

        {match?.match_state === 'paused' && !isSpectator && (
          <TouchableOpacity 
            style={[styles.controlBtn, { backgroundColor: COLORS.primary, marginBottom: 16, height: 60 }]} 
            onPress={() => updateMatchStats({ match_state: 'live' })}
          >
            <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 18 }}>RESUME MATCH</Text>
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
                  { text: 'Other', onPress: () => updateMatchStats({ match_state: 'paused' }) },
                  { text: 'Cancel', style: 'cancel' }
                ]);
              }}>
                <Text style={[styles.controlText, {color:COLORS.white, fontSize: 13, fontWeight: '700'}]}>BREAK</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TouchableOpacity style={[styles.controlBtn, styles.wicketBtn]} onPress={()=>{setSelectionType('wicket');setShowModal(true);}}><Text style={[styles.controlText,{color:COLORS.white}]}>WKT</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.controlBtn, {backgroundColor: '#FEE2E2', borderColor: '#EF4444', borderWidth: 1}]} onPress={handleUndo}><Text style={[styles.controlText, {color: '#EF4444'}]}>UNDO</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.mainCard, {backgroundColor: '#1E293B', alignItems: 'center'}]}>
             <Ionicons name="eye" size={32} color="#94A3B8" />
             <Text style={{color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginTop: 8}}>SPECTATOR MODE</Text>
             <Text style={{color: '#94A3B8', fontSize: 14, marginTop: 4, fontWeight: '600'}}>MATCH STATUS: {match?.match_state?.toUpperCase().replace('_', ' ')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:COLORS.background},center:{flex:1,justifyContent:'center',alignItems:'center'},
  header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',padding:20,backgroundColor:COLORS.white,borderBottomWidth:1,borderBottomColor:COLORS.border},
  headerTitle:{fontSize:16,fontWeight:'700',color:COLORS.text},scroll:{padding:16},
  mainCard:{backgroundColor:COLORS.primary,padding:32,borderRadius:BORDER_RADIUS.xl,marginBottom:24},
  scoreText:{color:COLORS.white,fontSize:48,fontWeight:'900',textAlign:'center'},
  overText:{color:COLORS.white,fontSize:16,textAlign:'center',marginTop:8,opacity:0.9,fontWeight:'700'},
  playersRow:{flexDirection:'row',justifyContent:'space-between',marginTop:24,gap:12},playerBox:{flex:1,alignItems:'center'},
  pLabel:{color:COLORS.white,opacity:0.6,fontSize:10,fontWeight:'800',marginBottom:4},pName:{color:COLORS.white,fontSize:13,fontWeight:'800',textAlign:'center'},
  controls:{gap:12},row:{flexDirection:'row',gap:12},
  controlBtn:{flex:1,height:64,backgroundColor:COLORS.white,borderRadius:BORDER_RADIUS.lg,justifyContent:'center',alignItems:'center',borderWidth:1,borderColor:COLORS.border},
  controlText:{fontSize:20,fontWeight:'800',color:COLORS.text},boundaryBtn:{backgroundColor:'#E0F2FE',borderColor:COLORS.primary},boundaryText:{color:COLORS.primary},
  extraBtn:{backgroundColor:'#F8FAFC'},wicketBtn:{backgroundColor:COLORS.danger,borderColor:COLORS.danger},
  swapBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  modalOverlay:{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'flex-end'},
  modalContent:{backgroundColor:COLORS.white,borderTopLeftRadius:32,borderTopRightRadius:32,padding:24,maxHeight:'80%'},
  modalHeading:{fontSize:22,fontWeight:'900',color:COLORS.text,marginBottom:16},
  selectorSection:{marginBottom:24},selectorTitle:{fontSize:14,fontWeight:'800',color:COLORS.textSecondary,marginBottom:12,textTransform:'uppercase'},
  chipContainer:{flexDirection:'row',flexWrap:'wrap',gap:10},
  chip:{paddingHorizontal:16,paddingVertical:10,borderRadius:12,backgroundColor:'#F8FAFC',borderWidth:1,borderColor:COLORS.border},
  chipActive:{backgroundColor:COLORS.primary,borderColor:COLORS.primary},chipText:{fontSize:14,fontWeight:'700',color:COLORS.text},chipTextActive:{color:COLORS.white},
});
