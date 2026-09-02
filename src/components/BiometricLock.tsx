import React, { useEffect, useState } from 'react';
import { Biometric } from '../utils/biometric';

interface BiometricLockProps {
  isOpen: boolean;
  memberName: string;
  onUnlocked: () => void;
  /** Entsperrung verwerfen und stattdessen neu anmelden. */
  onLogout: () => void;
}

/**
 * Sperrbildschirm beim Oeffnen der App.
 *
 * Die Anmeldung bleibt dauerhaft bestehen (kein staendiges Code-Eintippen),
 * dafuer schuetzt Face ID / Touch ID den Zugriff auf dem jeweiligen Geraet.
 */
export const BiometricLock: React.FC<BiometricLockProps> = ({
  isOpen,
  memberName,
  onUnlocked,
  onLogout,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlock = async () => {
    setIsChecking(true);
    setError(null);
    const res = await Biometric.verify();
    setIsChecking(false);
    if (res.ok) {
      onUnlocked();
    } else {
      setError(res.error || 'Entsperrung fehlgeschlagen.');
    }
  };

  // Beim Oeffnen direkt einmal abfragen, damit die App sich wie eine
  // native App anfuehlt und kein zusaetzlicher Tipp noetig ist.
  useEffect(() => {
    if (isOpen) void unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl w-full max-w-sm p-7 shadow-2xl text-center">
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
            <path d="M4 8V6a2 2 0 0 1 2-2h2" />
            <path d="M16 4h2a2 2 0 0 1 2 2v2" />
            <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
            <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
            <path d="M9 10h.01" />
            <path d="M15 10h.01" />
            <path d="M9 15c.83.67 1.83 1 3 1s2.17-.33 3-1" />
          </svg>
        </div>

        <div className="mt-4 text-sm font-bold text-slate-900">{memberName}</div>
        <p className="mt-1 text-[12px] text-slate-500">
          {isChecking ? 'Warte auf Face ID / Touch ID …' : 'Zum Fortfahren entsperren'}
        </p>

        {error && (
          <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-[12px] leading-relaxed text-rose-800">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={unlock}
          disabled={isChecking}
          className="mt-5 w-full py-3.5 rounded-2xl bg-[#003594] text-white text-xs font-bold disabled:opacity-50"
        >
          {isChecking ? 'Prüfe …' : 'Entsperren'}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="mt-2 w-full py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 active:bg-slate-50"
        >
          Mit anderem Konto anmelden
        </button>
      </div>
    </div>
  );
};
