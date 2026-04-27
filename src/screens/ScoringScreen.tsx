import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert as RNAlert, Modal, Share, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMatchById, updateMatch } from '../services/matchService';
import { Match, BallEvent } from '../types';

import { AppNavigationProp } from '../navigation/navigation.types';

export default function ScoringScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<any>();

  // Platform-aware alert helper
  const showAlert = (title: string, msg: string) => Platform.OS === 'web' ? window.alert(`${title}:\n${msg}`) : RNAlert.alert(title, msg);

  const { matchId } = route.params || {};

  // Guard: if matchId is missing, show error and go back
  useEffect(() => {
    if (!matchId) {
      showAlert('Error', 'Match ID not provided. Returning to Home.');
      navigation.navigate('Tabs', { screen: 'Home' });
    }
  }, [matchId]);

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentInnings, setCurrentInnings] = useState(1);
  const [ballLog, setBallLog] = useState<BallEvent[]>([]);
  
  // Players
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');
  const [outPlayers, setOutPlayers] = useState<string[]>([]);

  // States
  const [inningsBreak, setInningsBreak] = useState(false);
  const [matchOver, setMatchOver] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState('');
  const [showInitialPrompt, setShowInitialPrompt] = useState(true);

  // Bowling tracking
  const [lastOverBowler, setLastOverBowler] = useState('');
  const [wicketType, setWicketType] = useState('bowled');
  const [dismissedPlayer, setDismissedPlayer] = useState('');
  const [fielder, setFielder] = useState('');
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [pendingWicketRuns, setPendingWicketRuns] = useState(0);
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [extrasType, setExtrasType] = useState<'bye' | 'legbye'>('bye');
  const [extrasRuns, setExtrasRuns] = useState('1');
  const [showSelectModal, setShowSelectModal] = useState<'striker' | 'nonStriker' | 'bowler' | 'fielder' | null>(null);
  const [showControlsModal, setShowControlsModal] = useState(false);
  const [selectModalContext, setSelectModalContext] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => { 
    if (matchId) {
      loadMatch(); 
    } else {
      setLoading(false);
      showAlert('Error', 'No Match ID provided');
    }
  }, [matchId]);

  // Prompt for players at start of innings
  useEffect(() => {
    if (!loading && match && showInitialPrompt && !inningsBreak && !matchOver) {
      setShowInitialPrompt(false);
      // Auto-prompt for striker
      setTimeout(() => setShowSelectModal('striker'), 300);
    }
  }, [loading, match, currentInnings]);

  // Calculate out players from ball log — CURRENT INNINGS ONLY
  useEffect(() => {
    const out = new Set<string>();
    ballLog.forEach(b => {
      if (b.innings === currentInnings && b.isWicket && b.dismissedPlayer && !b.id?.startsWith('edited_')) {
        out.add(b.dismissedPlayer);
      }
    });
    setOutPlayers(Array.from(out));
  }, [ballLog, currentInnings]);

  const loadMatch = async () => {
    try {
      setLoading(true);
      const data = await getMatchById(matchId);
      if (data) {
        setMatch(data);
        setBallLog(data.ballLog || []);
        setCurrentInnings(data.currentInnings || 1);
        if (data.status === 'Completed') {
          setMatchOver(true);
        }
      } else {
        showAlert('Error', 'Match not found');
      }
    } catch (error) {
      console.error('Error in loadMatch:', error);
      showAlert('Error', 'Failed to load match data');
    } finally {
      setLoading(false);
    }
  };

  // Safe computed values with fallbacks
  const inningsBalls = (ballLog || []).filter(b => b && b.innings === currentInnings && !b.id?.startsWith('edited_'));
  const legalBalls = inningsBalls.filter(b => !b.isWide && !b.isNoBall);
  const totalRuns = inningsBalls.reduce((s, b) => s + (b.runs || 0) + (b.extras || 0), 0);
  const totalWickets = inningsBalls.filter(b => b.isWicket).length;
  const completedOvers = Math.floor(legalBalls.length / 6);
  const remainingBalls = legalBalls.length % 6;
  const maxOvers = match?.overs || 20;

  const battingFirst = match?.tossDecision === 'Bat' ? match?.tossWinner : (match?.tossWinner === match?.team1 ? match?.team2 : match?.team1);
  const battingSecond = battingFirst === match?.team1 ? match?.team2 : match?.team1;
  const currentBatting = (currentInnings === 1 ? battingFirst : battingSecond) || 'Team';
  const currentBowling = (currentBatting === match?.team1 ? match?.team2 : match?.team1) || 'Opponent';
  
  const batPlayers = currentBatting === match?.team1 ? (match?.team1Players || []) : (match?.team2Players || []);
  const bowlPlayers = currentBowling === match?.team1 ? (match?.team1Players || []) : (match?.team2Players || []);

  const inn1Runs = (ballLog || []).filter(b => b && b.innings === 1 && !b.id?.startsWith('edited_')).reduce((s, b) => s + (b.runs || 0) + (b.extras || 0), 0);

  // Over History calculation — group balls into overs by legal ball count
  const overHistory: { over: number; runs: number; balls: BallEvent[] }[] = [];
  if (inningsBalls.length > 0) {
    let legalCount = 0;
    let currentOverBalls: BallEvent[] = [];
    let currentOverRuns = 0;
    let overNum = 1;

    for (const b of inningsBalls) {
      currentOverBalls.push(b);
      currentOverRuns += (b.runs || 0) + (b.extras || 0);
      if (!b.isWide && !b.isNoBall) legalCount++;

      if (legalCount === 6) {
        overHistory.push({ over: overNum, runs: currentOverRuns, balls: currentOverBalls });
        overNum++;
        legalCount = 0;
        currentOverBalls = [];
        currentOverRuns = 0;
      }
    }
    // Partial over (balls remaining)
    if (currentOverBalls.length > 0) {
      overHistory.push({ over: overNum, runs: currentOverRuns, balls: currentOverBalls });
    }
  }

  const recordBall = async (p: { runs: number, isWd?: boolean, isNb?: boolean, isBye?: boolean, isLb?: boolean, isW?: boolean, wType?: string, fld?: string, dism?: string }) => {
    if (inningsBreak || matchOver || isRecording) return;
    setIsRecording(true);
    
    try {
      // Block scoring if overs limit reached
      if (completedOvers >= maxOvers && remainingBalls === 0) {
        checkInningsEnd(ballLog);
        return;
      }
      if (!striker || !nonStriker || !bowler) { showAlert('Missing Players', 'Select striker, non-striker and bowler.'); return; }
      if (striker === nonStriker) { showAlert('Error', 'Striker and non-striker cannot be same player.'); return; }
      if (outPlayers.includes(striker)) { setStriker(''); setShowSelectModal('striker'); return; }
      if (outPlayers.includes(nonStriker)) { setNonStriker(''); setShowSelectModal('nonStriker'); return; }
      
      let extras = 0;
    if (p.isWd && match?.rules?.wideExtraRun) extras = 1;
    if (p.isNb && match?.rules?.noBallExtraRun) extras = 1;

    const ball: BallEvent = {
      id: Date.now().toString(), innings: currentInnings, over: completedOvers, ball: remainingBalls + 1,
      batter: striker, bowler, runs: p.runs, isWide: !!p.isWd, isNoBall: !!p.isNb, isBye: !!p.isBye,
      isLegBye: !!p.isLb, isWicket: !!p.isW, wicketType: p.wType as any, dismissedPlayer: p.dism, extras, timestamp: Date.now()
    };
    const newLog = [...ballLog, ball];
    setBallLog(newLog);
    // Save ball log AND computed score to Firestore
    const newInningsBalls = newLog.filter(b => b && b.innings === currentInnings && !b.id?.startsWith('edited_'));
    const newRuns = newInningsBalls.reduce((s, b) => s + (b.runs || 0) + (b.extras || 0), 0);
    const newWickets = newInningsBalls.filter(b => b.isWicket).length;
    const newLegal = newInningsBalls.filter(b => !b.isWide && !b.isNoBall).length;
    const scoreStr = `${newRuns}/${newWickets} (${Math.floor(newLegal/6)}.${newLegal%6})`;
    const scoreUpdate: any = { ballLog: newLog };
    if (currentInnings === 1) scoreUpdate.score1 = scoreStr;
    else scoreUpdate.score2 = scoreStr;
    await updateMatch(matchId, scoreUpdate);

    // Handle wicket — clear dismissed player and auto-prompt replacement
    if (p.isW && p.dism) {
      setOutPlayers([...outPlayers, p.dism]);
      if (p.dism === striker) {
        setStriker('');
        // Auto-prompt for new striker after a short delay
        setTimeout(() => {
          setSelectModalContext(`${p.dism} is OUT! Select new striker.`);
          setShowSelectModal('striker');
        }, 400);
      } else if (p.dism === nonStriker) {
        setNonStriker('');
        setTimeout(() => {
          setSelectModalContext(`${p.dism} is OUT! Select new non-striker.`);
          setShowSelectModal('nonStriker');
        }, 400);
      }
    }

    // Rotate Strike logic
    // For run-outs: batters crossed means we swap
    // For other wickets: no rotation needed since dismissed player's slot is already cleared
    if (!p.isW || p.wType === 'runout') {
      if (p.runs % 2 !== 0) {
        // Only swap if both slots are still filled
        const currentStriker = (p.isW && p.dism === striker) ? '' : striker;
        const currentNonStriker = (p.isW && p.dism === nonStriker) ? '' : nonStriker;
        setStriker(currentNonStriker);
        setNonStriker(currentStriker);
      }
    }
    
    // Over complete - need to change bowler and rotate batters
    const nl = newLog.filter(b=>b.innings===currentInnings && !b.id?.startsWith('edited_') && !b.isWide && !b.isNoBall).length;
    const currentOver = Math.floor(nl / 6);
    
    if (nl > 0 && nl % 6 === 0) {
      // Check if we've reached the overs limit BEFORE prompting for bowler
      if (currentOver >= maxOvers) {
        // Innings ends immediately when overs limit is reached
        checkInningsEnd(newLog);
        return;
      }
      
      // Swap batters at end of over
      const t = striker;
      setStriker(nonStriker);
      setNonStriker(t);
      
      // Track last over bowler so they can't bowl next over
      setLastOverBowler(bowler);
      setBowler('');
      
      // Auto-prompt for next bowler
      setSelectModalContext(`Select bowler for over ${currentOver + 1} (${bowler} bowled last over)`);
      setShowSelectModal('bowler');
    }
    
    checkInningsEnd(newLog);
    } finally {
      setIsRecording(false);
    }
  };

  const checkInningsEnd = async (log: BallEvent[]) => {
    const b = log.filter(x=>x.innings===currentInnings && !x.id?.startsWith('edited_'));
    const r = b.reduce((s,x)=>s+x.runs+x.extras,0);
    const w = b.filter(x=>x.isWicket).length;
    const l = b.filter(x=>!x.isWide && !x.isNoBall).length;

    if (w >= (batPlayers?.length||11)-1 || Math.floor(l/6) >= maxOvers) {
      if (currentInnings === 1) {
        setInningsBreak(true);
      } else {
        const msg = r > inn1Runs ? `${currentBatting} wins by ${((batPlayers?.length||11)-1)-w} wickets!` : r < inn1Runs ? `${battingFirst} wins by ${inn1Runs-r} runs!` : 'Match Tied!';
        setWinnerMessage(msg);
        setMatchOver(true);
        await updateMatch(matchId, { status: 'Completed' });
      }
    } else if (currentInnings === 2 && r > inn1Runs) {
      const msg = `${currentBatting} wins by ${((batPlayers?.length||11)-1)-w} wickets!`;
      setWinnerMessage(msg);
      setMatchOver(true);
      await updateMatch(matchId, { status: 'Completed' });
    }
  };

  const handleStartInnings2 = async () => {
    setInningsBreak(false);
    setCurrentInnings(2);
    setStriker('');
    setNonStriker('');
    setBowler('');
    setOutPlayers([]);
    setShowInitialPrompt(true);
    await updateMatch(matchId, { currentInnings: 2 });
  };

  const undo = async () => {
    if (ballLog.length === 0 || inningsBreak || matchOver) return;
    // Find the last non-edited ball
    const nl = [...ballLog];
    for (let i = nl.length - 1; i >= 0; i--) {
      if (!nl[i].id?.startsWith('edited_')) {
        nl[i] = { ...nl[i], id: 'edited_' + nl[i].id };
        break;
      }
    }
    setBallLog(nl); await updateMatch(matchId, { ballLog: nl });
  };
  // Count how many undos are available (max 3)
  const undosAvailable = (() => {
    let count = 0;
    for (let i = ballLog.length - 1; i >= 0 && count < 3; i--) {
      if (!ballLog[i].id?.startsWith('edited_')) count++;
      else break; // stop at first already-edited ball
    }
    return count;
  })();

  const handleShare = async () => {
    setShowControlsModal(false);
    try {
      await Share.share({ message: `🏏 Watch ${match?.team1} vs ${match?.team2} Live on GullyCric!\nMatch ID: ${matchId}` });
    } catch (e) {}
  };

  const handleSuspend = () => {
    setShowControlsModal(false);
    navigation.navigate('Tabs', { screen: 'My Space' });
  };

  const handleDrinksBreak = () => {
    setShowControlsModal(false);
    showAlert('Drinks Break', 'Take a break! Resume scoring when ready.');
  };

  const getBallBg = (b: BallEvent) => b.id?.startsWith('edited_') ? '#F3F4F6' : b.isWicket ? '#FEE2E2' : b.runs===6 ? '#EDE9FE' : b.runs===4 ? '#DBEAFE' : (b.isWide||b.isNoBall) ? '#FEF3C7' : '#D1FAE5';
  const getBallLbl = (b: BallEvent) => b.isWicket?'W':b.isWide?`${b.runs}wd`:b.isNoBall?`${b.runs}nb`:b.isBye?`${b.runs}b`:b.isLegBye?`${b.runs}lb`:b.runs;

  if (loading) return <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: '#FFF'}}><ActivityIndicator size="large" color="#10B981" /><Text style={{marginTop: 12, color: '#6B7280', fontWeight: '500'}}>Loading Match...</Text></View>;
  
  if (!match) return (
    <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: '#FFF', padding: 20}}>
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text style={{fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 16}}>Match Not Found</Text>
      <Text style={{fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8}}>We couldn't find the match you're looking for. It may have been deleted.</Text>
      <TouchableOpacity 
        style={{marginTop: 24, backgroundColor: '#111827', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12}}
        onPress={() => navigation.goBack()}
      >
        <Text style={{color: '#FFF', fontWeight: '600'}}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{flex:1, backgroundColor:'#F9FAFB'}}>
      <ScrollView style={{flex:1}} contentContainerStyle={{padding: 20, paddingBottom: 60}} showsVerticalScrollIndicator={true} bounces={false}>
        
        {/* Header */}
        <View style={{flexDirection:'row', alignItems:'center', marginBottom:16}}>
          <TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#1F2937"/></TouchableOpacity>
          <View style={{flex:1, marginLeft:16}}><Text style={{fontSize:20, fontWeight:'bold', color:'#111827'}}>Live Scoring</Text></View>
          <TouchableOpacity onPress={handleDrinksBreak} style={{paddingHorizontal:10, paddingVertical:8, backgroundColor:'#FEF3C7', borderRadius:8, marginRight:6}}><Ionicons name="cafe-outline" size={18} color="#D97706"/></TouchableOpacity>
          <TouchableOpacity onPress={undo} disabled={undosAvailable === 0} style={{paddingHorizontal:12, paddingVertical:8, backgroundColor: undosAvailable > 0 ? '#FEE2E2' : '#F3F4F6', borderRadius:8, marginRight:8}}><Text style={{color: undosAvailable > 0 ? '#EF4444' : '#9CA3AF', fontWeight:'600'}}>Undo{undosAvailable > 0 ? ` (${undosAvailable})` : ''}</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>setShowControlsModal(true)} style={{padding:8}}><Ionicons name="ellipsis-vertical" size={24} color="#1F2937"/></TouchableOpacity>
        </View>

        {/* Scoreboard */}
        <View style={{backgroundColor:'#1F2937', padding:20, borderRadius:16, alignItems:'center', marginBottom:16, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.2, shadowRadius:8, elevation:4}}>
          <Text style={{color:'#9CA3AF', fontSize:14, fontWeight:'600', textTransform:'uppercase', letterSpacing:1}}>{currentBatting}</Text>
          <Text style={{fontSize:48, color:'#FFF', fontWeight:'800', marginVertical:4}}>{totalRuns}<Text style={{fontSize:24, color:'#9CA3AF'}}> / {totalWickets}</Text></Text>
          <Text style={{color:'#9CA3AF', fontSize:16, fontWeight:'500'}}>{completedOvers}.{remainingBalls} <Text style={{fontSize:14}}>/ {maxOvers} ov</Text></Text>
          {currentInnings===2 && <View style={{backgroundColor:'#4B5563', paddingHorizontal:12, paddingVertical:4, borderRadius:12, marginTop:12}}><Text style={{color:'#FBBF24', fontWeight:'700'}}>Target: {inn1Runs+1}</Text></View>}
        </View>

        {/* Dynamic Center Content */}
        {matchOver ? (
          <View style={{backgroundColor:'#ECFDF5', padding:24, borderRadius:16, alignItems:'center', marginBottom:20, borderWidth:1, borderColor:'#A7F3D0'}}>
            <Text style={{fontSize:24, fontWeight:'800', color:'#065F46', marginBottom:8, textAlign:'center'}}>Match Completed!</Text>
            <Text style={{fontSize:16, color:'#10B981', fontWeight:'600', marginBottom:24, textAlign:'center'}}>{winnerMessage}</Text>
            <TouchableOpacity style={{backgroundColor:'#10B981', paddingHorizontal:24, paddingVertical:14, borderRadius:12, width:'100%', alignItems:'center'}} onPress={()=>navigation.replace('MatchDetail', {matchId})}>
              <Text style={{color:'#FFF', fontWeight:'700', fontSize:16}}>View Match Summary</Text>
            </TouchableOpacity>
          </View>
        ) : inningsBreak ? (
          <View style={{backgroundColor:'#FEF3C7', padding:24, borderRadius:16, alignItems:'center', marginBottom:20, borderWidth:1, borderColor:'#FDE68A'}}>
            <Text style={{fontSize:20, fontWeight:'800', color:'#92400E', marginBottom:8}}>Innings Break</Text>
            <Text style={{fontSize:16, color:'#B45309', marginBottom:24, textAlign:'center'}}>First innings complete. Target for {battingSecond} is {inn1Runs+1}.</Text>
            <TouchableOpacity style={{backgroundColor:'#F59E0B', paddingHorizontal:24, paddingVertical:14, borderRadius:12, width:'100%', alignItems:'center'}} onPress={handleStartInnings2}>
              <Text style={{color:'#FFF', fontWeight:'700', fontSize:16}}>Start 2nd Innings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Player Selection */}
            <View style={{flexDirection:'row', gap:10, marginBottom:16}}>
              <TouchableOpacity style={{flex:1, backgroundColor:'#FFF', padding:12, borderRadius:12, shadowOpacity:0.05, shadowRadius:4, elevation:1}} onPress={()=>setShowSelectModal('striker')}>
                <Text style={{color:'#6B7280', fontSize:11, textTransform:'uppercase', fontWeight:'600'}}>Striker (🏏)</Text><Text style={{fontWeight:'700', fontSize:14, marginTop:4, color:striker?'#111827':'#9CA3AF'}} numberOfLines={1}>{striker||'Select'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1, backgroundColor:'#FFF', padding:12, borderRadius:12, shadowOpacity:0.05, shadowRadius:4, elevation:1}} onPress={()=>setShowSelectModal('nonStriker')}>
                <Text style={{color:'#6B7280', fontSize:11, textTransform:'uppercase', fontWeight:'600'}}>Non-Striker</Text><Text style={{fontWeight:'700', fontSize:14, marginTop:4, color:nonStriker?'#111827':'#9CA3AF'}} numberOfLines={1}>{nonStriker||'Select'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex:1, backgroundColor:'#FFF', padding:12, borderRadius:12, shadowOpacity:0.05, shadowRadius:4, elevation:1}} onPress={()=>setShowSelectModal('bowler')}>
                <Text style={{color:'#6B7280', fontSize:11, textTransform:'uppercase', fontWeight:'600'}}>Bowler (⚾)</Text><Text style={{fontWeight:'700', fontSize:14, marginTop:4, color:bowler?'#111827':'#9CA3AF'}} numberOfLines={1}>{bowler||'Select'}</Text>
              </TouchableOpacity>
            </View>

            {/* Run Controls */}
            <Text style={{fontWeight:'700', color:'#374151', marginBottom:8, marginLeft:4}}>Runs</Text>
            <View style={{flexDirection:'row', gap:10, flexWrap:'wrap', marginBottom:20}}>
              {[0,1,2,3,4,6].map(r => (
                <TouchableOpacity key={r} style={{width:'30%', aspectRatio:1.5, backgroundColor:'#FFF', borderRadius:12, justifyContent:'center', alignItems:'center', shadowColor:'#000', shadowOffset:{width:0,height:2}, shadowOpacity:0.05, shadowRadius:4, elevation:2}} onPress={()=>recordBall({runs:r})}>
                  <Text style={{fontSize:24, fontWeight:'800', color: r===4?'#3B82F6':r===6?'#8B5CF6':'#111827'}}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Extras Controls */}
            <Text style={{fontWeight:'700', color:'#374151', marginBottom:8, marginLeft:4}}>Extras & Wicket</Text>
            <View style={{flexDirection:'row', gap:10, flexWrap:'wrap', marginBottom:24}}>
              <TouchableOpacity style={{flex:1, minWidth:'45%', height:48, backgroundColor:'#FEF3C7', justifyContent:'center', alignItems:'center', borderRadius:12}} onPress={()=>recordBall({runs:0, isWd:true})}><Text style={{fontWeight:'600', color:'#D97706'}}>Wide</Text></TouchableOpacity>
              <TouchableOpacity style={{flex:1, minWidth:'45%', height:48, backgroundColor:'#FEF3C7', justifyContent:'center', alignItems:'center', borderRadius:12}} onPress={()=>recordBall({runs:0, isNb:true})}><Text style={{fontWeight:'600', color:'#D97706'}}>No Ball</Text></TouchableOpacity>
              <TouchableOpacity style={{flex:1, minWidth:'45%', height:48, backgroundColor:'#EDE9FE', justifyContent:'center', alignItems:'center', borderRadius:12}} onPress={()=>{setExtrasType('bye'); setShowExtrasModal(true);}}><Text style={{fontWeight:'600', color:'#6D28D9'}}>Bye</Text></TouchableOpacity>
              <TouchableOpacity style={{flex:1, minWidth:'45%', height:48, backgroundColor:'#EDE9FE', justifyContent:'center', alignItems:'center', borderRadius:12}} onPress={()=>{setExtrasType('legbye'); setShowExtrasModal(true);}}><Text style={{fontWeight:'600', color:'#6D28D9'}}>Leg Bye</Text></TouchableOpacity>
              <TouchableOpacity style={{width:'100%', height:56, backgroundColor:'#FEF2F2', justifyContent:'center', alignItems:'center', borderRadius:12, borderWidth:1, borderColor:'#FECACA', marginTop:4}} onPress={()=>{setShowWicketModal(true); setPendingWicketRuns(0); setFielder(''); setDismissedPlayer(striker);}}><Text style={{color:'#EF4444', fontWeight:'800', fontSize:18, letterSpacing:1}}>WICKET</Text></TouchableOpacity>
            </View>
          </>
        )}

        {/* Over History */}
        <Text style={{fontWeight:'700', color:'#374151', marginBottom:8, marginLeft:4}}>Over History</Text>
        {[...overHistory].reverse().map(o => (
          <View key={o.over} style={{backgroundColor:'#FFF', padding:16, borderRadius:12, marginBottom:10, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.02, shadowRadius:2, elevation:1}}>
            <Text style={{fontWeight:'700', color:'#6B7280', marginBottom:10, fontSize:13}}>OVER {o.over} <Text style={{fontWeight:'500'}}>• {o.runs} runs</Text></Text>
            <View style={{flexDirection:'row', gap:8, flexWrap:'wrap'}}>
              {o.balls.map(b=>(
                <View key={b.id || Math.random().toString()} style={{width:32, height:32, borderRadius:16, backgroundColor:getBallBg(b), justifyContent:'center', alignItems:'center', opacity: b.id?.startsWith('edited_')?0.4:1}}>
                  <Text style={{fontSize:11, fontWeight:'700', color:'#1F2937', textDecorationLine: b.id?.startsWith('edited_')?'line-through':'none'}}>{getBallLbl(b)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Select Modal */}
      <Modal visible={!!showSelectModal} transparent animationType="slide">
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end'}}>
          <View style={{backgroundColor:'#FFF', padding:24, borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'70%', display:'flex', flexDirection:'column'}}>
            <Text style={{fontSize:20, fontWeight:'800', marginBottom:8, color:'#111827'}}>
              Select {showSelectModal === 'nonStriker' ? 'Non-Striker' : showSelectModal ? showSelectModal.charAt(0).toUpperCase() + showSelectModal.slice(1) : ''}
            </Text>
            {selectModalContext && <Text style={{fontSize:14, color:'#6B7280', marginBottom:16, fontStyle:'italic'}}>{selectModalContext}</Text>}
            <ScrollView showsVerticalScrollIndicator={true} style={{flex:1, marginBottom:16}}>
              {((showSelectModal==='bowler'||showSelectModal==='fielder')?bowlPlayers:batPlayers)?.map((p:any, i:number)=>{
                // Exclude out players (except for fielder selection)
                if (showSelectModal !== 'fielder' && showSelectModal !== 'bowler' && outPlayers.includes(p)) return null;
                // Bowlers can't be out players either
                if (showSelectModal === 'bowler' && outPlayers.includes(p)) return null;
                // Exclude current striker from nonStriker selection
                if (showSelectModal === 'nonStriker' && p === striker) return null;
                // Exclude current nonStriker from striker selection  
                if (showSelectModal === 'striker' && p === nonStriker) return null;
                // Prevent same bowler bowling consecutive overs
                if (showSelectModal === 'bowler' && p === lastOverBowler) return null;
                
                const isOut = outPlayers.includes(p);
                return (
                  <TouchableOpacity key={i} style={{paddingVertical:16, borderBottomWidth:1, borderBottomColor:'#F3F4F6'}} onPress={()=>{
                    if(showSelectModal==='striker') {
                      setStriker(p);
                      // Chain: if nonStriker not set, prompt next
                      if (!nonStriker) setTimeout(() => { setSelectModalContext('Now select non-striker'); setShowSelectModal('nonStriker'); }, 300);
                    }
                    if(showSelectModal==='nonStriker') {
                      setNonStriker(p);
                      // Chain: if bowler not set, prompt next
                      if (!bowler) setTimeout(() => { setSelectModalContext('Now select bowler'); setShowSelectModal('bowler'); }, 300);
                    }
                    if(showSelectModal==='bowler') setBowler(p);
                    if(showSelectModal==='fielder') setFielder(p);
                    setShowSelectModal(null);
                    setSelectModalContext('');
                  }}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                      <Text style={{fontSize:16, color:'#374151', fontWeight:'500'}}>{p}</Text>
                      {isOut && showSelectModal === 'fielder' && <Text style={{fontSize:12, color:'#EF4444', fontWeight:'600'}}>🔴 Out</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={{padding:16, backgroundColor:'#F3F4F6', borderRadius:12, alignItems:'center'}} onPress={()=>{setShowSelectModal(null); setSelectModalContext('')}}><Text style={{fontWeight:'700', color:'#6B7280'}}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Extras Modal */}
      <Modal visible={showExtrasModal} transparent animationType="slide">
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end'}}>
          <View style={{backgroundColor:'#FFF', padding:24, borderTopLeftRadius:24, borderTopRightRadius:24}}>
            <Text style={{fontSize:20, fontWeight:'800', marginBottom:16, color:'#111827'}}>{extrasType === 'bye' ? 'Bye' : 'Leg Bye'} runs</Text>
            <View style={{flexDirection:'row', gap:10, marginBottom:24}}>
              {[1,2,3,4].map(r=><TouchableOpacity key={r} style={{flex:1, paddingVertical:16, backgroundColor:extrasRuns===String(r)?'#10B981':'#F3F4F6', borderRadius:12, alignItems:'center'}} onPress={()=>setExtrasRuns(String(r))}><Text style={{color:extrasRuns===String(r)?'#FFF':'#374151', fontWeight:'700', fontSize:16}}>{r}</Text></TouchableOpacity>)}
            </View>
            <View style={{flexDirection:'row', gap:12}}>
              <TouchableOpacity style={{flex:1, padding:16, backgroundColor:'#F3F4F6', borderRadius:12, alignItems:'center'}} onPress={()=>setShowExtrasModal(false)}><Text style={{fontWeight:'700', color:'#6B7280'}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={{flex:1, padding:16, backgroundColor:'#10B981', borderRadius:12, alignItems:'center'}} onPress={()=>{ recordBall({runs:parseInt(extrasRuns), isBye:extrasType==='bye', isLb:extrasType==='legbye'}); setShowExtrasModal(false); setExtrasRuns('1'); }}><Text style={{color:'#FFF', fontWeight:'700'}}>Confirm</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Wicket Modal */}
      <Modal visible={showWicketModal && !showSelectModal} transparent animationType="slide">
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center'}}>
          <View style={{backgroundColor:'#FFF', borderRadius:24, width:'90%', maxHeight:'80%', display:'flex', flexDirection:'column'}}>
            <ScrollView showsVerticalScrollIndicator={true} style={{flex:1}} bounces={false} contentContainerStyle={{padding:24}}>
              <Text style={{fontSize:20, fontWeight:'800', marginBottom:20, color:'#111827'}}>Wicket Details</Text>
              <Text style={{fontWeight:'600', color:'#6B7280', marginBottom:8}}>Dismissal Type</Text>
              <View style={{flexDirection:'row', gap:8, flexWrap:'wrap', marginBottom:20}}>
                {['bowled','caught','lbw','runout','stumped','retired'].map(t=><TouchableOpacity key={t} style={{paddingHorizontal:16, paddingVertical:10, backgroundColor:wicketType===t?'#EF4444':'#F3F4F6', borderRadius:10}} onPress={()=>setWicketType(t)}><Text style={{color:wicketType===t?'#FFF':'#374151', fontWeight:'600', textTransform:'capitalize'}}>{t}</Text></TouchableOpacity>)}
              </View>
              
              <Text style={{fontWeight:'600', color:'#6B7280', marginBottom:8}}>Dismissed Player</Text>
              <View style={{flexDirection:'row', gap:10, marginBottom:20}}>
                <TouchableOpacity style={{flex:1, padding:12, backgroundColor:dismissedPlayer===striker?'#10B981':'#F3F4F6', borderRadius:10, alignItems:'center'}} onPress={()=>setDismissedPlayer(striker)}><Text style={{fontWeight:'600', color:dismissedPlayer===striker?'#FFF':'#374151', fontSize:13}}>{striker || 'Striker'} {dismissedPlayer===striker ? '✓' : ''}</Text></TouchableOpacity>
                <TouchableOpacity style={{flex:1, padding:12, backgroundColor:dismissedPlayer===nonStriker?'#10B981':'#F3F4F6', borderRadius:10, alignItems:'center'}} onPress={()=>setDismissedPlayer(nonStriker)}><Text style={{fontWeight:'600', color:dismissedPlayer===nonStriker?'#FFF':'#374151', fontSize:13}}>{nonStriker || 'NonStr'} {dismissedPlayer===nonStriker ? '✓' : ''}</Text></TouchableOpacity>
              </View>

              {(wicketType==='caught'||wicketType==='runout'||wicketType==='stumped') && (
                <TouchableOpacity style={{padding:16, backgroundColor:'#F3F4F6', borderRadius:10, marginBottom:20, alignItems:'center', borderWidth:1, borderColor:'#E5E7EB'}} onPress={()=>setShowSelectModal('fielder')}>
                  <Text style={{fontWeight:'600', color:'#374151'}}>{fielder ? `✓ ${fielder}` : '+ Select Fielder'}</Text>
                </TouchableOpacity>
              )}
              
              <Text style={{fontWeight:'600', color:'#6B7280', marginBottom:8}}>Runs Scored (if any)</Text>
              <View style={{flexDirection:'row', gap:10, marginBottom:24}}>
                {[0,1,2,3].map(r=><TouchableOpacity key={r} style={{flex:1, padding:12, backgroundColor:pendingWicketRuns===r?'#10B981':'#F3F4F6', borderRadius:10, alignItems:'center'}} onPress={()=>setPendingWicketRuns(r)}><Text style={{color:pendingWicketRuns===r?'#FFF':'#374151', fontWeight:'700'}}>{r}</Text></TouchableOpacity>)}
              </View>
            </ScrollView>
            <View style={{flexDirection:'row', gap:12, padding:24, borderTopWidth:1, borderTopColor:'#F3F4F6', backgroundColor:'#FFF'}}>
              <TouchableOpacity style={{flex:1, padding:16, backgroundColor:'#F3F4F6', borderRadius:12, alignItems:'center'}} onPress={()=>setShowWicketModal(false)}><Text style={{fontWeight:'700', color:'#6B7280'}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={{flex:1, padding:16, backgroundColor:'#EF4444', borderRadius:12, alignItems:'center'}} onPress={()=>{ recordBall({runs:pendingWicketRuns, isW:true, wType:wicketType, dism:dismissedPlayer, fld:fielder}); setShowWicketModal(false); }}><Text style={{color:'#FFF', fontWeight:'800'}}>OUT!</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Match Controls Modal */}
      <Modal visible={showControlsModal} transparent animationType="fade">
        <TouchableOpacity style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)'}} activeOpacity={1} onPress={()=>setShowControlsModal(false)}>
          <View style={{backgroundColor:'#FFF', position:'absolute', top: 60, right: 20, borderRadius:16, width: 200, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.1, shadowRadius:12, elevation:4}}>
            <TouchableOpacity style={{flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:'#F3F4F6'}} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={20} color="#111827" />
              <Text style={{marginLeft:12, fontSize:15, fontWeight:'600', color:'#111827'}}>Share Match</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{flexDirection:'row', alignItems:'center', padding:16}} onPress={handleSuspend}>
              <Ionicons name="pause-circle-outline" size={20} color="#6B7280" />
              <Text style={{marginLeft:12, fontSize:15, fontWeight:'600', color:'#111827'}}>Suspend Match</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}
