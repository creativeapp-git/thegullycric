import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '../types';

export const createUserProfile = async (userId: string, userData: Partial<User>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      id: userId,
      name: userData.name || '',
      email: userData.email || '',
      avatar: userData.avatar || '',
      preferences: {
        theme: 'light',
        defaultRules: {
          wideExtra: true,
          noBallExtra: true,
        },
        enableAnimation: true,
      },
      ...userData,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

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

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};