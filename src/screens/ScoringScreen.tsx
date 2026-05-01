import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, SHADOWS, BORDER_RADIUS } from '../theme';
import { Button, Card } from '../components/UI';

type MatchState = 'setup' | 'player_selection' | 'live' | 'over_break' | 'wicket_fall' | 'innings_break' | 'complete';

export default function ScoringScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { matchId } = route.params;

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [overHistory, setOverHistory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Selection State
  const [showModal, setShowModal] = useState(false);
  const [selectionType, setSelectionType] = useState<'initial' | 'bowler' | 'batter'>('initial');
  const [selectedStriker, setSelectedStriker] = useState<string | null>(null);
  const [selectedNonStriker, setSelectedNonStriker] = useState<string | null>(null);
  const [selectedBowler, setSelectedBowler] = useState<string | null>(null);

  const fetchMatch = async () => {
    try {
      const { data, error } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (error) throw error;
      setMatch(data);

      // Handle missing players / start of match
      if (data.match_state === 'setup' || !data.striker || !data.currentBowler) {
        if (data.match_state !== 'live') {
           setSelectionType('initial');
           setShowModal(true);
        }
      }

      const { data: balls } = await supabase
        .from('balls')
        .select('*')
        .eq('match_id', matchId)
        .eq('innings', data.currentInnings)
        .order('created_at', { ascending: false })
        .limit(6);
      setOverHistory(balls || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMatch();
    const channel = supabase.channel(`scoring_prod:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, fetchMatch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  // Derived Player Lists
  const battingTeamPlayers = useMemo(() => {
    if (!match) return [];
    return match.currentInnings === 1 ? match.team1Players || [] : match.team2Players || [];
  }, [match]);

  const bowlingTeamPlayers = useMemo(() => {
    if (!match) return [];
    return match.currentInnings === 1 ? match.team2Players || [] : match.team1Players || [];
  }, [match]);

  const availableBatters = useMemo(() => {
    const out = match?.out_players || [];
    return battingTeamPlayers.filter((p: string) => !out.includes(p));
  }, [battingTeamPlayers, match?.out_players]);

  const availableBowlers = useMemo(() => {
    return bowlingTeamPlayers.filter((p: string) => p !== match?.lastBowler);
  }, [bowlingTeamPlayers, match?.lastBowler]);

  const handleConfirmSelection = async () => {
    if (isSubmitting) return;
    
    // Validation
    if (selectionType === 'initial') {
      if (!selectedStriker || !selectedNonStriker || !selectedBowler) {
        Alert.alert('Selection Required', 'Please select all players to start.');
        return;
      }
      if (selectedStriker === selectedNonStriker) {
        Alert.alert('Invalid Selection', 'Striker and Non-Striker must be different.');
        return;
      }
    } else if (selectionType === 'bowler' && !selectedBowler) {
      Alert.alert('Selection Required', 'Select a bowler.');
      return;
    } else if (selectionType === 'batter' && !selectedStriker) {
      Alert.alert('Selection Required', 'Select a new batter.');
      return;
    }

    setIsSubmitting(true);
    console.log('Production Selection Confirmed:', { selectedStriker, selectedNonStriker, selectedBowler });

    try {
      const updates: any = { match_state: 'live' };
      if (selectedStriker) updates.striker = selectedStriker;
      if (selectedNonStriker) updates.nonStriker = selectedNonStriker;
      if (selectedBowler) updates.currentBowler = selectedBowler;

      const { error } = await supabase.from('matches').update(updates).eq('id', matchId);
      if (error) throw error;
      
      setShowModal(false);
      setSelectedStriker(null);
      setSelectedNonStriker(null);
      setSelectedBowler(null);
    } catch (e) {
      console.error('Selection Commit Failed:', e);
      Alert.alert('Error', 'Failed to update match state. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBall = async (p: { r: number, e: number, type?: string, isW?: boolean, wType?: string }) => {
    if (!match.striker || !match.currentBowler || !match.nonStriker) {
      setSelectionType('initial');
      setShowModal(true);
      return;
    }

    setIsSubmitting(true);
    console.log('Recording Ball Event:', p);

    try {
      // 1. Record Ball in Database
      const { error: rpcError } = await supabase.rpc('add_ball', {
        p_match_id: matchId,
        p_innings: match.currentInnings,
        p_over: Math.floor(overHistory.length / 6),
        p_ball_num: (overHistory.length % 6) + 1,
        p_runs: p.r,
        p_extras: p.e,
        p_extra_type: p.type,
        p_is_wicket: !!p.isW,
        p_wicket_type: p.wType,
        p_batter: match.striker,
        p_bowler: match.currentBowler,
        p_dismissed_player: p.isW ? match.striker : null
      });

      if (rpcError) throw rpcError;

      // 2. Compute Next State
      let nextStriker = match.striker;
      let nextNonStriker = match.nonStriker;
      let nextBowler = match.currentBowler;
      let lastBowler = match.lastBowler;
      let nextState = 'live';
      let outPlayers = [...(match.out_players || [])];

      // A. Wicket Logic
      if (p.isW) {
        outPlayers.push(match.striker);
        nextState = 'wicket_fall';
        nextStriker = null; 
      } 
      // B. Run Logic (Strike Swap)
      else if ((p.r + p.e) % 2 !== 0) {
        [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
      }

      // C. Over End Logic
      const legalBalls = overHistory.filter(b => !b.extra_type || b.extra_type === 'bye' || b.extra_type === 'legbye').length;
      const isOverEnd = (legalBalls === 5 && !p.type); // If this was 6th legal ball

      if (isOverEnd) {
        [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker]; // End of over swap
        lastBowler = nextBowler;
        nextBowler = null;
        nextState = nextState === 'wicket_fall' ? 'wicket_fall' : 'over_break';
      }

      // 3. Update Match
      const { error: updateError } = await supabase.from('matches').update({
        striker: nextStriker,
        nonStriker: nextNonStriker,
        currentBowler: nextBowler,
        lastBowler: lastBowler,
        match_state: nextState,
        out_players: outPlayers
      }).eq('id', matchId);

      if (updateError) throw updateError;

      // Trigger UI Modals
      if (nextState === 'wicket_fall') {
        setSelectionType('batter');
        setShowModal(true);
      } else if (nextState === 'over_break') {
        setSelectionType('bowler');
        setShowModal(true);
      }

    } catch (e) {
      console.error('Ball Record Failed:', e);
      Alert.alert('Error', 'Transaction failed. Data rolled back.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSelector = (title: string, list: string[], current: string | null, onSelect: (p: string) => void) => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorTitle}>{title}</Text>
      <View style={styles.chipContainer}>
        {list.map((p) => (
          <TouchableOpacity 
            key={p} 
            style={[styles.chip, current === p && styles.chipActive]} 
            onPress={() => onSelect(p)}
          >
            <Text style={[styles.chipText, current === p && styles.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderModalContent = () => {
    return (
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeading}>
              {selectionType === 'initial' ? 'Start Match' : selectionType === 'bowler' ? 'New Over' : 'Next Batter'}
            </Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectionType === 'initial' && (
                <>
                  {renderSelector('Striker', availableBatters, selectedStriker, setSelectedStriker)}
                  {renderSelector('Non-Striker', availableBatters.filter(p => p !== selectedStriker), selectedNonStriker, setSelectedNonStriker)}
                  {renderSelector('Bowler', availableBowlers, selectedBowler, setSelectedBowler)}
                </>
              )}
              {selectionType === 'bowler' && renderSelector('Select Bowler', availableBowlers, selectedBowler, setSelectedBowler)}
              {selectionType === 'batter' && renderSelector('Next Batter', availableBatters.filter(p => p !== selectedNonStriker), selectedStriker, setSelectedStriker)}
            </ScrollView>

            <Button 
              title={isSubmitting ? "Processing..." : "Confirm & Continue"} 
              onPress={handleConfirmSelection}
              loading={isSubmitting}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      {renderModalContent()}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{match.team1} vs {match.team2}</Text>
        <View style={styles.stateBadge}>
           <Text style={styles.stateText}>{match.match_state.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.mainCard}>
          <Text style={styles.scoreText}>{match.currentInnings === 1 ? match.score1 : match.score2}</Text>
          <View style={styles.playersRow}>
            <View style={styles.playerBox}>
              <Text style={styles.pLabel}>BATTER</Text>
              <Text style={styles.pName}>🏏 {match.striker || '?'}</Text>
            </View>
            <View style={styles.playerBox}>
              <Text style={styles.pLabel}>NON-STRIKER</Text>
              <Text style={styles.pName}>🏃 {match.nonStriker || '?'}</Text>
            </View>
            <View style={styles.playerBox}>
              <Text style={styles.pLabel}>BOWLER</Text>
              <Text style={styles.pName}>⚾ {match.currentBowler || '?'}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.ballRow}>
           {overHistory.slice(0, 6).reverse().map((b, i) => (
             <View key={i} style={[styles.ball, b.is_wicket && styles.wicketBall]}>
               <Text style={[styles.ballText, b.is_wicket && styles.wicketText]}>{b.is_wicket ? 'W' : b.runs + b.extras}</Text>
             </View>
           ))}
        </View>

        <View style={styles.controls}>
          <View style={styles.row}>
            {[0, 1, 2, 3].map(r => (
              <TouchableOpacity key={r} style={styles.controlBtn} onPress={() => handleAddBall({ r, e: 0 })}>
                <Text style={styles.controlText}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            {[4, 6].map(r => (
              <TouchableOpacity key={r} style={[styles.controlBtn, styles.boundaryBtn]} onPress={() => handleAddBall({ r, e: 0 })}>
                <Text style={[styles.controlText, styles.boundaryText]}>{r}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.controlBtn, styles.extraBtn]} onPress={() => handleAddBall({ r: 0, e: 1, type: 'wide' })}>
              <Text style={styles.controlText}>WD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.controlBtn, styles.extraBtn]} onPress={() => handleAddBall({ r: 0, e: 1, type: 'noball' })}>
              <Text style={styles.controlText}>NB</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.controlBtn, styles.wicketBtn]} onPress={() => handleAddBall({ r: 0, e: 0, isW: true, wType: 'bowled' })}>
              <Text style={[styles.controlText, {color: COLORS.white}]}>WKT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={() => {
               const temp = match.striker;
               supabase.from('matches').update({ striker: match.nonStriker, nonStriker: temp }).eq('id', matchId);
            }}>
              <Ionicons name="swap-horizontal" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  stateBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  stateText: { fontSize: 10, fontWeight: '900', color: COLORS.primary },
  scroll: { padding: 16 },
  mainCard: { backgroundColor: COLORS.primary, padding: 32, borderRadius: BORDER_RADIUS.xl, ...SHADOWS.medium, marginBottom: 24 },
  scoreText: { color: COLORS.white, fontSize: 48, fontWeight: '900', textAlign: 'center' },
  playersRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, gap: 12 },
  playerBox: { flex: 1, alignItems: 'center' },
  pLabel: { color: COLORS.white, opacity: 0.6, fontSize: 10, fontWeight: '800', marginBottom: 4 },
  pName: { color: COLORS.white, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  ballRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 32 },
  ball: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  wicketBall: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  ballText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  wicketText: { color: COLORS.white },
  controls: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  controlBtn: { flex: 1, height: 64, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft, borderWidth: 1, borderColor: COLORS.border },
  controlText: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  boundaryBtn: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  boundaryText: { color: COLORS.primary },
  extraBtn: { backgroundColor: COLORS.card },
  wicketBtn: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeading: { fontSize: 22, fontWeight: '900', color: COLORS.text, marginBottom: 24, textAlign: 'center' },
  selectorSection: { marginBottom: 24 },
  selectorTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  chipTextActive: { color: COLORS.white },
});
