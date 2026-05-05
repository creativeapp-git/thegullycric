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

export const getUserProfile = async (uid: string) => {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 15000)
    );

    const fetchPromise = supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .limit(1);

    const result: any = await Promise.race([fetchPromise, timeoutPromise]);
    const { data, error } = result;

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error: any) {
    if (error.message === 'TIMEOUT') throw error;
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
