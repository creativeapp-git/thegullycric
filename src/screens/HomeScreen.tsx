/**
 * GullyCric Premium HomeScreen v2.0
 * - Featured hero live match card
 * - Sectioned match feed with gradient cards
 * - Animated search bar
 * - Dark premium sports dashboard feel
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, TextInput, Animated, StatusBar, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { Match } from '../types';
import Header from '../components/Header';
import MatchCard from '../components/MatchCard';
import { SkeletonMatchList } from '../components/SkeletonLoader';
import { AppNavigationProp } from '../navigation/navigation.types';
import { COLORS, SPACING, SHADOWS, BORDER_RADIUS, TYPOGRAPHY } from '../theme';
import { SectionHeader, Button, EmptyState, ScoreHero, LiveBadge } from '../components/UI';

const MATCH_COLUMNS = 'id,match_id,team1,team2,team1_logo,team2_logo,score1,score2,wickets1,wickets2,overs,match_state,winner,location,date,type,created_at,status';

const HomeScreen = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const [matches, setMatches]     = useState<Match[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const heroOpacity   = useRef(new Animated.Value(0)).current;

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchMatches = useCallback(async (query?: string) => {
    try {
      let q = supabase.from('matches').select(MATCH_COLUMNS)
        .order('created_at', { ascending: false }).limit(30);
      if (query) q = q.or(`team1.ilike.%${query}%,team2.ilike.%${query}%`);
      const { data, error } = await q;
      if (error) throw error;
      setMatches((data as Match[]) || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchMatches(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, fetchMatches]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel('home:matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchMatches())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchMatches]);

  // Fade in animations
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(heroOpacity,   { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(searchOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  };

  // ── Derived sections ───────────────────────────────────────────────────────
  const live      = matches.filter(m => m.match_state === 'live'      || m.status === 'Live');
  const upcoming  = matches.filter(m => m.match_state === 'setup'     || m.status === 'Scheduled');
  const completed = matches.filter(m => m.match_state === 'completed' || m.status === 'Completed');
  const featuredLive = live[0] ?? null;

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderSection = (title: string, data: Match[], accent?: string) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        <SectionHeader
          title={title}
          rightAction={
            <View style={[styles.countBadge, accent ? { borderColor: accent + '40', backgroundColor: accent + '12' } : {}]}>
              <Text style={[styles.countText, accent ? { color: accent } : {}]}>{data.length}</Text>
            </View>
          }
        />
        {data.map(m => (
          <MatchCard
            key={m.id || m.matchId}
            match={m}
            onPress={() => navigation.navigate('MatchDetail', { matchId: (m.id || m.matchId)! })}
          />
        ))}
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <Header />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero section ────────────────────────────────────────────────── */}
        <LinearGradient
          colors={['#0F1E35', '#0D1117'] as any}
          style={styles.heroSection}
        >
          <Text style={styles.heroHeadline}>
            Gully Cricket,{'\n'}<Text style={styles.heroAccent}>Live.</Text>
          </Text>
          <Text style={styles.heroSub}>Track your local matches like a pro.</Text>
        </LinearGradient>

        {/* ── Search ──────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.searchWrap, { opacity: searchOpacity }]}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search teams or matches…"
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {loading && !refreshing ? (
          <View style={{ paddingHorizontal: SPACING.lg }}>
            <SkeletonMatchList count={4} />
          </View>
        ) : (
          <>
            {/* Featured live hero card */}
            {featuredLive && !searchQuery && (
              <Animated.View style={[styles.section, { opacity: heroOpacity }]}>
                <SectionHeader
                  title="Featured Live"
                  rightAction={<LiveBadge size="sm" />}
                />
                <ScoreHero
                  team1={featuredLive.team1}
                  team2={featuredLive.team2}
                  score1={`${featuredLive.score1 ?? 0}/${featuredLive.wickets1 ?? 0}`}
                  score2={`${featuredLive.score2 ?? 0}/${featuredLive.wickets2 ?? 0}`}
                  isLive
                  overs={featuredLive.overs ? String(featuredLive.overs) : undefined}
                  onPress={() => navigation.navigate('MatchDetail', { matchId: (featuredLive.id || featuredLive.matchId)! })}
                />
              </Animated.View>
            )}

            {/* Live matches (all, skip featured) */}
            {live.length > 1 && renderSection('Live Matches', live.slice(1), COLORS.primary)}
            {live.length === 1 && !featuredLive && renderSection('Live Matches', live, COLORS.primary)}

            {renderSection('Upcoming', upcoming, COLORS.secondary)}
            {renderSection('Results', completed, COLORS.textMuted)}

            {/* Empty state */}
            {matches.length === 0 && (
              <EmptyState
                icon="baseball-outline"
                title="No matches yet"
                subtitle="Host a gully cricket match and start scoring live."
                action={
                  <Button
                    title="Host a Match"
                    onPress={() => navigation.navigate('CreateMatch')}
                    icon="add-circle-outline"
                  />
                }
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 120 },

  // Hero banner
  heroSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  heroHeadline: {
    fontSize: TYPOGRAPHY.sizes.xxxl,
    fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.text,
    lineHeight: 38,
  },
  heroAccent: { color: COLORS.primary },
  heroSub: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },

  // Search
  searchWrap: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardElevated,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 13,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.text,
    fontWeight: TYPOGRAPHY.weights.medium,
    padding: 0,
  },

  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BORDER_RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.black,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
});

export default HomeScreen;