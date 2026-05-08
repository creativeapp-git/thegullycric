/**
 * Simple in-memory cache for the current user's profile.
 * Prevents duplicate DB fetches across screens (Settings, MySpace, Header, etc.)
 */

import { supabase } from './supabase';

interface CachedProfile {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
}

let cachedProfile: CachedProfile | null = null;
let cachedUid: string | null = null;
let inflightPromise: Promise<CachedProfile | null> | null = null;

/** Returns the cached profile, or fetches it once if not yet cached. */
export const getCachedProfile = async (uid: string): Promise<CachedProfile | null> => {
  if (cachedUid === uid && cachedProfile) return cachedProfile;

  // Deduplicate concurrent calls (e.g. two screens mounting at same time)
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, email, avatar, bio')
        .eq('id', uid)
        .single();

      if (error || !data) return null;
      cachedProfile = data as CachedProfile;
      cachedUid = uid;
      return cachedProfile;
    } catch {
      return null;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
};

/** Call this after saving a profile update so next fetch is fresh. */
export const invalidateProfileCache = () => {
  cachedProfile = null;
  cachedUid = null;
};
