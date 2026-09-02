import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

/**
 * Firebase-Projekt der Wirtschaftsjunioren Offenbach am Main e.V.
 *
 * Die Werte koennen ueber Umgebungsvariablen (Netlify -> Site configuration ->
 * Environment variables) uebersteuert werden. Ohne Umgebungsvariablen greift
 * die fest hinterlegte Konfiguration des WJ-Google-Kontos.
 *
 * Wichtig: Diese Schluessel sind oeffentlich (sie stehen in jedem Browser).
 * Der Schutz der Daten passiert ueber die Firestore-Sicherheitsregeln
 * (siehe firestore.rules) und die Google-Anmeldung.
 */
const env = (import.meta as any).env ?? {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCi92iJos8n_MFe2abLTMvhgoyfDpEvQCU',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'wj-vorstandsportal.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'wj-vorstandsportal',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'wj-vorstandsportal.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '432246409434',
  appId: env.VITE_FIREBASE_APP_ID || '1:432246409434:web:0bd8ff76721d99e4a2bde3',
  // '(default)' = die normale Firestore-Datenbank des Projekts
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || '(default)',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
