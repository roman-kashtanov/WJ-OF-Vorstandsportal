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

/**
 * Google-Anmeldung unter der eigenen Adresse (v4.2.0).
 *
 * Auf diesen Adressen reicht Netlify /__/auth/* an Firebase durch (siehe
 * netlify.toml). Dort wird der Anmeldedienst deshalb unter der eigenen
 * Adresse angesprochen: Google zeigt "Weiter zu app.vorstandsportal.cloud",
 * und Safari behandelt die Anmeldung nicht als fremde Seite (die Rueckkehr
 * nach der Weiterleitung auf dem iPhone wird zuverlaessiger).
 *
 * Bewusst eine feste Liste statt "immer die aktuelle Adresse": Google nimmt
 * nur Rueckkehradressen an, die in der Google-Cloud-Konsole beim
 * OAuth-Client eingetragen sind (hier: https://app.vorstandsportal.cloud/__/auth/handler).
 * Lokal, auf der alten Netlify-Adresse und auf Testversionen bleibt es beim
 * firebaseapp.com-Anmeldedienst, der ueberall funktioniert.
 */
const AUTH_PROXY_HOSTS = ['app.vorstandsportal.cloud'];
const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyA9pUq6DmHJiPxHwdT04EI7q7lxyRG8oJw',
  authDomain: AUTH_PROXY_HOSTS.includes(currentHost)
    ? currentHost
    : env.VITE_FIREBASE_AUTH_DOMAIN || 'vorstandsportal-wj-offenbach.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'vorstandsportal-wj-offenbach',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'vorstandsportal-wj-offenbach.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '357427510012',
  appId: env.VITE_FIREBASE_APP_ID || '1:357427510012:web:5723721a3592ce771a3579',
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
