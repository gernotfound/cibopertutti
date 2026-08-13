import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getDocs, collection, query, where, getDoc, deleteDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

// CHIAVI FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDgPpeV9NsDgS-zlfLBW8Ri5GXHrO18Im4",
    authDomain: "cibopertutti-2eab8.firebaseapp.com",
    projectId: "cibopertutti-2eab8",
    storageBucket: "cibopertutti-2eab8.firebasestorage.app",
    messagingSenderId: "830495735056",
    appId: "1:830495735056:web:b74dc5a1fde9dffe1c3995",
    measurementId: "G-0TMN3449C4"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Inizializza Firestore con persistenza offline usando le nuove API
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});

const auth = getAuth(app);
const analytics = getAnalytics(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider, analytics, doc, setDoc, getDocs, collection, query, where, getDoc, deleteDoc, updateDoc, onSnapshot, arrayUnion, arrayRemove, deleteField, signInWithPopup, signOut, onAuthStateChanged };
