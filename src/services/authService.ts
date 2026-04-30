import { supabase } from './supabase';
import { Platform } from 'react-native';

// Sign in with username or email
export const signInWithUsernameOrEmail = async (identifier: string, password: string) => {
  try {
    let email = identifier.trim();

    // If it's not an email, we could look up the email by username from the users table.
    // For simplicity right now, we assume it's an email. Supabase Auth primarily uses email.
    if (!email.includes('@')) {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('username', identifier)
        .single();
        
      if (data && data.email) {
        email = data.email;
      } else {
        throw new Error('Username not found.');
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign in with Google (Web Only)
export const signInWithGoogleWeb = async () => {
  try {
    if (Platform.OS !== 'web') {
      throw new Error('Google Sign-In is only supported on the web version.');
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    throw error;
  }
};
