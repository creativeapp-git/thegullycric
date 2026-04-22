// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyACBrDTFOY0gc_A-jlh6gtWLbTfuWLks0U",
  authDomain: "gullycric-app.firebaseapp.com",
  projectId: "gullycric-app",
  storageBucket: "gullycric-app.firebasestorage.app",
  messagingSenderId: "866245632641",
  appId: "1:866245632641:web:88c3f3f4dd1bb76a5ce380",
  measurementId: "G-VYNM4SHH26"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

export { auth };

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Realtime Database and get a reference to the service
export const rtdb = getDatabase(app);