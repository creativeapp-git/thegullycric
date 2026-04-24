import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import { User } from '../types';

// Check if a username is already taken (excludes current user)
export const isUsernameTaken = async (username: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;
    // If the only match is the current user, it's not "taken"
    const currentUid = auth.currentUser?.uid;
    if (currentUid && snapshot.size === 1 && snapshot.docs[0].id === currentUid) return false;
    return true;
  } catch (error) {
    console.error('Error checking username:', error);
    throw error;
  }
};

// Check if a phone number is already taken
export const isPhoneNumberTaken = async (phoneNumber: string): Promise<boolean> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking phone number:', error);
    throw error;
  }
};

// Create a new user profile in Firestore
export const createUserProfile = async (userId: string, userData: Partial<User>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      id: userId,
      username: userData.username?.toLowerCase() || '',
      name: userData.name || '',
      email: userData.email || '',
      phoneNumber: userData.phoneNumber || '',
      avatar: userData.avatar || '',
      bio: userData.bio || '',
      preferences: {
        theme: 'light',
        defaultRules: {
          wideExtra: true,
          noBallExtra: true,
        },
        enableAnimation: true,
      },
      ...userData,
      profileEdits: {
        count: 0,
        month: new Date().toISOString().slice(0, 7) // e.g. "2026-04"
      },
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// Get a user profile by user ID
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Get user profile by username
export const getUserByUsername = async (username: string): Promise<User | null> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user by username:', error);
    return null;
  }
};

// Update a user profile
export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  try {
    const userRef = doc(db, 'users', userId);
    // If username is being changed, ensure it's lowercase
    if (updates.username) {
      updates.username = updates.username.toLowerCase();
    }
    await setDoc(userRef, updates, { merge: true });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};