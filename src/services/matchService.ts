import { supabase } from './supabase';
import { Match } from '../types';

export const createMatch = async (match: Match) => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .insert([{
        matchId: match.matchId,
        name: match.name,
        type: match.type,
        overs: match.overs,
        location: match.location,
        date: match.date,
        time: match.time,
        team1: match.team1,
        team2: match.team2,
        team1Logo: match.team1Logo,
        team2Logo: match.team2Logo,
        team1Players: match.team1Players,
        team2Players: match.team2Players,
        status: match.status,
        description: match.description,
        createdBy: match.createdBy,
        rules: match.rules,
        ballLog: match.ballLog || []
      }])
      .select()
      .single();

    if (error) throw error;
    return data as Match;
  } catch (error: any) {
    console.error('Error creating match:', error);
    throw error;
  }
};

export const getAllMatches = async () => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data || []) as Match[];
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    throw error;
  }
};

export const getLiveMatches = async () => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'Live')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data || []) as Match[];
  } catch (error: any) {
    console.error('Error fetching live matches:', error);
    throw error;
  }
};

export const getFixtures = async () => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'Scheduled')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data || []) as Match[];
  } catch (error: any) {
    console.error('Error fetching fixtures:', error);
    throw error;
  }
};

export const getUserMatches = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('createdBy', userId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data || []) as Match[];
  } catch (error: any) {
    console.error('Error fetching user matches:', error);
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
    console.error('Error fetching match:', error);
    throw error;
  }
};

export const updateMatch = async (matchId: string, updates: Partial<Match>) => {
  try {
    const { error } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', matchId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error updating match:', error);
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
    console.error('Error deleting match:', error);
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
