import { supabase } from './supabase';

export interface UserProfile {
  id?: string;
  uid?: string;
  email: string;
  name?: string;
  username?: string;
  avatar?: string;
  createdAt?: string;
}

export const saveUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  try {
    const { error } = await supabase
      .from('users')
      .upsert({ id: uid, ...data }, { onConflict: 'id' });
    if (error) throw error;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

/**
 * Fetch a user's profile row from the DB.
 * Returns null if the row does not exist.
 * Throws { message: 'TIMEOUT' } if the network hangs beyond 8 seconds.
 */
export const getUserProfile = async (uid: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timer);

    if (error) {
      if (error.message?.includes('abort') || error.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      throw error;
    }
    return data && data.length > 0 ? data[0] : null;
  } catch (error: any) {
    clearTimeout(timer);
    const isTimeout =
      error.message === 'TIMEOUT' ||
      error.name === 'AbortError' ||
      error.message?.toLowerCase().includes('abort');
    if (isTimeout) throw new Error('TIMEOUT');
    return null;
  }
};

export const isUsernameTaken = async (username: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .limit(1);
    if (error) throw error;
    return data && data.length > 0;
  } catch {
    return false;
  }
};
