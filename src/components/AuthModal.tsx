import React, { useState, useRef, useEffect } from 'react';
import { BoardMember, SecuritySettings, AuthSession } from '../types';
import { AppStorage } from '../utils/storage';
import { verifyPasscode } from '../utils/security';
import { Biometric } from '../utils/biometric';
import { auth, googleProvider } from '../lib/firebase';
import { FirebaseSync } from '../utils/firebaseSync';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  type User,
} from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (session: AuthSession) => void;
  members: BoardMember[];
  securitySettings: SecuritySettings;
}

/** Google-Fehlercodes in verstaendliche Hinweise uebersetzen. */
function describeAuthError(code: string, message: string): string {
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Die Google-Anmeldung ist im Firebase-Projekt noch nicht aktiviert (Authentication → Sign-in method → Google).';
    case 'auth/unauthorized-domain':
      return `Diese Adresse (${window.location.hostname}) ist in Firebase noch nicht freigegeben (Authentication → Settings → Authorized domains).`;
    case 'auth/popup-blocked':
      return 'Das Anmeldefenster wurde vom Browser blockiert. Bitte erneut versuchen.';
    case 'auth/popup-closed-by-user':
      return '';
    default:
      return message || 'Die Anmeldung ist fehlgeschlagen.';
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onSuccess,
  members,
  securitySettings,
}) => {
  const [step, setStep] = useState<'login' | 'code' | 'biometric'>('login');
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [isEnablingBiometric, setIsEnablingBiometric] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<BoardMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '']);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (step === 'code') setTimeout(() => inputRefs[0].current?.focus(), 120);
  }, [step]);

  useEffect(() => {
    Biometric.isSupported().then(setBiometricSupported);
  }, []);

  // Ergebnis einer Weiterleitungs-Anmeldung (Fallback fuer iOS/PWA)
  useEffect(() => {
    getRedirectResult(auth)
      .then((res) => {
        if (res?.user) void handleGoogleUser(res.user);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);

  if (!isOpen) return null;

  const proceedWith = (user: BoardMember) => {
    setPendingUser(user);
    setError(null);
    if (AppStorage.isExemptFromCode(user, securitySettings)) {
      onSuccess({ isAuthenticated: true, isCodeVerified: true, user });
    } else {
      setStep('code');
      setDigits(['', '', '', '', '']);
      setCodeError(null);
    }
  };

  const handleGoogleUser = async (googleUser: User) => {
    const email = (googleUser.email || '').toLowerCase().trim();
    if (!email) {
      setError('Google hat keine E-Mail-Adresse übermittelt.');
      return;
    }

    // Massgeblich ist die Freigabeliste in Firestore, nicht die lokale
    // Mitgliederliste: Letztere ist bei einem fremden Konto immer leer, weil
    // die Sicherheitsregeln das Lesen verhindern - daraus darf kein Zugang
    // entstehen.
    const allowState = await FirebaseSync.getAllowlistState(email);

    if (allowState === 'not_allowed') {
      setError(
        `Das Konto ${email} ist nicht freigegeben. Bitte wende dich an den Administrator des Vorstandsportals.`
      );
      await signOut(auth).catch(() => {});
      return;
    }

    if (allowState === 'unavailable') {
      setError(
        'Die Freigabeliste konnte nicht geprüft werden. Besteht eine Internetverbindung, und ist die Datenbank eingerichtet?'
      );
      await signOut(auth).catch(() => {});
      return;
    }

    const matched = members.find((m) => (m.email || '').toLowerCase().trim() === email);

    if (matched) {
      proceedWith({ ...matched, name: matched.name || googleUser.displayName || matched.name });
      return;
    }

    // Freigegeben, aber noch kein Profil hinterlegt (z.B. allererste
    // Einrichtung oder ein gerade neu freigegebenes Konto).
    const name = googleUser.displayName || email.split('@')[0];
    const initials = name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    proceedWith({
      id: `mem_${Date.now()}`,
      name,
      role: 'Kreissprecher / Vorsitzender',
      email,
      initials,
      avatarColor: 'bg-[#003594]',
      // Nur beim allerersten Start (leere Freigabeliste) entsteht ein Admin
      isAdmin: allowState === 'bootstrap',
      isPermanentStaff: false,
    } as BoardMember);
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await handleGoogleUser(res.user);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        // Auf dem iPhone / in der installierten App funktioniert oft nur die Weiterleitung
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setError(describeAuthError(redirectErr?.code, redirectErr?.message));
        }
      } else {
        const msg = describeAuthError(code, err?.message);
        if (msg) setError(msg);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const verifyAndEnter = async (code: string) => {
    setIsVerifying(true);
    setCodeError(null);
    try {
      const valid = await verifyPasscode(code, securitySettings);
      if (valid && pendingUser) {
        // Einmalig anbieten, dieses Geraet kuenftig per Face ID / Touch ID zu
        // entsperren, statt den Code erneut einzutippen.
        if (biometricSupported && !Biometric.isEnabled()) {
          setStep('biometric');
        } else {
          onSuccess({ isAuthenticated: true, isCodeVerified: true, user: pendingUser });
        }
      } else {
        setCodeError('Code ungültig.');
        setDigits(['', '', '', '', '']);
        setTimeout(() => inputRefs[0].current?.focus(), 50);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDigitChange = async (idx: number, val: string) => {
    const char = val.slice(-1);
    if (char && !/^\d$/.test(char)) return;
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    setCodeError(null);
    if (char && idx < 4) inputRefs[idx + 1].current?.focus();
    if (char && idx === 4 && next.every((d) => d !== '')) await verifyAndEnter(next.join(''));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl w-full max-w-sm p-7 shadow-2xl">
        <div className="text-center">
          <div className="text-lg font-extrabold tracking-tight text-[#003594]">WJOF.</div>
          <div className="mt-1 text-[11px] text-slate-400">Vorstandsportal</div>
        </div>

        {step === 'login' ? (
          <div className="mt-7 space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
              className="w-full py-3.5 px-4 border border-slate-300 hover:border-slate-400 active:bg-slate-50 rounded-2xl flex items-center justify-center gap-3 text-sm font-semibold text-slate-800 transition-colors disabled:opacity-60"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isSigningIn ? 'Anmeldung läuft …' : 'Mit Google anmelden'}</span>
            </button>

            {/* Nur im lokalen Entwicklungsmodus - im Produktions-Build entfernt der
                Bundler diesen Block vollstaendig. */}
            {(import.meta as any).env?.DEV && (
              <button
                type="button"
                onClick={() =>
                  proceedWith(
                    members[0] ||
                      ({
                        id: 'mem_dev',
                        name: 'Entwicklung',
                        role: 'Kreissprecher / Vorsitzender',
                        email: 'dev@localhost',
                        initials: 'DV',
                        avatarColor: 'bg-[#003594]',
                        isAdmin: true,
                      } as BoardMember)
                  )
                }
                className="w-full py-2 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
              >
                Entwickler-Login (nur lokal)
              </button>
            )}

            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-[12px] leading-relaxed text-rose-800">
                {error}
              </div>
            )}
          </div>
        ) : step === 'code' ? (
          <div className="mt-7 space-y-5">
            <div className="text-center text-[12px] text-slate-500">
              Vorstandscode für <strong className="text-slate-800">{pendingUser?.name}</strong>
            </div>

            <div className="flex justify-center gap-2">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
                      inputRefs[idx - 1].current?.focus();
                    }
                  }}
                  onPaste={
                    idx === 0
                      ? (e) => {
                          e.preventDefault();
                          const paste = e.clipboardData.getData('text').trim();
                          if (/^\d{5}$/.test(paste)) {
                            setDigits(paste.split(''));
                            verifyAndEnter(paste);
                          }
                        }
                      : undefined
                  }
                  className={`w-12 h-14 text-center text-xl font-bold rounded-2xl border transition-colors focus:outline-none ${
                    codeError
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : digit
                      ? 'border-[#003594] bg-blue-50/40 text-[#003594]'
                      : 'border-slate-200 bg-slate-50 focus:border-[#003594]'
                  }`}
                />
              ))}
            </div>

            {codeError && (
              <div className="text-center text-[12px] font-semibold text-rose-600">{codeError}</div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('login');
                  setDigits(['', '', '', '', '']);
                  setCodeError(null);
                }}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 active:bg-slate-50"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={() => verifyAndEnter(digits.join(''))}
                disabled={digits.some((d) => d === '') || isVerifying}
                className="flex-1 py-3 rounded-2xl bg-[#003594] text-white text-xs font-bold disabled:opacity-40"
              >
                {isVerifying ? 'Prüfen …' : 'Bestätigen'}
              </button>
            </div>
          </div>
        ) : (
          /* Angebot: dieses Geraet kuenftig per Face ID / Touch ID entsperren */
          <div className="mt-7 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#003594] flex items-center justify-center mx-auto">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8V6a2 2 0 0 1 2-2h2" />
                  <path d="M16 4h2a2 2 0 0 1 2 2v2" />
                  <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
                  <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
                  <path d="M9 10h.01" />
                  <path d="M15 10h.01" />
                  <path d="M9 15c.83.67 1.83 1 3 1s2.17-.33 3-1" />
                </svg>
              </div>
              <div className="text-sm font-bold text-slate-900">Schneller entsperren</div>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                Künftig mit Face ID oder Touch ID öffnen, statt den Vorstandscode
                einzugeben. Gilt nur für dieses Gerät.
              </p>
            </div>

            {biometricError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-[12px] leading-relaxed text-rose-800">
                {biometricError}
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                disabled={isEnablingBiometric}
                onClick={async () => {
                  if (!pendingUser) return;
                  setIsEnablingBiometric(true);
                  setBiometricError(null);
                  const res = await Biometric.enable({
                    id: pendingUser.id,
                    name: pendingUser.name,
                    email: pendingUser.email,
                  });
                  setIsEnablingBiometric(false);
                  if (res.ok) {
                    onSuccess({ isAuthenticated: true, isCodeVerified: true, user: pendingUser });
                  } else {
                    setBiometricError(res.error || 'Einrichtung fehlgeschlagen.');
                  }
                }}
                className="w-full py-3.5 rounded-2xl bg-[#003594] text-white text-xs font-bold disabled:opacity-50"
              >
                {isEnablingBiometric ? 'Wird eingerichtet …' : 'Face ID / Touch ID einrichten'}
              </button>

              <button
                type="button"
                onClick={() =>
                  pendingUser &&
                  onSuccess({ isAuthenticated: true, isCodeVerified: true, user: pendingUser })
                }
                className="w-full py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 active:bg-slate-50"
              >
                Später
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
