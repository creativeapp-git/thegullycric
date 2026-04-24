import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { Match } from '../types';

const matchesCollection = collection(db, 'matches');

// Create a new match
export const createMatch = async (match: Match) => {
  try {
    const docRef = await addDoc(matchesCollection, {
      ...match,
      createdAt: Timestamp.now(),
    });
    console.log('Match created:', docRef.id);
    return { id: docRef.id, ...match };
  } catch (error: any) {
    console.error('Error creating match:', error);
    throw error;
  }
};

// Get all matches
export const getAllMatches = async () => {
  try {
    const querySnapshot = await getDocs(matchesCollection);
    const matches: Match[] = [];
    querySnapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() } as Match);
    });
    console.log('Fetched all matches:', matches.length);
    return matches;
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    throw error;
  }
};

// Get live matches
export const getLiveMatches = async () => {
  try {
    const q = query(matchesCollection, where('status', '==', 'Live'));
    const querySnapshot = await getDocs(q);
    const matches: Match[] = [];
    querySnapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() } as Match);
    });
    console.log('Fetched live matches:', matches.length);
    return matches;
  } catch (error: any) {
    console.error('Error fetching live matches:', error);
    throw error;
  }
};

// Get scheduled/fixture matches
export const getFixtures = async () => {
  try {
    const q = query(matchesCollection, where('status', '==', 'Scheduled'));
    const querySnapshot = await getDocs(q);
    const matches: Match[] = [];
    querySnapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() } as Match);
    });
    console.log('Fetched fixtures:', matches.length);
    return matches;
  } catch (error: any) {
    console.error('Error fetching fixtures:', error);
    throw error;
  }
};

// Get matches by user (creator)
export const getUserMatches = async (userId: string) => {
  try {
    const q = query(matchesCollection, where('createdBy', '==', userId));
    const querySnapshot = await getDocs(q);
    const matches: Match[] = [];
    querySnapshot.forEach((doc) => {
      matches.push({ id: doc.id, ...doc.data() } as Match);
    });
    console.log('Fetched user matches:', matches.length);
    return matches;
  } catch (error: any) {
    console.error('Error fetching user matches:', error);
    throw error;
  }
};

// Get match by ID
export const getMatchById = async (matchId: string) => {
  try {
    const docRef = doc(db, 'matches', matchId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Match;
    } else {
      console.log('Match not found');
      return null;
    }
  } catch (error: any) {
    console.error('Error fetching match:', error);
    throw error;
  }
};

// Update match
export const updateMatch = async (matchId: string, updates: Partial<Match>) => {
  try {
    const docRef = doc(db, 'matches', matchId);
    await updateDoc(docRef, updates);
    console.log('Match updated:', matchId);
  } catch (error: any) {
    console.error('Error updating match:', error);
    throw error;
  }
};

// Delete match
export const deleteMatch = async (matchId: string) => {
  try {
    await deleteDoc(doc(db, 'matches', matchId));
    console.log('Match deleted:', matchId);
  } catch (error: any) {
    console.error('Error deleting match:', error);
    throw error;
  }
};

// Search matches by name, location, or matchId
export const searchMatches = async (searchTerm: string, matches: Match[]) => {
  return matches.filter(
    (match) =>
      match.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.matchId.toLowerCase().includes(searchTerm.toLowerCase())
  );
};
