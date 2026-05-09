import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl, Share
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getMatchById } from '../services/matchService';
import { Match } from '../types';
import { AppNavigationProp, MatchDetailRouteProp } from '../navigation/navigation.types';
import { supabase } from '../services/supabase';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';

interface BatterStats { name: string; runs: number; balls: number; fours: number; sixes: number; outStr: string; }
interface BowlerStats { name: string; legalBalls: number; runs: number; wickets: number; economy: string; }
interface FowStats { score: number; wicketNum: number; overStr: string; player: string; }

const MatchDetailScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<MatchDetailRouteProp>();
  const { matchId } = route.params;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Info' | 'Scorecard'>('Info');
  const [scorecardInnings, setScorecardInnings] = useState<1 | 2>(1);
  const [scorecardData, setScorecardData] = useState<any>(null);
  const [scorecardLoading, setScorecardLoading] = useState(false);

  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      currentUserIdRef.current = session?.user?.id ?? null;
      setCurrentUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchMatch = async () => {
    try {
      setLoading(true);
      const data = await getMatchById(matchId);
      setMatch(data);
      if (data && data.match_state !== 'setup') {
        setActiveTab('Scorecard');
        if (data.current_innings === 2) setScorecardInnings(2);
        fetchScorecardStats(matchId, data.current_innings || 1);
      }
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchScorecardStats = async (id: string, inn: number) => {
    try {
      setScorecardLoading(true);
      const { data: res, error } = await supabase.rpc('get_innings_stats', {
        p_match_id: id,
        p_innings: inn
      });
      if (error) throw error;
      setScorecardData(res);
    } catch (e) {
      console.error('Scorecard stats error:', e);
    } finally {
      setScorecardLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Scorecard' && matchId) {
      fetchScorecardStats(matchId, scorecardInnings);
    }
  }, [activeTab, scorecardInnings, matchId]);

  useFocusEffect(useCallback(() => { fetchMatch(); }, []));
  
  // REALTIME: Subscribe to live updates
  useEffect(() => {
    if (matchId) {
      const channel = supabase
        .channel(`match-detail-${matchId}`)
        // @ts-ignore
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
          (payload: any) => {

            setMatch(prev => prev ? { ...prev, ...payload.new } : (payload.new as Match));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [matchId]);

  const onRefresh = () => { setRefreshing(true); fetchMatch(); };

  const isOwner = match?.created_by === currentUserId || match?.createdBy === currentUserId;

  const handleShare = async () => {
    if (!match) return;
    try {
      const origin = Platform.OS === 'web' ? window.location.origin : 'https://thegullycric.web.app';
      const url = `${origin}/match/${match.match_id || match.matchId}`;
      const message = `🏏 Watch ${match.team1} vs ${match.team2} live on GullyCric!\n\nScore: ${match.score1 || '0/0'}\n\nView here: ${url}`;
      
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(url);
        window.alert('Match link copied to clipboard!');
      } else {
        await Share.share({ message });
      }
    } catch (error) {

    }
  };

  const getInningsScoreStr = (inn: number) => {
    if (inn === 1) return match?.score1 || '0/0 (0.0)';
    return match?.score2 || '0/0 (0.0)';
  };

  const getScorecardStats = () => {
    if (!scorecardData) return { batters: [], bowlers: [], summary: null };
    return {
      batters: scorecardData.batting || [],
      bowlers: scorecardData.bowling || [],
      summary: scorecardData.summary
    };
  };

  const handleStartToss = () => {
    // Navigate to CreateMatch, but we don't have a direct "Toss" screen yet.
    // For now, if a fixture needs to be started, they should be able to just "Start Live" which creates a toss manually.
    // I will navigate them back to a generic flow or show an alert.
    if (Platform.OS === 'web') {
      window.alert('To start a fixture, please go to Create Match flow or we will build an Edit Match flow soon.');
    }
  };

  if (loading) return <View style={[s.root, s.center]}><ActivityIndicator size="large" color="#10B981" /></View>;
  if (!match) return <View style={[s.root, s.center]}><Text style={{ color: '#6B7280' }}>Match not found</Text></View>;

  const battingFirst = match.tossDecision === 'Bat' ? match.tossWinner : (match.tossWinner === match.team1 ? match.team2 : match.team1);
  const battingSecond = battingFirst === match.team1 ? match.team2 : match.team1;
  
  const currentInningsName = scorecardInnings === 1 ? battingFirst : battingSecond;
  const { batters, bowlers, summary } = getScorecardStats();

  const renderInfoTab = () => {
    return (
      <View style={s.tabContent}>
        <TouchableOpacity 
          style={[s.card, {backgroundColor: COLORS.cardElevated, alignItems: 'center', borderColor: COLORS.primary, borderWidth: 1}]}
          onPress={() => navigation.navigate('MatchSummary', { matchId })}
        >
          <Text style={{color: COLORS.primary, fontWeight: TYPOGRAPHY.weights.bold, fontSize: TYPOGRAPHY.sizes.md}}>View Full Match Summary & Stats</Text>
        </TouchableOpacity>

        <View style={s.card}>
          <Text style={s.cardTitle}>Match Information</Text>
          <Text style={s.infoText}><Text style={s.infoLabel}>Location:</Text> {match.location}</Text>
          <Text style={s.infoText}><Text style={s.infoLabel}>Format:</Text> {match.type} ({match.overs} Overs)</Text>
          <Text style={s.infoText}><Text style={s.infoLabel}>Date:</Text> {match.date} at {match.time}</Text>
          <Text style={s.infoText}><Text style={s.infoLabel}>Match ID:</Text> {match.match_id || match.matchId}</Text>
          {match.description && <Text style={s.infoText}><Text style={s.infoLabel}>Bio:</Text> {match.description}</Text>}
        </View>

        {match.tossWinner && (
          <View style={s.tossCard}>
            <Ionicons name="trophy-outline" size={16} color={COLORS.warning} />
            <Text style={s.tossText}>{match.tossWinner} won the toss and chose to {match.tossDecision?.toLowerCase()}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: SPACING.lg }}>
          <View style={[s.card, { flex: 1, padding: SPACING.md, alignItems: 'center' }]}>
            <View style={{alignItems: 'center', marginBottom: SPACING.md}}>
              <View style={{padding: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BORDER_RADIUS.pill, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight}}>
                <Ionicons name="shield-half" size={24} color={COLORS.primary} />
              </View>
              <Text style={[s.cardTitle, {marginBottom: 0, textAlign: 'center'}]}>{match.team1}</Text>
            </View>
            {(match.team1_players || match.team1Players || []).map((p, i) => <Text key={i} style={s.playerItem}>{p}</Text>)}
          </View>
          <View style={[s.card, { flex: 1, padding: SPACING.md, alignItems: 'center' }]}>
            <View style={{alignItems: 'center', marginBottom: SPACING.md}}>
              <View style={{padding: SPACING.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BORDER_RADIUS.pill, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.borderLight}}>
                <Ionicons name="shield-half" size={24} color={COLORS.secondary} />
              </View>
              <Text style={[s.cardTitle, {marginBottom: 0, textAlign: 'center'}]}>{match.team2}</Text>
            </View>
            {(match.team2_players || match.team2Players || []).map((p, i) => <Text key={i} style={s.playerItem}>{p}</Text>)}
          </View>
        </View>
      </View>
    );
  };

  const renderScorecardTab = () => (
    <View style={s.tabContent}>
      {/* Innings Toggle */}
      <View style={s.inningsToggleRow}>
        <TouchableOpacity style={[s.inningsTab, scorecardInnings === 1 && s.inningsTabActive]} onPress={() => setScorecardInnings(1)}>
          <Text style={[s.inningsTabText, scorecardInnings === 1 && s.inningsTabTextActive]}>{battingFirst} ({getInningsScoreStr(1)})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.inningsTab, scorecardInnings === 2 && s.inningsTabActive]} onPress={() => setScorecardInnings(2)}>
          <Text style={[s.inningsTabText, scorecardInnings === 2 && s.inningsTabTextActive]}>{battingSecond} ({getInningsScoreStr(2)})</Text>
        </TouchableOpacity>
      </View>

      {/* Batting Table */}
      <View style={s.card}>
        <View style={s.tableHeader}>
          <Text style={[s.colName, s.colHeader]}>Batter</Text>
          <Text style={[s.colNum, s.colHeader]}>R</Text>
          <Text style={[s.colNum, s.colHeader]}>B</Text>
          <Text style={[s.colNum, s.colHeader]}>4s</Text>
          <Text style={[s.colNum, s.colHeader]}>6s</Text>
          <Text style={[s.colNum, s.colHeader, {flex: 1.5}]}>SR</Text>
        </View>
        {batters.map((b: any, i: number) => {
          const isStriker = b.name === match?.striker;
          const isNonStriker = b.name === match?.non_striker;
          return (
          <View key={i}>
            <View style={[s.tableRow, isStriker && {backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 4, borderRadius: 4}]}>
              <View style={s.colName}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={[s.primaryText, isStriker && {color: COLORS.primary}]} numberOfLines={1}>
                    {b.name}
                  </Text>
                  {isStriker && <Ionicons name="flash" size={12} color={COLORS.primary} style={{marginLeft: 4}} />}
                  {isNonStriker && <Ionicons name="walk" size={12} color={COLORS.textSecondary} style={{marginLeft: 4}} />}
                </View>
                <Text style={s.outStr}>{b.is_out ? (b.dismissal || 'out') : 'not out'}</Text>
              </View>
              <Text style={[s.colNum, s.highlightText]}>{b.runs}</Text>
              <Text style={s.colNum}>{b.balls}</Text>
              <Text style={s.colNum}>{b.fours}</Text>
              <Text style={s.colNum}>{b.sixes}</Text>
              <Text style={[s.colNum, {flex: 1.5}]}>{b.strike_rate}</Text>
            </View>
          </View>
        )})}
        {batters.length === 0 && <Text style={s.emptyText}>No batting data yet.</Text>}
      </View>

      {/* Bowler Table */}
      <View style={s.card}>
        <View style={s.tableHeader}>
          <Text style={[s.colName, s.colHeader]}>Bowler</Text>
          <Text style={[s.colNum, s.colHeader]}>O</Text>
          <Text style={[s.colNum, s.colHeader]}>R</Text>
          <Text style={[s.colNum, s.colHeader]}>W</Text>
          <Text style={[s.colNum, s.colHeader, {flex: 1.5}]}>Econ</Text>
        </View>
        {bowlers.map((b: any, i: number) => (
          <View key={i} style={s.tableRow}>
            <Text style={[s.colName, s.primaryText]} numberOfLines={1}>{b.name}</Text>
            <Text style={s.colNum}>{Math.floor(b.legalBalls/6)}.{b.legalBalls%6}</Text>
            <Text style={s.colNum}>{b.runs}</Text>
            <Text style={[s.colNum, s.highlightText]}>{b.wickets}</Text>
            <Text style={[s.colNum, {flex: 1.5}]}>{b.economy}</Text>
          </View>
        ))}
        {bowlers.length === 0 && <Text style={s.emptyText}>No bowling data yet.</Text>}
      </View>

      {/* Extras & Fall of Wickets in Summary */}
      {summary && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Extras & Summary</Text>
          <Text style={s.infoText}>
            W: {summary.extras.wides} | NB: {summary.extras.no_balls} | B: {summary.extras.byes} | LB: {summary.extras.leg_byes}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0F1E35', '#0D1117'] as any} start={{x:0,y:0}} end={{x:1,y:0}} style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={s.matchName} numberOfLines={1}>{match.team1} vs {match.team2}</Text>
          <View style={s.badgeRow}>
          {(match.match_state === 'live' || match.status === 'Live') && (
            <View style={s.liveBadge}><View style={s.liveDot}/><Text style={s.liveBadgeText}>LIVE</Text></View>
          )}
          {(match.match_state === 'completed' || match.status === 'Completed') && (
            <View style={s.completedBadge}><Text style={s.completedText}>COMPLETED</Text></View>
          )}
          </View>
        </View>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
          <Ionicons name="share-social" size={18} color={COLORS.black} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={s.tabsRow}>
        <TouchableOpacity style={[s.tab, activeTab === 'Info' && s.tabActive]} onPress={() => setActiveTab('Info')}>
          <Text style={[s.tabText, activeTab === 'Info' && s.tabTextActive]}>Info</Text>
        </TouchableOpacity>
        {match.match_state !== 'setup' && match.status !== 'Scheduled' && (
          <TouchableOpacity style={[s.tab, activeTab === 'Scorecard' && s.tabActive]} onPress={() => setActiveTab('Scorecard')}>
            <Text style={[s.tabText, activeTab === 'Scorecard' && s.tabTextActive]}>Scorecard</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {activeTab === 'Info' ? renderInfoTab() : renderScorecardTab()}
      </ScrollView>

      {/* Floating Action for Hosts */}
      {isOwner && match.match_state === 'live' && (
        <TouchableOpacity style={s.fab} onPress={() => (navigation as any).navigate('Scoring', { matchId })}>
          <Ionicons name="create" size={22} color={COLORS.black} />
          <Text style={s.fabText}>Score Match</Text>
        </TouchableOpacity>
      )}
      {isOwner && match.match_state === 'setup' && (
        <TouchableOpacity style={[s.fab, {backgroundColor: COLORS.warning}]} onPress={() => (navigation as any).navigate('CreateMatch', { matchId })}>
          <Ionicons name="pencil" size={22} color={COLORS.black} />
          <Text style={[s.fabText, {color: COLORS.black}]}>Edit Fixture</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SPACING.lg, paddingBottom: 100 },
  
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backBtn: { width: 40, height: 40, borderRadius: BORDER_RADIUS.pill, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderGlass },
  matchName: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.text, letterSpacing: 0.2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,230,118,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.pill, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.primary, marginRight: 5 },
  liveBadgeText: { fontSize: 9, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.primary, letterSpacing: 0.8 },
  completedBadge: { backgroundColor: 'rgba(0,230,118,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BORDER_RADIUS.pill, borderWidth: 1, borderColor: 'rgba(0,230,118,0.2)' },
  completedText: { fontSize: 9, fontWeight: TYPOGRAPHY.weights.black, color: COLORS.primary, letterSpacing: 0.8 },
  shareBtn: { width: 38, height: 38, borderRadius: BORDER_RADIUS.pill, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', ...SHADOWS.glowPrimary },

  tabsRow: { flexDirection: 'row', backgroundColor: COLORS.cardElevated, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  tab: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary, fontWeight: TYPOGRAPHY.weights.bold },

  tabContent: { marginTop: SPACING.sm },
  card: { backgroundColor: COLORS.cardElevated, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.small },
  cardTitle: { fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.text, marginBottom: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoText: { fontSize: TYPOGRAPHY.sizes.md, color: COLORS.text, marginBottom: 8, lineHeight: 22 },
  infoLabel: { fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textSecondary },
  tossCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  tossText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.warning, marginLeft: 8 },
  playerItem: { fontSize: TYPOGRAPHY.sizes.md, color: COLORS.textSecondary, marginBottom: 8 },

  inningsToggleRow: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, padding: 4, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  inningsTab: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.sm },
  inningsTabActive: { backgroundColor: COLORS.cardElevated, ...SHADOWS.small, borderWidth: 1, borderColor: COLORS.borderLight },
  inningsTabText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textSecondary },
  inningsTabTextActive: { color: COLORS.text, fontWeight: TYPOGRAPHY.weights.bold },

  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, paddingBottom: SPACING.sm, marginBottom: SPACING.sm },
  tableRow: { flexDirection: 'row', paddingVertical: 8, alignItems: 'center' },
  colName: { flex: 3, fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.text },
  colNum: { flex: 1, fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, textAlign: 'right', fontWeight: TYPOGRAPHY.weights.medium },
  colHeader: { fontSize: 11, color: COLORS.textMuted, fontWeight: TYPOGRAPHY.weights.bold, textTransform: 'uppercase' },
  outStr: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic', marginBottom: 4 },
  primaryText: { fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.text },
  highlightText: { fontWeight: TYPOGRAPHY.weights.heavy, color: COLORS.primary },
  
  fowContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fowText: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, backgroundColor: COLORS.card, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  emptyText: { textAlign: 'center', color: COLORS.textSecondary, fontStyle: 'italic', marginVertical: SPACING.lg },

  fab: { position: 'absolute', bottom: SPACING.xl, right: SPACING.xl, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: BORDER_RADIUS.pill, ...SHADOWS.glowPrimary },
  fabText: { color: COLORS.black, fontSize: TYPOGRAPHY.sizes.md, fontWeight: TYPOGRAPHY.weights.black, marginLeft: 8, letterSpacing: 0.3 },
});

export default MatchDetailScreen;
