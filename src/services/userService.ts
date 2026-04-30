import { supabase } from './supabase';

export interface UserProfile {
  id?: string;
  uid?: string;
  email: string;
  name?: string;
  username?: string;
  phoneNumber?: string;
  avatar?: string;
  profileEdits?: { count: number; month: string };
  createdAt?: string;
}

export const saveUserProfile = async (uid: string, data: Partial<UserProfile>) => {
  console.log('Attempting to save user profile in Supabase...', uid, data);
  try {
    const { error } = await supabase
      .from('users')
      .upsert({ id: uid, ...data }, { onConflict: 'id' });
    
    if (error) {
      console.error('Supabase upsert error:', error);
      throw error;
    }
    console.log('Profile upsert successful');
  } catch (error: any) {
    console.error('saveUserProfile caught exception:', error);
    throw new Error(error.message);
  }
};

export const getUserProfile = async (uid: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "Results contain 0 rows"
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Check if a username is already taken
export const isUsernameTaken = async (username: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .limit(1);
    
    if (error) throw error;
    return data && data.length > 0;
  } catch (error: any) {
    console.error('Error checking username:', error);
    return false;
  }
};

// Check if a phone number is already taken
export const isPhoneNumberTaken = async (phoneNumber: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('phoneNumber', phoneNumber)
      .limit(1);
      
    if (error) throw error;
    return data && data.length > 0;
  } catch (error: any) {
    console.error('Error checking phone number:', error);
    return false;
  }
};