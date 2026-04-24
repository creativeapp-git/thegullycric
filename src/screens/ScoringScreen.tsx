import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert as RNAlert, Modal, Share } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMatchById, updateMatch } from '../services/matchService';
import { Match, BallEvent } from '../types';

export default function ScoringScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { matchId } = route.params;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentInnings, setCurrentInnings] = useState(1);
  const [ballLog, setBallLog] = useState<BallEvent[]>([]);
  
  // Players
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');

  // States
  const [inningsBreak, setInningsBreak] = useState(false);
  const [matchOver, setMatchOver] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState('');

  // Modals
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState('bowled');
  const [dismissedPlayer, setDismissedPlayer] = useState('');
  const [fielder, setFielder] = useState('');
  const [pendingWicketRuns, setPendingWicketRuns] = useState(0);
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [extrasType, setExtrasType] = useState<'bye' | 'legbye'>('bye');
  const [extrasRuns, setExtrasRuns] = useState('1');
  const [showSelectModal, setShowSelectModal] = useState<'striker' | 'nonStriker' | 'bowler' | 'fielder' | null>(null);
  const [showControlsModal, setShowControlsModal] = useState(false);

  useEffect(() => { loadMatch(); }, []);
  const loadMatch = async () => {
    const data = await getMatchById(matchId);
    if (data) {
      setMatch(data);
      setBallLog(data.ballLog || []);
      setCurrentInnings(data.currentInnings || 1);
      if (data.status === 'Completed') {
        setMatchOver(true);
      }
    }
    setLoading(false);
  };
  const showAlert = (title: string, msg: string) => Platform.OS === 'web' ? window.alert(`${title}:\n${msg}`) : RNAlert.alert(title, msg);

  // Computed Values
  const inningsBalls = ballLog.filter(b => b.innings === currentInnings && !b.id?.startsWith('edited_'));
  const legalBalls = inningsBalls.filter(b => !b.isWide && !b.isNoBall);
  const totalRuns = inningsBalls.reduce((s, b) => s + b.runs + b.extras, 0);
  const totalWickets = inningsBalls.filter(b => b.isWicket).length;
  const completedOvers = Math.floor(legalBalls.length / 6);
  const remainingBalls = legalBalls.length % 6;
  const maxOvers = match?.overs || 20;

  const battingFirst = match?.tossDecision === 'Bat' ? match.tossWinner : (match?.tossWinner === match?.team1 ? match?.team2 : match?.team1);
  const battingSecond = battingFirst === match?.team1 ? match?.team2 : match?.team1;
  const currentBatting = currentInnings === 1 ? battingFirst : battingSecond;
  const currentBowling = currentBatting === match?.team1 ? match?.team2 : match?.team1;
  const batPlayers = currentBatting === match?.team1 ? match?.team1Players : match?.team2Players;
  const bowlPlayers = currentBowling === match?.team1 ? match?.team1Players : match?.team2Players;

  const inn1Runs = ballLog.filter(b => b.innings === 1 && !b.id?.startsWith('edited_')).reduce((s, b) => s + b.runs + b.extras, 0);

  // Over History
  const overHistory = Array.from({length: completedOvers + (remainingBalls > 0 ? 1 : 0)}).map((_, i) => {
    let legal = 0, runs = 0, start = 0;
    for(let j=0; j<inningsBalls.length; j++){
      if(!inningsBalls[j].isWide && !inningsBalls[j].isNoBall) legal++;
      if(legal > i*6) { start=j; break; }
      if(j === inningsBalls.length-1) start=j+1;
    }
    let end = start; legal = 0;
    for(let j=start; j<inningsBalls.length; j++){
      if(!inningsBalls[j].isWide && !inningsBalls[j].isNoBall) legal++;
      end=j;
      if(legal===6) break;
    }
    const balls = inningsBalls.slice(start, end+1);
    runs = balls.reduce((s,b)=>s+b.runs+b.extras,0);
    return { over: i+1, runs, balls };
  });

  const recordBall = async (p: { runs: number, isWd?: boolean, isNb?: boolean, isBye?: boolean, isLb?: boolean, isW?: boolean, wType?: string, fld?: string, dism?: string }) => {
    if (inningsBreak || matchOver) return;
    if (!striker || !nonStriker || !bowler) return showAlert('Missing Players', 'Select striker, non-striker and bowler.');
    if (striker === nonStriker) return showAlert('Error', 'Striker and non-striker cannot be same.');
    
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
    await updateMatch(matchId, { ballLog: newLog });

    // Rotate Strike
    if (!p.isW || p.wType==='runout') {
      const runsToCount = (p.isBye || p.isLb) ? p.runs : (p.isWd ? p.runs : p.runs);
      if (runsToCount % 2 !== 0) { const t = striker; setStriker(nonStriker); setNonStriker(t); }
    }
    if (p.isW && p.dism === striker) setStriker('');
    if (p.isW && p.dism === nonStriker) setNonStriker('');
    
    // Over complete
    const nl = newLog.filter(b=>b.innings===currentInnings && !b.id?.startsWith('edited_') && !b.isWide && !b.isNoBall).length;
    if (nl > 0 && nl % 6 === 0) {
      const t = striker; setStriker(nonStriker); setNonStriker(t); // swap end of over
      setBowler(''); // must change bowler
      if(Math.floor(nl/6) >= maxOvers) {
        checkInningsEnd(newLog);
        return;
      }
    }
    checkInningsEnd(newLog);
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
    setStriker(''); setNonStriker(''); setBowler('');
    await updateMatch(matchId, { currentInnings: 2 });
  };

  const undo = async () => {
    if (ballLog.length === 0 || inningsBreak || matchOver) return;
    const last = ballLog[ballLog.length-1];
    if(last.id?.startsWith('edited_')) return;
    const nl = [...ballLog];
    nl[nl.length-1] = { ...last, id: 'edited_' + last.id }; // mark as edited
    setBallLog(nl); await updateMatch(matchId, { ballLog: nl });
  };

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

  if (loading || !match) return <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator size="large" color="#10B981" /></View>;

  return (
    <View style={{flex:1, backgroundColor:'#F9FAFB', ...(Platform.OS==='web'?{height:'100vh', maxHeight:'100vh'}:{})}}>
      <ScrollView style={{flex:1}} contentContainerStyle={{padding: 20}}>
        
        {/* Header */}
        <View style={{flexDirection:'row', alignItems:'center', marginBottom:16}}>
          <TouchableOpacity onPress={()=>navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#1F2937"/></TouchableOpacity>
          <View style={{flex:1, marginLeft:16}}><Text style={{fontSize:20, fontWeight:'bold', color:'#111827'}}>Live Scoring</Text></View>
          <TouchableOpacity onPress={undo} style={{paddingHorizontal:12, paddingVertical:8, backgroundColor:'#FEE2E2', borderRadius:8, marginRight:8}}><Text style={{color:'#EF4444', fontWeight:'600'}}>Undo</Text></TouchableOpacity>
          <TouchableOpacity onPress={()=>setShowControlsModal(true)} style={{padding:8}}><Ionicons name="ellipsis-vertical" size={24} color="#1F2937"/></TouchableOpacity>
        </View>

        {/* Scoreboard */}
        <View style={{backgroundColor:'#1F2937', padding:20, borderRadius:16, alignItems:'center', marginBottom:16, shadowColor:'#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.2, shadowRadius:8, elevation:4}}>
          <Text style={{color:'#9CA3AF', fontSize:14, fontWeight:'600', textTransform:'uppercase', letterSpacing:1}}>{currentBatting}</Text>
          <Text style={{fontSize:48, color:'#FFF', fontWeight:'800', marginVertical:4}}>{totalRuns}<Text style={{fontSize:24, color:'#9CA3AF'}}>/{totalWickets}</Text></Text>
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
        {overHistory.reverse().map(o => (
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
          <View style={{backgroundColor:'#FFF', padding:24, borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'70%'}}>
            <Text style={{fontSize:20, fontWeight:'800', marginBottom:16, color:'#111827'}}>Select {showSelectModal}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {((showSelectModal==='bowler'||showSelectModal==='fielder')?bowlPlayers:batPlayers)?.map((p:any, i:number)=>(
                <TouchableOpacity key={i} style={{paddingVertical:16, borderBottomWidth:1, borderBottomColor:'#F3F4F6'}} onPress={()=>{
                  if(showSelectModal==='striker') setStriker(p);
                  if(showSelectModal==='nonStriker') setNonStriker(p);
                  if(showSelectModal==='bowler') setBowler(p);
                  if(showSelectModal==='fielder') setFielder(p);
                  setShowSelectModal(null);
                }}>
                  <Text style={{fontSize:16, color:'#374151', fontWeight:'500'}}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={{marginTop:16, padding:16, backgroundColor:'#F3F4F6', borderRadius:12, alignItems:'center'}} onPress={()=>setShowSelectModal(null)}><Text style={{fontWeight:'700', color:'#6B7280'}}>Cancel</Text></TouchableOpacity>
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
      <Modal visible={showWicketModal} transparent animationType="slide">
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end'}}>
          <View style={{backgroundColor:'#FFF', padding:24, borderTopLeftRadius:24, borderTopRightRadius:24}}>
            <Text style={{fontSize:20, fontWeight:'800', marginBottom:20, color:'#111827'}}>Wicket Details</Text>
            <Text style={{fontWeight:'600', color:'#6B7280', marginBottom:8}}>Dismissal Type</Text>
            <View style={{flexDirection:'row', gap:8, flexWrap:'wrap', marginBottom:20}}>
              {['bowled','caught','lbw','runout','stumped','retired'].map(t=><TouchableOpacity key={t} style={{paddingHorizontal:16, paddingVertical:10, backgroundColor:wicketType===t?'#EF4444':'#F3F4F6', borderRadius:10}} onPress={()=>setWicketType(t)}><Text style={{color:wicketType===t?'#FFF':'#374151', fontWeight:'600', textTransform:'capitalize'}}>{t}</Text></TouchableOpacity>)}
            </View>
            
            <Text style={{fontWeight:'600', color:'#6B7280', marginBottom:8}}>Dismissed Player</Text>
            <View style={{flexDirection:'row', gap:10, marginBottom:20}}>
              <TouchableOpacity style={{flex:1, padding:12, backgroundColor:dismissedPlayer===striker?'#10B981':'#F3F4F6', borderRadius:10, alignItems:'center'}} onPress={()=>setDismissedPlayer(striker)}><Text style={{fontWeight:'600', color:dismissedPlayer===striker?'#FFF':'#374151'}}>{striker} (Str)</Text></TouchableOpacity>
              <TouchableOpacity style={{flex:1, padding:12, backgroundColor:dismissedPlayer===nonStriker?'#10B981':'#F3F4F6', borderRadius:10, alignItems:'center'}} onPress={()=>setDismissedPlayer(nonStriker)}><Text style={{fontWeight:'600', color:dismissedPlayer===nonStriker?'#FFF':'#374151'}}>{nonStriker} (NonStr)</Text></TouchableOpacity>
            </View>

            {(wicketType==='caught'||wicketType==='runout'||wicketType==='stumped') && (
              <TouchableOpacity style={{padding:16, backgroundColor:'#F3F4F6', borderRadius:10, marginBottom:20, alignItems:'center', borderWidth:1, borderColor:'#E5E7EB'}} onPress={()=>setShowSelectModal('fielder')}>
                <Text style={{fontWeight:'600', color:'#374151'}}>{fielder ? `Fielder: ${fielder}` : 'Select Fielder'}</Text>
              </TouchableOpacity>
            )}
            
            <Text style={{fontWeight:'600', color:'#6B7280', marginBottom:8}}>Runs Scored (if any)</Text>
            <View style={{flexDirection:'row', gap:10, marginBottom:24}}>
              {[0,1,2,3].map(r=><TouchableOpacity key={r} style={{flex:1, padding:12, backgroundColor:pendingWicketRuns===r?'#10B981':'#F3F4F6', borderRadius:10, alignItems:'center'}} onPress={()=>setPendingWicketRuns(r)}><Text style={{color:pendingWicketRuns===r?'#FFF':'#374151', fontWeight:'700'}}>{r}</Text></TouchableOpacity>)}
            </View>

            <View style={{flexDirection:'row', gap:12}}>
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
            <TouchableOpacity style={{flexDirection:'row', alignItems:'center', padding:16, borderBottomWidth:1, borderBottomColor:'#F3F4F6'}} onPress={handleDrinksBreak}>
              <Ionicons name="cafe-outline" size={20} color="#F59E0B" />
              <Text style={{marginLeft:12, fontSize:15, fontWeight:'600', color:'#111827'}}>Drinks Break</Text>
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
