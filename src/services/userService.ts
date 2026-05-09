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
  let timer: NodeJS.Timeout;
  try {
    const fetchPromise = supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .limit(1);

    const timeoutPromise = new Promise<any>((_, reject) => {
      timer = setTimeout(() => reject(new Error('TIMEOUT')), 8000);
    });

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (error) {
      if (error.message?.includes('abort') || error.name === 'AbortError' || error.message === 'TIMEOUT') {
        throw new Error('TIMEOUT');
      }
      throw error;
    }
    return data && data.length > 0 ? data[0] : null;
  } catch (error: any) {
    const isTimeout =
      error.message === 'TIMEOUT' ||
      error.name === 'AbortError' ||
      error.message?.toLowerCase().includes('abort');
    if (isTimeout) throw new Error('TIMEOUT');
    return null;
  } finally {
    clearTimeout(timer!);
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
