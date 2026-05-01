import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, SHADOWS, BORDER_RADIUS } from '../theme';
import { Button, Card } from '../components/UI';
import { Input } from '../components/Input';

export default function ScoringScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { matchId } = route.params;

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [overHistory, setOverHistory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Rule Engine Local State
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [modalType, setModalType] = useState<'start' | 'wicket' | 'bowler'>('start');
  const [tempStriker, setTempStriker] = useState('');
  const [tempNonStriker, setTempNonStriker] = useState('');
  const [tempBowler, setTempBowler] = useState('');

  const fetchMatch = async () => {
    try {
      const { data, error } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (error) throw error;
      setMatch(data);

      // Trigger selection modal if players missing
      if (!data.striker || !data.currentBowler) {
        setModalType('start');
        setShowPlayerModal(true);
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
    const channel = supabase.channel(`scoring:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, fetchMatch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const updateMatchPlayers = async (players: any) => {
    const { error } = await supabase.from('matches').update(players).eq('id', matchId);
    if (error) Alert.alert('Error', 'Failed to update players');
    else {
      setShowPlayerModal(false);
      fetchMatch();
    }
  };

  const handleAddBall = async (p: { r: number, e: number, type?: string, isW?: boolean, wType?: string, dism?: string }) => {
    if (!match.striker || !match.currentBowler) {
      setShowPlayerModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
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

      // RULE ENGINE LOGIC
      let nextStriker = match.striker;
      let nextNonStriker = match.nonStriker;
      let nextBowler = match.currentBowler;
      let lastBowler = match.lastBowler;

      // 1. Strike Rotation on odd runs
      const totalRuns = p.r + p.e;
      if (totalRuns % 2 !== 0 && !p.isW) {
        [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
      }

      // 2. Over Complete
      const legalBalls = overHistory.filter(b => !b.extra_type || b.extra_type === 'bye' || b.extra_type === 'legbye').length;
      if (legalBalls === 5 && !p.type) { // This was the 6th legal ball
        [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker]; // End of over rotation
        lastBowler = nextBowler;
        nextBowler = null; // Force new bowler selection
        Alert.alert('Over Complete', 'Select new bowler.');
      }

      // 3. Wicket Logic
      if (p.isW) {
        setModalType('wicket');
        setShowPlayerModal(true);
        return; // Modal will handle the update
      }

      await updateMatchPlayers({
        striker: nextStriker,
        nonStriker: nextNonStriker,
        currentBowler: nextBowler,
        lastBowler: lastBowler
      });

    } catch (e) {
      Alert.alert('Error', 'Failed to add ball.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPlayerModal = () => (
    <Modal visible={showPlayerModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Card style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {modalType === 'start' ? 'Match Setup' : modalType === 'wicket' ? 'Wicket! Next Batter?' : 'Change Bowler'}
          </Text>
          
          {modalType !== 'bowler' && (
            <Input label="New Striker" value={tempStriker} onChangeText={setTempStriker} placeholder="Batter Name" />
          )}
          {modalType === 'start' && (
            <Input label="Non-Striker" value={tempNonStriker} onChangeText={setTempNonStriker} placeholder="Batter Name" />
          )}
          {modalType !== 'wicket' && (
            <Input label="Bowler" value={tempBowler} onChangeText={setTempBowler} placeholder="Bowler Name" />
          )}

          <Button 
            title="Confirm Players" 
            onPress={() => {
              if (tempBowler === match?.lastBowler && modalType !== 'start') {
                Alert.alert('Illegal', 'Bowler cannot bowl consecutive overs.');
                return;
              }
              updateMatchPlayers({
                striker: tempStriker || match.striker,
                nonStriker: tempNonStriker || match.nonStriker,
                currentBowler: tempBowler || match.currentBowler
              });
            }} 
          />
        </Card>
      </View>
    </Modal>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      {renderPlayerModal()}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{match.team1} vs {match.team2}</Text>
        <TouchableOpacity onPress={() => setShowPlayerModal(true)}>
          <Ionicons name="people" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.scoreCard}>
          <Text style={styles.inningsText}>Innings {match.currentInnings} • {match.status}</Text>
          <Text style={styles.mainScore}>{match.currentInnings === 1 ? match.score1 : match.score2}</Text>
          <View style={styles.currentPlayers}>
            <Text style={styles.playerTag}>🏏 {match.striker}*</Text>
            <Text style={styles.playerTag}>🏃 {match.nonStriker}</Text>
            <Text style={styles.playerTag}>⚾ {match.currentBowler}</Text>
          </View>
        </View>

        <View style={styles.overRow}>
          {overHistory.slice(0, 6).reverse().map((ball, i) => (
            <View key={i} style={[styles.ballCircle, ball.is_wicket && {backgroundColor: COLORS.danger}]}>
              <Text style={[styles.ballText, ball.is_wicket && {color: COLORS.white}]}>{ball.is_wicket ? 'W' : ball.runs + ball.extras}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonGrid}>
          <View style={styles.row}>
            {[0, 1, 2, 3].map(r => (
              <TouchableOpacity key={r} style={styles.runBtn} onPress={() => handleAddBall({ r, e: 0 })}>
                <Text style={styles.runBtnText}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.row}>
            {[4, 6].map(r => (
              <TouchableOpacity key={r} style={[styles.runBtn, {backgroundColor: COLORS.primaryLight}]} onPress={() => handleAddBall({ r, e: 0 })}>
                <Text style={[styles.runBtnText, {color: COLORS.primary}]}>{r}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.runBtn} onPress={() => handleAddBall({ r: 0, e: 1, type: 'wide' })}>
              <Text style={styles.runBtnText}>WD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.runBtn} onPress={() => handleAddBall({ r: 0, e: 1, type: 'noball' })}>
              <Text style={styles.runBtnText}>NB</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.runBtn, {backgroundColor: COLORS.danger}]} onPress={() => handleAddBall({ r: 0, e: 0, isW: true, wType: 'bowled' })}>
              <Text style={[styles.runBtnText, {color: COLORS.white}]}>WKT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.runBtn} onPress={() => handleAddBall({ r: 0, e: 1, type: 'bye' })}>
              <Text style={styles.runBtnText}>BYE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.runBtn} onPress={() => {
              updateMatchPlayers({ striker: match.nonStriker, nonStriker: match.striker });
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
  scroll: { padding: 16 },
  scoreCard: { backgroundColor: COLORS.primary, padding: 24, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', ...SHADOWS.medium, marginBottom: 24 },
  inningsText: { color: COLORS.white, opacity: 0.8, fontSize: 12, fontWeight: '800', marginBottom: 8 },
  mainScore: { color: COLORS.white, fontSize: 44, fontWeight: '900' },
  currentPlayers: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16, justifyContent: 'center' },
  playerTag: { color: COLORS.white, fontSize: 13, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  overRow: { flexDirection: 'row', gap: 8, marginBottom: 32, justifyContent: 'center' },
  ballCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  ballText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  buttonGrid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  runBtn: { flex: 1, height: 60, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.soft },
  runBtnText: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
});
