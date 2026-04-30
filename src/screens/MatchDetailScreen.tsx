import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl, Share
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMatchById, updateMatch } from '../services/matchService';
import { Match, BallEvent } from '../types';
import { AppNavigationProp, MatchDetailRouteProp } from '../navigation/navigation.types';
import { supabase } from '../services/supabase';

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  const fetchMatch = async () => {
    try {
      setLoading(true);
      const data = await getMatchById(matchId);
      setMatch(data);
      if (data && data.status !== 'Scheduled') {
        setActiveTab('Scorecard');
        if (data.currentInnings === 2) setScorecardInnings(2);
        fetchScorecardStats(matchId, data.currentInnings || 1);
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
        .on(
          'postgres_changes',
          { event: 'UPDATE', table: 'matches', filter: `id=eq.${matchId}` },
          (payload) => {
            console.log('Match summary updated via Realtime:', payload.new);
            setMatch(prev => prev ? { ...prev, ...payload.new } : (payload.new as Match));
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', table: 'balls', filter: `match_id=eq.${matchId}` },
          (payload) => {
            console.log('New ball received via Realtime:', payload.new);
            setMatch(prev => {
              if (!prev) return prev;
              const currentLog = prev.ballLog || [];
              // Prevent duplicates if Realtime fires multiple times
              if (currentLog.some(b => b.id === payload.new.id)) return prev;
              return { ...prev, ballLog: [...currentLog, payload.new as BallEvent] };
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [matchId]);

  const onRefresh = () => { setRefreshing(true); fetchMatch(); };

  const isOwner = match?.createdBy === currentUserId;

  const handleShare = async () => {
    if (!match) return;
    try {
      const message = `🏏 Watch ${match.team1} vs ${match.team2} on GullyCric!\nMatch ID: ${match.matchId}\nFormat: ${match.type} • ${match.overs} Overs`;
      await Share.share({ message });
    } catch (error) {
      console.log('Share error:', error);
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
    // For the Info tab, we'll just show match details and a button to view full summary
    return (
      <View style={s.tabContent}>
        <TouchableOpacity 
          style={[s.card, {backgroundColor: '#10B981', alignItems: 'center'}]}
          onPress={() => navigation.navigate('MatchSummary', { matchId })}
        >
          <Text style={{color: '#FFF', fontWeight: '700'}}>View Full Match Summary & Stats</Text>
        </TouchableOpacity>

        <View style={s.card}>
          <Text style={s.cardTitle}>Match Information</Text>
          <Text style={s.infoText}><Text style={s.infoLabel}>Location:</Text> {match.location}</Text>
          <Text style={s.infoText}><Text style={s.infoLabel}>Format:</Text> {match.type} ({match.overs} Overs)</Text>
          <Text style={s.infoText}><Text style={s.infoLabel}>Date:</Text> {match.date} at {match.time}</Text>
          <Text style={s.infoText}><Text style={s.infoLabel}>Match ID:</Text> {match.matchId}</Text>
          {match.description && <Text style={s.infoText}><Text style={s.infoLabel}>Bio:</Text> {match.description}</Text>}
        </View>

        {match.tossWinner && (
          <View style={s.tossCard}>
            <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
            <Text style={s.tossText}>{match.tossWinner} won the toss and chose to {match.tossDecision?.toLowerCase()}</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={[s.card, { flex: 1 }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
              {match.team1Logo && <Text style={{fontSize: 20, marginRight: 8}}>{match.team1Logo}</Text>}
              <Text style={[s.cardTitle, {marginBottom: 0}]}>{match.team1}</Text>
            </View>
            {match.team1Players?.map((p, i) => <Text key={i} style={s.playerItem}>{p}</Text>)}
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
              {match.team2Logo && <Text style={{fontSize: 20, marginRight: 8}}>{match.team2Logo}</Text>}
              <Text style={[s.cardTitle, {marginBottom: 0}]}>{match.team2}</Text>
            </View>
            {match.team2Players?.map((p, i) => <Text key={i} style={s.playerItem}>{p}</Text>)}
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
        {batters.map((b, i) => (
          <View key={i}>
            <View style={s.tableRow}>
              <View style={s.colName}>
                <Text style={{fontWeight: '600'}} numberOfLines={1}>{b.name}</Text>
                <Text style={s.outStr}>{b.is_out ? (b.dismissal || 'out') : 'not out'}</Text>
              </View>
              <Text style={[s.colNum, {fontWeight: '700'}]}>{b.runs}</Text>
              <Text style={s.colNum}>{b.balls}</Text>
              <Text style={s.colNum}>{b.fours}</Text>
              <Text style={s.colNum}>{b.sixes}</Text>
              <Text style={[s.colNum, {flex: 1.5}]}>{b.strike_rate}</Text>
            </View>
          </View>
        ))}
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
        {bowlers.map((b, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={[s.colName, {fontWeight: '600'}]} numberOfLines={1}>{b.name}</Text>
            <Text style={s.colNum}>{Math.floor(b.legalBalls/6)}.{b.legalBalls%6}</Text>
            <Text style={s.colNum}>{b.runs}</Text>
            <Text style={[s.colNum, {fontWeight: '700'}]}>{b.wickets}</Text>
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
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.matchName} numberOfLines={1}>{match.team1} vs {match.team2}</Text>
          <View style={s.badgeRow}>
            {match.status === 'Live' && <View style={s.liveBadge}><View style={s.liveDot}/><Text style={s.liveBadgeText}>LIVE</Text></View>}
            {match.status === 'Completed' && <Text style={s.completedText}>Completed</Text>}
          </View>
        </View>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
          <Ionicons name="share-social" size={20} color="#10B981" />
        </TouchableOpacity>
      </View>

      <View style={s.tabsRow}>
        <TouchableOpacity style={[s.tab, activeTab === 'Info' && s.tabActive]} onPress={() => setActiveTab('Info')}>
          <Text style={[s.tabText, activeTab === 'Info' && s.tabTextActive]}>Info</Text>
        </TouchableOpacity>
        {match.status !== 'Scheduled' && (
          <TouchableOpacity style={[s.tab, activeTab === 'Scorecard' && s.tabActive]} onPress={() => setActiveTab('Scorecard')}>
            <Text style={[s.tabText, activeTab === 'Scorecard' && s.tabTextActive]}>Scorecard</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {activeTab === 'Info' ? renderInfoTab() : renderScorecardTab()}
      </ScrollView>

      {/* Floating Action for Hosts */}
      {isOwner && match.status === 'Live' && (
        <TouchableOpacity style={s.fab} onPress={() => (navigation as any).navigate('Scoring', { matchId })}>
          <Ionicons name="create" size={24} color="#FFF" />
          <Text style={s.fabText}>Score Match</Text>
        </TouchableOpacity>
      )}
      {isOwner && match.status === 'Scheduled' && (
        <TouchableOpacity style={[s.fab, {backgroundColor: '#F59E0B', shadowColor: '#F59E0B'}]} onPress={() => (navigation as any).navigate('CreateMatch', { matchId })}>
          <Ionicons name="pencil" size={24} color="#FFF" />
          <Text style={s.fabText}>Edit Fixture</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  matchName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 4 },
  liveBadgeText: { fontSize: 10, fontWeight: '800', color: '#EF4444' },
  completedText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },

  tabsRow: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#10B981' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#111827' },

  tabContent: { marginTop: 4 },
  performersRow: { flexDirection: 'row', marginBottom: 16 },
  performerCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  performerLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginTop: 8 },
  performerName: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 4 },
  performerStats: { fontSize: 13, color: '#10B981', fontWeight: '600', marginTop: 2 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  infoText: { fontSize: 14, color: '#374151', marginBottom: 8, lineHeight: 20 },
  infoLabel: { fontWeight: '600', color: '#9CA3AF' },
  tossCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12, marginBottom: 16 },
  tossText: { fontSize: 13, fontWeight: '600', color: '#D97706', marginLeft: 8 },
  playerItem: { fontSize: 14, color: '#374151', marginBottom: 6 },

  inningsToggleRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 16 },
  inningsTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  inningsTabActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  inningsTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  inningsTabTextActive: { color: '#111827' },

  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8, marginBottom: 8 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, alignItems: 'center' },
  colName: { flex: 3, fontSize: 14, color: '#111827' },
  colNum: { flex: 1, fontSize: 14, color: '#374151', textAlign: 'right' },
  colHeader: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  outStr: { fontSize: 12, color: '#6B7280', fontStyle: 'italic', marginBottom: 8 },
  
  fowContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fowText: { fontSize: 13, color: '#4B5563', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', marginVertical: 12 },

  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 28, shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  fabText: { color: '#FFF', fontSize: 15, fontWeight: '700', marginLeft: 8 },
});

export default MatchDetailScreen;
