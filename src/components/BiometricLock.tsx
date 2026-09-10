import React, { useEffect, useRef, useState } from 'react';
import { BoardMember, SecuritySettings } from '../types';
import { Biometric } from '../utils/biometric';
import { verifyPasscode } from '../utils/security';
import { AppStorage } from '../utils/storage';

/** Danach wird abgemeldet - sonst liesse sich der 5-stellige Code durchprobieren. */
const MAX_CODE_ATTEMPTS = 5;

interface BiometricLockProps {
  isOpen: boolean;
  member: BoardMember;
  securitySettings: SecuritySettings;
  onUnlocked: () => void;
  /** Entsperrung verwerfen und stattdessen neu anmelden. */
  onLogout: () => void;
}

/**
 * Sperrbildschirm beim Oeffnen der App und beim Zurueckkehren aus dem
 * Hintergrund (siehe useMembers.ts).
 *
 * Die Anmeldung bleibt dauerhaft bestehen (kein erneutes Google-Login),
 * entsperrt wird mit Face ID / Touch ID oder dem Vorstandscode. Wer vom Code
 * befreit ist und kein Face ID eingerichtet hat, muss sich neu anmelden.
 */
export const BiometricLock: React.FC<BiometricLockProps> = ({
  isOpen,
  member,
  securitySettings,
  onUnlocked,
  onLogout,
}) => {
  const biometricEnabled = Biometric.isEnabled();
  const needsCode = !AppStorage.isExemptFromCode(member, securitySettings);

  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const finish = () => {
    setCode('');
    setAttempts(0);
    setError(null);
    onUnlocked();
  };

  const unlockBiometric = async () => {
    setIsChecking(true);
    setError(null);
    const res = await Biometric.verify();
    setIsChecking(false);
    if (res.ok) {
      finish();
    } else {
      setError(res.error || 'Entsperrung fehlgeschlagen.');
    }
  };

  // Beim Oeffnen direkt Face ID abfragen, damit kein zusaetzlicher Tipp
  // noetig ist. Ohne Face ID gleich ins Codefeld springen.
  useEffect(() => {
    if (!isOpen) return;
    setCode('');
    setError(null);
    setAttempts(0);
    if (biometricEnabled) void unlockBiometric();
    else if (needsCode) setTimeout(() => codeRef.current?.focus(), 150);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const submitCode = async (value: string) => {
    if (value.length !== 5 || isVerifying) return;
    setIsVerifying(true);
    const ok = await verifyPasscode(value, securitySettings);
    setIsVerifying(false);
    if (ok) {
      finish();
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    setCode('');
    if (next >= MAX_CODE_ATTEMPTS) {
      onLogout();
      return;
    }
    const left = MAX_CODE_ATTEMPTS - next;
    setError(`Code ungültig. Noch ${left} ${left === 1 ? 'Versuch' : 'Versuche'}, danach wirst du abgemeldet.`);
    codeRef.current?.focus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-200 bg-slate-900/95 backdrop-blur-md flex items-center justify-center wj-overlay animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm p-7 shadow-2xl text-center animate-in fade-in zoom-in-95">
        <div className="text-lg font-extrabold tracking-tight text-[#003594]">WJOF.</div>
        <div className="mt-1 text-[11px] text-slate-400">Vorstandsportal</div>

        <div className="mt-7 w-14 h-14 rounded-2xl bg-blue-50 text-[#003594] flex items-center justify-center mx-auto">
          <svg
            className="w-7 h-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>

        <div className="mt-4 text-sm font-bold text-slate-900">{member.name}</div>
        <p className="mt-1 text-[12px] text-slate-500">
          {isChecking ? 'Warte auf Face ID / Touch ID …' : 'Das Portal ist gesperrt.'}
        </p>

        {biometricEnabled && (
          <button
            type="button"
            onClick={unlockBiometric}
            disabled={isChecking}
            className="mt-5 w-full py-3.5 rounded-2xl bg-[#003594] text-white text-xs font-bold disabled:opacity-50"
          >
            {isChecking ? 'Prüfe …' : 'Mit Face ID / Touch ID entsperren'}
          </button>
        )}

        {needsCode && (
          <div className="mt-5 space-y-2">
            <label htmlFor="lock-code" className="block text-[12px] font-semibold text-slate-600">
              {biometricEnabled ? 'oder Vorstandscode eingeben' : 'Vorstandscode eingeben'}
            </label>
            <input
              id="lock-code"
              ref={codeRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              maxLength={5}
              value={code}
              disabled={isVerifying}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                setCode(value);
                setError(null);
                if (value.length === 5) void submitCode(value);
              }}
              className="w-full py-3 text-center text-2xl font-bold tracking-[0.6em] rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#003594] disabled:opacity-50"
            />
          </div>
        )}

        {!biometricEnabled && !needsCode && (
          <>
            <p className="mt-5 text-[12px] text-slate-500 leading-relaxed">
              Bitte zum Fortfahren neu anmelden. Mit Face ID / Touch ID geht das künftig schneller
              (einrichtbar beim nächsten Anmelden).
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="mt-4 w-full py-3.5 rounded-2xl bg-[#003594] text-white text-xs font-bold"
            >
              Neu anmelden
            </button>
          </>
        )}

        {error && (
          <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-[12px] leading-relaxed text-rose-800">
            {error}
          </div>
        )}

        {(biometricEnabled || needsCode) && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 w-full py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 active:bg-slate-50"
          >
            Mit anderem Konto anmelden
          </button>
        )}
      </div>
    </div>
  );
};
