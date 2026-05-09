import { supabase } from './supabase';
import { Match } from '../types';

export const createMatch = async (match: Match) => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .insert([{
        match_id: match.matchId,
        name: match.name,
        type: match.type,
        overs: match.overs,
        location: match.location,
        date: match.date,
        time: match.time,
        team1: match.team1,
        team2: match.team2,
        team1_logo: match.team1Logo,
        team2_logo: match.team2Logo,
        team1_players: match.team1Players,
        team2_players: match.team2Players,
        match_state: match.status === 'Live' ? 'live' : match.status === 'Completed' ? 'completed' : 'setup',
        description: match.description,
        created_by: match.createdBy,
        rules: match.rules,
        toss_winner: match.tossWinner,
        toss_decision: match.tossDecision,
        current_innings: match.currentInnings ?? 1,
        creator_team: match.creator_team,
        allow_super_over: match.allow_super_over ?? false,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Match;
  } catch (error: any) {
    throw error;
  }
};

export const getAllMatches = async () => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id,match_id,team1,team2,team1_logo,team2_logo,score1,score2,wickets1,wickets2,overs,match_state,winner,location,date,type,creator_team,created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Match[];
  } catch (error: any) {
    throw error;
  }
};

export const getLiveMatches = async () => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('match_state', 'live')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Match[];
  } catch (error: any) {
    throw error;
  }
};

export const getFixtures = async () => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id,match_id,team1,team2,team1_logo,team2_logo,overs,match_state,location,date,type,created_at')
      .eq('match_state', 'setup')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Match[];
  } catch (error: any) {
    throw error;
  }
};

export const getUserMatches = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id,match_id,team1,team2,score1,score2,wickets1,wickets2,overs,match_state,winner,creator_team,current_innings,created_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as Match[];
  } catch (error: any) {
    throw error;
  }
};

export const getMatchByShortId = async (matchId: string) => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('match_id', matchId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as Match | null;
  } catch (error: any) {
    throw error;
  }
};

export const getMatchById = async (matchId: string) => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Match | null;
  } catch (error: any) {
    throw error;
  }
};

export const updateMatch = async (matchId: string, updates: Partial<Match>) => {
  try {
    const dbUpdates: any = { ...updates };
    if ('matchId' in updates) dbUpdates.match_id = updates.matchId;
    if ('team1Logo' in updates) dbUpdates.team1_logo = updates.team1Logo;
    if ('team2Logo' in updates) dbUpdates.team2_logo = updates.team2Logo;
    if ('team1Players' in updates) dbUpdates.team1_players = updates.team1Players;
    if ('team2Players' in updates) dbUpdates.team2_players = updates.team2Players;
    if ('createdBy' in updates) dbUpdates.created_by = updates.createdBy;
    if ('tossWinner' in updates) dbUpdates.toss_winner = updates.tossWinner;
    if ('tossDecision' in updates) dbUpdates.toss_decision = updates.tossDecision;
    if ('currentInnings' in updates) dbUpdates.current_innings = updates.currentInnings;
    if ('status' in updates) dbUpdates.match_state = updates.status === 'Live' ? 'live' : updates.status === 'Completed' ? 'completed' : 'setup';
    
    delete dbUpdates.matchId;
    delete dbUpdates.team1Logo;
    delete dbUpdates.team2Logo;
    delete dbUpdates.team1Players;
    delete dbUpdates.team2Players;
    delete dbUpdates.createdBy;
    delete dbUpdates.tossWinner;
    delete dbUpdates.tossDecision;
    delete dbUpdates.currentInnings;
    delete dbUpdates.status;

    const { error } = await supabase
      .from('matches')
      .update(dbUpdates)
      .eq('id', matchId);

    if (error) throw error;
  } catch (error: any) {
    throw error;
  }
};

export const deleteMatch = async (matchId: string) => {
  try {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);

    if (error) throw error;
  } catch (error: any) {
    throw error;
  }
};

export const searchMatches = async (searchTerm: string, matches: Match[]) => {
  return matches.filter(
    (match) =>
      match.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.matchId?.toLowerCase().includes(searchTerm.toLowerCase())
  );
};
