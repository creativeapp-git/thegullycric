import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, SHADOWS, BORDER_RADIUS } from '../theme';

export default function ScoringScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { matchId } = route.params;

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overHistory, setOverHistory] = useState<any[]>([]);

  // Animation for buttons
  const scaleAnim = new Animated.Value(1);

  const fetchMatch = async () => {
    try {
      const { data, error } = await supabase.from('matches').select('*').eq('id', matchId).single();
      if (error) throw error;
      setMatch(data);
      
      // Fetch last 6 balls for current innings
      const { data: balls } = await supabase
        .from('balls')
        .select('*')
        .eq('match_id', matchId)
        .eq('innings', data.currentInnings)
        .order('created_at', { ascending: false })
        .limit(6);
      setOverHistory(balls || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatch();
    const channel = supabase.channel(`scoring:${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, fetchMatch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const handleAddBall = async (p: { r: number, e: number, type?: string, isW?: boolean, wType?: string, dism?: string }) => {
    if (!striker || !bowler) {
      Alert.alert('Missing Info', 'Please enter striker and bowler names.');
      return;
    }
    
    setIsSubmitting(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 50, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 50, useNativeDriver: true })
    ]).start();

    try {
      const { error: rpcError } = await supabase.rpc('add_ball', {
        p_match_id: matchId,
        p_innings: match.currentInnings,
        p_over: Math.floor(overHistory.length / 6), // Dummy over for now
        p_ball_num: (overHistory.length % 6) + 1,
        p_runs: p.r,
        p_extras: p.e,
        p_extra_type: p.type,
        p_is_wicket: !!p.isW,
        p_wicket_type: p.wType,
        p_batter: striker,
        p_bowler: bowler,
        p_dismissed_player: p.dism
      });

      if (rpcError) throw rpcError;
      await fetchMatch();
    } catch (e) {
      Alert.alert('Error', 'Failed to add ball.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const currentScore = match.currentInnings === 1 ? match.score1 : match.score2;

  const renderRunBtn = (r: number) => (
    <TouchableOpacity 
      style={styles.runBtn} 
      onPress={() => handleAddBall({ r, e: 0 })}
      disabled={isSubmitting}
    >
      <Text style={styles.runBtnText}>{r}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Scoring</Text>
        <TouchableOpacity onPress={fetchMatch}>
          <Ionicons name="refresh" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* BIG SCORE DISPLAY */}
        <View style={styles.scoreCard}>
          <Text style={styles.inningsText}>Innings {match.currentInnings}</Text>
          <Text style={styles.mainScore}>{currentScore || '0/0 (0.0)'}</Text>
          <Text style={styles.targetText}>
            {match.currentInnings === 2 ? `Target: ${parseInt(match.score1) + 1}` : 'First Innings'}
          </Text>
        </View>

        {/* BATTER / BOWLER INPUTS */}
        <View style={styles.inputSection}>
          <View style={styles.playerInput}>
            <Ionicons name="person" size={16} color={COLORS.primary} />
            <TextInput 
              style={styles.input} 
              placeholder="Striker" 
              value={striker} 
              onChangeText={setStriker}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={styles.playerInput}>
            <Ionicons name="person-outline" size={16} color={COLORS.textSecondary} />
            <TextInput 
              style={styles.input} 
              placeholder="Non-Striker" 
              value={nonStriker} 
              onChangeText={setNonStriker}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
          <View style={[styles.playerInput, {borderBottomWidth: 0}]}>
            <Ionicons name="baseball-outline" size={16} color={COLORS.danger} />
            <TextInput 
              style={styles.input} 
              placeholder="Bowler" 
              value={bowler} 
              onChangeText={setBowler}
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
        </View>

        {/* OVER HISTORY */}
        <View style={styles.overRow}>
          {overHistory.slice(0, 6).reverse().map((ball, i) => (
            <View key={i} style={[
              styles.ballCircle, 
              ball.is_wicket && {backgroundColor: COLORS.danger},
              ball.runs >= 4 && {backgroundColor: COLORS.primary}
            ]}>
              <Text style={[styles.ballText, (ball.is_wicket || ball.runs >= 4) && {color: COLORS.white}]}>
                {ball.is_wicket ? 'W' : ball.runs + ball.extras}
              </Text>
            </View>
          ))}
          {overHistory.length === 0 && <Text style={styles.emptyOver}>Waiting for first ball...</Text>}
        </View>

        {/* SCORING BUTTONS */}
        <View style={styles.buttonGrid}>
          <View style={styles.row}>
            {renderRunBtn(0)}
            {renderRunBtn(1)}
            {renderRunBtn(2)}
            {renderRunBtn(3)}
          </View>
          <View style={styles.row}>
            {renderRunBtn(4)}
            {renderRunBtn(6)}
            <TouchableOpacity style={[styles.runBtn, styles.wideBtn]} onPress={() => handleAddBall({ r: 0, e: 1, type: 'wide' })}>
              <Text style={styles.runBtnText}>WD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.runBtn, styles.nbBtn]} onPress={() => handleAddBall({ r: 0, e: 1, type: 'noball' })}>
              <Text style={styles.runBtnText}>NB</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.runBtn, styles.wicketBtn]} onPress={() => handleAddBall({ r: 0, e: 0, isW: true, wType: 'bowled' })}>
              <Text style={[styles.runBtnText, {color: COLORS.white}]}>WKT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.runBtn, styles.extraBtn]} onPress={() => handleAddBall({ r: 0, e: 1, type: 'bye' })}>
              <Text style={styles.runBtnText}>BYE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.runBtn, styles.extraBtn]} onPress={() => handleAddBall({ r: 0, e: 1, type: 'legbye' })}>
              <Text style={styles.runBtnText}>LB</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.runBtn} onPress={() => {
              const temp = striker;
              setStriker(nonStriker);
              setNonStriker(temp);
            }}>
              <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

import { TextInput } from 'react-native-gesture-handler';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 16 },
  scoreCard: { backgroundColor: COLORS.primary, padding: 32, borderRadius: BORDER_RADIUS.xl, alignItems: 'center', ...SHADOWS.medium, marginBottom: 24 },
  inningsText: { color: COLORS.primaryLight, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  mainScore: { color: COLORS.white, fontSize: 48, fontWeight: '900' },
  targetText: { color: COLORS.white, fontSize: 14, opacity: 0.8, marginTop: 8, fontWeight: '600' },
  inputSection: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: 16, marginBottom: 24 },
  playerInput: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 12 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  overRow: { flexDirection: 'row', gap: 8, marginBottom: 32, justifyContent: 'center' },
  ballCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  ballText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  emptyOver: { color: COLORS.textSecondary, fontStyle: 'italic', fontSize: 13 },
  buttonGrid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  runBtn: { flex: 1, height: 60, backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.soft },
  runBtnText: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  wideBtn: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  nbBtn: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  wicketBtn: { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  extraBtn: { backgroundColor: COLORS.card },
});
