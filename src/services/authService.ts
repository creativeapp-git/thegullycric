import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithRedirect,
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';

// Sign in with username or email
export const signInWithUsernameOrEmail = async (identifier: string, password: string) => {
  try {
    let email = identifier.trim();
    
    // If it doesn't look like an email, try to find it as a username
    if (!email.includes('@')) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Use the email from the first matching user document
        email = querySnapshot.docs[0].data().email;
      } else {
        // If no username found, fallback to the old behavior just in case
        // but better to throw an error that's clearer
        throw { code: 'auth/user-not-found', message: 'Username not found' };
      }
    }
    
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    throw error;
  }
};

// Sign up with Email and Password
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(result.user);
    return result.user;
  } catch (error: any) {
    throw error;
  }
};

// Resend verification email
export const resendVerificationEmail = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No user logged in');
    await sendEmailVerification(currentUser);
  } catch (error: any) {
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign in with Google (Web Only)
export const signInWithGoogleWeb = async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
    // Note: With redirect, this function won't return a user immediately.
    // The page will redirect to Google, and upon return, Firebase's onAuthStateChanged
    // listener in App.tsx will automatically detect the sign-in and navigate to Home.
  } catch (error: any) {
    throw error;
  }
};
