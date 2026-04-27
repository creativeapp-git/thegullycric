import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, Switch, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth } from '../services/firebase';
import { createMatch, getUserMatches, getMatchById, updateMatch } from '../services/matchService';
import { Match } from '../types';
import { AppNavigationProp } from '../navigation/navigation.types';

const STOCK_LOGOS = [
  '🏏', '⚾', '🎯', '🏆', '🦁', '🐯', '🦅', '🐘', '🔥', '⚡', '🌟', '💎', '🎪', '🛡️', '👑', '🎭'
];

const CreateMatchScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<any>();
  const existingMatchId = route.params?.matchId;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Phase 1: Match Info
  const [matchName, setMatchName] = useState('');
  const [location, setLocation] = useState('');
  const [matchType, setMatchType] = useState<'Test' | 'ODI' | 'T20' | 'Gully'>('Gully');
  const [overs, setOvers] = useState('20');
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [team1Logo, setTeam1Logo] = useState(STOCK_LOGOS[0]);
  const [team2Logo, setTeam2Logo] = useState(STOCK_LOGOS[5]);
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');

  // Phase 2: Squads
  const [team1Players, setTeam1Players] = useState<string[]>([]);
  const [team2Players, setTeam2Players] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [addingToTeam, setAddingToTeam] = useState<1 | 2>(1);
  const [recentPlayers, setRecentPlayers] = useState<string[]>([]);

  // Phase 3: Rules
  const [wideExtraRun, setWideExtraRun] = useState(true);
  const [noBallExtraRun, setNoBallExtraRun] = useState(true);
  const [ballByBall, setBallByBall] = useState(true);

  // Phase 4: Review & Toss
  const [tossType, setTossType] = useState<'manual' | 'virtual'>('manual');
  const [tossWinner, setTossWinner] = useState<string>('');
  const [tossDecision, setTossDecision] = useState<'Bat' | 'Bowl'>('Bat');
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    fetchRecentPlayers();
    if (existingMatchId) {
      loadExistingMatch(existingMatchId);
    } else {
      setMatchDate(new Date().toLocaleDateString());
      setMatchTime(new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
    }
  }, [existingMatchId]);

  const loadExistingMatch = async (id: string) => {
    setLoading(true);
    try {
      const data = await getMatchById(id);
      if (data) {
        setIsEditing(true);
        setMatchName(data.name || '');
        setLocation(data.location || '');
        setMatchType(data.type || 'Gully');
        setOvers(String(data.overs || 20));
        setTeam1(data.team1 || '');
        setTeam2(data.team2 || '');
        setTeam1Logo(data.team1Logo || STOCK_LOGOS[0]);
        setTeam2Logo(data.team2Logo || STOCK_LOGOS[5]);
        setMatchDate(data.date || new Date().toLocaleDateString());
        setMatchTime(data.time || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
        setTeam1Players(data.team1Players || []);
        setTeam2Players(data.team2Players || []);
        setWideExtraRun(data.rules?.wideExtraRun ?? true);
        setNoBallExtraRun(data.rules?.noBallExtraRun ?? true);
        setBallByBall(data.rules?.ballByBall ?? true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPlayers = async () => {
    if (!auth.currentUser) return;
    try {
      const matches = await getUserMatches(auth.currentUser.uid);
      const players = new Set<string>();
      matches.forEach(m => {
        m.team1Players?.forEach(p => players.add(p));
        m.team2Players?.forEach(p => players.add(p));
      });
      setRecentPlayers(Array.from(players).slice(0, 15)); // top 15
    } catch (e) {
      console.log('Failed to fetch past players', e);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}:\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const generateMatchId = () => String(Math.floor(100000 + Math.random() * 900000));

  const handleNext = () => {
    if (step === 1) {
      if (!matchName.trim() || !location.trim() || !team1.trim() || !team2.trim()) {
        showAlert('Error', 'Please fill all required fields.');
        return;
      }
    }
    if (step === 2) {
      if (team1Players.length === 0 || team2Players.length === 0) {
        showAlert('Error', 'Please add at least 1 player to each team.');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const addPlayer = (name: string = newPlayerName) => {
    if (!name.trim()) return;
    if (addingToTeam === 1 && !team1Players.includes(name.trim())) {
      setTeam1Players([...team1Players, name.trim()]);
    } else if (addingToTeam === 2 && !team2Players.includes(name.trim())) {
      setTeam2Players([...team2Players, name.trim()]);
    }
    setNewPlayerName('');
  };

  const removePlayer = (team: 1 | 2, index: number) => {
    if (team === 1) setTeam1Players(team1Players.filter((_, i) => i !== index));
    else setTeam2Players(team2Players.filter((_, i) => i !== index));
  };

  const coinAnim = React.useRef(new Animated.Value(0)).current;

  const handleVirtualToss = () => {
    setIsFlipping(true);
    setTossWinner('');
    
    coinAnim.setValue(0);
    Animated.timing(coinAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      const winner = Math.random() > 0.5 ? (team1 || 'Team 1') : (team2 || 'Team 2');
      setTossWinner(winner);
      setIsFlipping(false);
    }, 1500);
  };

  const saveMatch = async (status: 'Scheduled' | 'Live') => {
    if (!auth.currentUser) {
      showAlert('Error', 'You must be logged in');
      return null;
    }
    setLoading(true);
    try {
      if (isEditing && existingMatchId) {
        // Just update existing match
        await updateMatch(existingMatchId, {
          name: matchName, type: matchType, overs: parseInt(overs) || 20, location,
          date: matchDate, time: matchTime, team1, team2, team1Logo, team2Logo,
          team1Players, team2Players, rules: { wideExtraRun, noBallExtraRun, ballByBall },
          ...(status === 'Live' ? { status: 'Live' as const, tossWinner, tossDecision } : {}),
        });
        return { id: existingMatchId };
      } else {
        const matchId = generateMatchId();
        const match: Match = {
          matchId,
          name: matchName,
          type: matchType,
          overs: parseInt(overs) || 20,
          location,
          date: matchDate,
          time: matchTime,
          team1,
          team2,
          team1Logo,
          team2Logo,
          team1Players,
          team2Players,
          tossWinner,
          tossDecision,
          currentInnings: 1,
          status,
          createdBy: auth.currentUser.uid,
          rules: { wideExtraRun, noBallExtraRun, ballByBall },
          ballLog: [],
        };
        const created = await createMatch(match);
        return created;
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save match');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFixture = async () => {
    if (!matchName.trim() || !team1.trim() || !team2.trim()) {
      showAlert('Error', 'Basic info (Match Name, Team 1, Team 2) is required to save as fixture.');
      return;
    }
    const created = await saveMatch('Scheduled');
    if (created) {
      showAlert('Saved', 'Match saved as a fixture. You can start it later from My Space.');
      navigation.goBack();
    }
  };

  const handleStartLive = async () => {
    if (!tossWinner || !tossDecision) {
      showAlert('Error', 'Please complete the toss before starting.');
      return;
    }
    try {
      setLoading(true);
      const created = await saveMatch('Live');
      if (created && created.id) {
        console.log('Match created, navigating to scoring:', created.id);
        navigation.replace('Scoring', { matchId: created.id });
      } else {
        showAlert('Error', 'Failed to initialize live match. Please check your internet and try again.');
      }
    } catch (err) {
      console.error('Error starting live match:', err);
      showAlert('Error', 'An unexpected error occurred while starting the match.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Info', 'Squads', 'Rules', 'Toss'];
  const renderStepIndicator = () => (
    <View style={s.stepRow}>
      {stepLabels.map((label, i) => {
        const num = i + 1;
        const isActive = step >= num;
        const isCurrent = step === num;
        return (
          <React.Fragment key={num}>
            <View style={s.stepItem}>
              <View style={[s.stepCircle, isActive && s.stepCircleActive, isCurrent && s.stepCircleCurrent]}>
                <Text style={[s.stepNum, isActive && s.stepNumActive]}>{num}</Text>
              </View>
              <Text style={[s.stepLabel, isActive && s.stepLabelActive]}>{label}</Text>
            </View>
            {num < 4 && <View style={[s.stepLine, step > num && s.stepLineActive]} />}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderLogoPicker = (teamNum: 1 | 2, currentLogo: string) => {
    const otherLogo = teamNum === 1 ? team2Logo : team1Logo;
    return (
    <View style={s.logoPickerContainer}>
      <Text style={s.logoPickerTitle}>Select Logo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {STOCK_LOGOS.map((emoji) => {
          const isOtherTeam = emoji === otherLogo;
          return (
          <TouchableOpacity
            key={emoji}
            style={[s.stockLogo, { backgroundColor: currentLogo === emoji ? '#10B981' : '#F3F4F6', opacity: isOtherTeam ? 0.3 : 1 }, currentLogo === emoji && s.stockLogoSelected]}
            onPress={() => {
              if (isOtherTeam) {
                showAlert('Same Logo', 'Both teams cannot have the same logo. Pick a different one!');
                return;
              }
              teamNum === 1 ? setTeam1Logo(emoji) : setTeam2Logo(emoji);
            }}
          >
            <Text style={{fontSize: 20}}>{emoji}</Text>
            {isOtherTeam && <View style={{position:'absolute', top:0, left:0, right:0, bottom:0, justifyContent:'center', alignItems:'center'}}><Ionicons name="close" size={24} color="#EF4444" /></View>}
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
    );
  };

  const renderPhase1 = () => (
    <View>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <View>
          <Text style={s.phaseTitle}>Match Info</Text>
          <Text style={s.phaseSubtitle}>Let's set up the basics</Text>
        </View>
        <TouchableOpacity style={s.fixtureBtnSmall} onPress={handleCreateFixture}>
          <Ionicons name="save-outline" size={16} color="#10B981" />
          <Text style={s.fixtureBtnSmallText}>Save Fixture</Text>
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <TextInput style={s.input} placeholder="Match Name *" value={matchName} onChangeText={setMatchName} placeholderTextColor="#9CA3AF" />
        <TextInput style={s.input} placeholder="Location *" value={location} onChangeText={setLocation} placeholderTextColor="#9CA3AF" />
        <View style={{flexDirection: 'row', gap: 10, marginTop: 12}}>
          <TextInput style={[s.input, {flex: 1, marginTop: 0}]} placeholder="Date (e.g. 10/24/2026)" value={matchDate} onChangeText={setMatchDate} placeholderTextColor="#9CA3AF" />
          <TextInput style={[s.input, {flex: 1, marginTop: 0}]} placeholder="Time (e.g. 05:00 PM)" value={matchTime} onChangeText={setMatchTime} placeholderTextColor="#9CA3AF" />
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Team 1</Text>
        <TextInput style={s.input} placeholder="Team 1 Name *" value={team1} onChangeText={setTeam1} placeholderTextColor="#9CA3AF" />
        {renderLogoPicker(1, team1Logo)}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Team 2</Text>
        <TextInput style={s.input} placeholder="Team 2 Name *" value={team2} onChangeText={setTeam2} placeholderTextColor="#9CA3AF" />
        {renderLogoPicker(2, team2Logo)}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Format</Text>
        <View style={s.chipRow}>
          {(['Gully', 'T20', 'ODI', 'Test'] as const).map((t) => (
            <TouchableOpacity key={t} style={[s.chip, matchType === t && s.chipActive]} onPress={() => setMatchType(t)}>
              <Text style={[s.chipText, matchType === t && s.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={[s.input, {marginBottom:0}]} placeholder="Total Overs" value={overs} onChangeText={setOvers} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
      </View>
    </View>
  );

  const currentPlayers = addingToTeam === 1 ? team1Players : team2Players;
  const renderPhase2 = () => (
    <View>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <View>
          <Text style={s.phaseTitle}>Squads</Text>
          <Text style={s.phaseSubtitle}>Add players to each team</Text>
        </View>
        <TouchableOpacity style={s.fixtureBtnSmall} onPress={handleCreateFixture}>
          <Ionicons name="save-outline" size={16} color="#10B981" />
          <Text style={s.fixtureBtnSmallText}>Save Fixture</Text>
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <View style={s.teamTabs}>
          <TouchableOpacity style={[s.teamTab, addingToTeam === 1 && s.teamTabActive]} onPress={() => setAddingToTeam(1)}>
            <Text style={[s.teamTabText, addingToTeam === 1 && s.teamTabTextActive]}>{team1 || 'Team 1'} ({team1Players.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.teamTab, addingToTeam === 2 && s.teamTabActive]} onPress={() => setAddingToTeam(2)}>
            <Text style={[s.teamTabText, addingToTeam === 2 && s.teamTabTextActive]}>{team2 || 'Team 2'} ({team2Players.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={s.addRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Player Name"
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={() => addPlayer()}
            returnKeyType="done"
          />
          <TouchableOpacity style={s.addBtn} onPress={() => addPlayer()}>
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {recentPlayers.length > 0 && (
          <View style={{marginTop: 16}}>
            <Text style={{fontSize: 12, color: '#6B7280', marginBottom: 8}}>Recent Players (Tap to add)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
              {recentPlayers.map(rp => (
                <TouchableOpacity key={rp} style={s.recentChip} onPress={() => addPlayer(rp)}>
                  <Text style={s.recentChipText}>{rp}</Text>
                  <Ionicons name="add" size={12} color="#4B5563" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{marginTop: 20}}>
          {currentPlayers.length === 0 ? (
            <Text style={s.emptyText}>No players added yet.</Text>
          ) : (
            currentPlayers.map((player, index) => (
              <View key={index} style={s.playerItem}>
                <Text style={s.playerNum}>{index + 1}</Text>
                <Text style={s.playerName}>{player}</Text>
                <TouchableOpacity onPress={() => removePlayer(addingToTeam, index)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  );

  const renderPhase3 = () => (
    <View>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <View>
          <Text style={s.phaseTitle}>Rules</Text>
          <Text style={s.phaseSubtitle}>Configure gully rules</Text>
        </View>
        <TouchableOpacity style={s.fixtureBtnSmall} onPress={handleCreateFixture}>
          <Ionicons name="save-outline" size={16} color="#10B981" />
          <Text style={s.fixtureBtnSmallText}>Save Fixture</Text>
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchLabel}>Wide Ball Extra Run</Text>
            <Text style={s.switchSub}>Does a wide ball add 1 run?</Text>
          </View>
          <Switch value={wideExtraRun} onValueChange={setWideExtraRun} trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }} thumbColor={wideExtraRun ? '#10B981' : '#FFF'} />
        </View>

        <View style={s.divider} />

        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchLabel}>No Ball Extra Run</Text>
            <Text style={s.switchSub}>Does a no ball add 1 run?</Text>
          </View>
          <Switch value={noBallExtraRun} onValueChange={setNoBallExtraRun} trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }} thumbColor={noBallExtraRun ? '#10B981' : '#FFF'} />
        </View>

        <View style={s.divider} />

        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchLabel}>Ball by Ball Tracking</Text>
            <Text style={s.switchSub}>Enable detailed scoring interface</Text>
          </View>
          <Switch value={ballByBall} onValueChange={setBallByBall} trackColor={{ false: '#E5E7EB', true: '#D1FAE5' }} thumbColor={ballByBall ? '#10B981' : '#FFF'} />
        </View>
      </View>
    </View>
  );

  const renderPhase4 = () => (
    <View>
      <Text style={s.phaseTitle}>The Toss</Text>
      <Text style={s.phaseSubtitle}>Who plays first?</Text>

      <View style={s.card}>
        <View style={s.chipRow}>
          <TouchableOpacity style={[s.chip, tossType === 'manual' && s.chipActive]} onPress={() => setTossType('manual')}>
            <Text style={[s.chipText, tossType === 'manual' && s.chipTextActive]}>Manual Toss</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.chip, tossType === 'virtual' && s.chipActive]} onPress={() => setTossType('virtual')}>
            <Text style={[s.chipText, tossType === 'virtual' && s.chipTextActive]}>Virtual Coin</Text>
          </TouchableOpacity>
        </View>

        {tossType === 'virtual' ? (
          <View style={s.virtualContainer}>
            {isFlipping ? (
              <Animated.View style={[
                s.coinFlipping,
                {
                  transform: [
                    { rotateY: coinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1800deg'] }) },
                    { scale: coinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.5, 1] }) }
                  ]
                }
              ]}>
                <MaterialCommunityIcons name={"coin" as any} size={60} color="#F59E0B" />
              </Animated.View>
            ) : tossWinner ? (
              <View style={s.tossResultBox}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                <Text style={s.tossWinnerText}>{tossWinner} won the toss!</Text>
                <TouchableOpacity onPress={() => setTossWinner('')} style={{ marginTop: 12 }}>
                  <Text style={{ color: '#6B7280', fontWeight: '600' }}>Flip Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={s.coinButton} onPress={handleVirtualToss}>
                <MaterialCommunityIcons name={"coin" as any} size={48} color="#F59E0B" />
                <Text style={s.coinText}>Tap to Flip Coin</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 16 }}>
            <Text style={s.cardTitle}>Who won the toss?</Text>
            <View style={s.chipRow}>
              {[team1 || 'Team 1', team2 || 'Team 2'].map(t => (
                <TouchableOpacity key={t} style={[s.tossBtn, tossWinner === t && s.tossBtnActive]} onPress={() => setTossWinner(t)}>
                  <Text style={[s.tossBtnText, tossWinner === t && s.tossBtnTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {tossWinner ? (
          <View style={{ marginTop: 24 }}>
            <Text style={s.cardTitle}>Decision</Text>
            <View style={s.chipRow}>
              {(['Bat', 'Bowl'] as const).map(d => (
                <TouchableOpacity key={d} style={[s.tossBtn, tossDecision === d && s.tossBtnActive]} onPress={() => setTossDecision(d)}>
                  <Text style={[s.tossBtnText, tossDecision === d && s.tossBtnTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return renderPhase1();
      case 2: return renderPhase2();
      case 3: return renderPhase3();
      case 4: return renderPhase4();
      default: return renderPhase1();
    }
  };

  return (
    <View style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
            <View style={s.header}>
              <TouchableOpacity style={s.backBtn} onPress={handleBack}>
                <Ionicons name="arrow-back" size={22} color="#1F2937" />
              </TouchableOpacity>
              <Text style={s.headerTitle}>New Match</Text>
              <View style={{ width: 40 }} />
            </View>

            {renderStepIndicator()}
            {renderStep()}
          </ScrollView>

          <View style={s.bottomBar}>
            {step < 4 ? (
              <TouchableOpacity style={s.nextBtn} onPress={handleNext} activeOpacity={0.8}>
                <Text style={s.btnText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.startBtn, (!tossWinner || loading) && s.btnDisabled]}
                onPress={handleStartLive}
                disabled={!tossWinner || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={s.btnText}>Start Live Match</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24, paddingHorizontal: 8 },
  stepItem: { alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#D1FAE5' },
  stepCircleCurrent: { backgroundColor: '#10B981' },
  stepNum: { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  stepNumActive: { color: '#065F46' },
  stepLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4, fontWeight: '500' },
  stepLabelActive: { color: '#065F46', fontWeight: '700' },
  stepLine: { width: 24, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 4, marginBottom: 16 },
  stepLineActive: { backgroundColor: '#10B981' },
  phaseTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  phaseSubtitle: { fontSize: 15, color: '#6B7280', marginTop: 4, marginBottom: 24 },
  fixtureBtnSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginBottom: 16 },
  fixtureBtnSmallText: { color: '#10B981', fontSize: 13, fontWeight: '700', marginLeft: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, fontSize: 16, color: '#111827', marginBottom: 16 },
  logoPickerContainer: { marginBottom: 16 },
  logoPickerTitle: { fontSize: 13, color: '#6B7280', marginBottom: 8, fontWeight: '500' },
  stockLogo: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', opacity: 0.4 },
  stockLogoSelected: { opacity: 1, borderWidth: 3, borderColor: '#111827' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#10B981' },
  recentChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  recentChipText: { fontSize: 13, color: '#4B5563', marginRight: 4 },
  teamTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 20 },
  teamTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  teamTabActive: { borderBottomColor: '#10B981' },
  teamTabText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
  teamTabTextActive: { color: '#111827', fontWeight: '700' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 20, fontStyle: 'italic' },
  playerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  playerNum: { width: 24, fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  playerName: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '500' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  switchLabel: { fontSize: 16, fontWeight: '600', color: '#111827' },
  switchSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  tossBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  tossBtnActive: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  tossBtnText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  tossBtnTextActive: { color: '#10B981' },
  virtualContainer: { alignItems: 'center', paddingVertical: 24 },
  coinButton: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  coinFlipping: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  coinText: { color: '#D97706', fontWeight: '700', marginTop: 12 },
  tossResultBox: { alignItems: 'center' },
  tossWinnerText: { fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 12 },
  bottomBar: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  nextBtn: { backgroundColor: '#111827', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  startBtn: { backgroundColor: '#10B981', height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default CreateMatchScreen;