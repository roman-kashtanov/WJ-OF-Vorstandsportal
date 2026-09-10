import React, { useEffect, useRef, useState } from 'react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { exchangeInviteToken, requestPasswordReset } from '../utils/accountService';
import { InstallGuide, detectPlatform, isRunningAsApp } from '../components/InstallGuide';
import { KeyRound, CheckCircle2, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';

/**
 * /passwort - Passwort festlegen (Link aus der Einladung, ?t=...) oder
 * zuruecksetzen (Link aus "Passwort vergessen", ?oobCode=...).
 *
 * Das Passwort geht direkt vom Browser zu Firebase (confirmPasswordReset),
 * nie ueber den eigenen Server. Danach wird prominent erklaert, wie das
 * Portal als App installiert wird - auf dem iPhone oeffnet sich der Link aus
 * der E-Mail in Safari, nicht in der installierten App.
 */

type Phase = 'loading' | 'form' | 'saving' | 'done' | 'error';

const MIN_LENGTH = 8;

export const PasswordSetupPage: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [isInvite, setIsInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [oobCode, setOobCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [alreadyUsed, setAlreadyUsed] = useState(false);

  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [resetEmail, setResetEmail] = useState('');
  const [resetState, setResetState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [resetError, setResetError] = useState<string | null>(null);

  // StrictMode fuehrt Effekte im Entwicklungsmodus doppelt aus - der Link
  // darf aber nur einmal eingeloest werden (danach ist die Adresse bereinigt).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('t');
    const directCode = params.get('oobCode');
    // Code nicht in Verlauf und Screenshots stehen lassen
    window.history.replaceState({}, document.title, '/passwort');

    void (async () => {
      let code = directCode;
      if (inviteToken) {
        setIsInvite(true);
        const exchanged = await exchangeInviteToken(inviteToken);
        if (exchanged.ok === false) {
          setError(exchanged.error);
          setAlreadyUsed(!!exchanged.alreadyUsed);
          setPhase('error');
          return;
        }
        code = exchanged.oobCode;
      }

      if (!code) {
        setError('Dieser Link ist unvollständig. Bitte den Link aus der E-Mail vollständig öffnen.');
        setPhase('error');
        return;
      }

      try {
        const mail = await verifyPasswordResetCode(auth, code);
        setEmail(mail);
        setResetEmail(mail);
        setOobCode(code);
        setPhase('form');
      } catch (err: any) {
        setError(
          err?.code === 'auth/expired-action-code'
            ? 'Dieser Link ist abgelaufen. Unten kannst du einen neuen anfordern.'
            : 'Dieser Link ist ungültig oder wurde bereits benutzt. Unten kannst du einen neuen anfordern.'
        );
        setPhase('error');
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (password.length < MIN_LENGTH) {
      setFormError(`Das Passwort braucht mindestens ${MIN_LENGTH} Zeichen.`);
      return;
    }
    if (password !== repeat) {
      setFormError('Die beiden Passwörter stimmen nicht überein.');
      return;
    }

    setPhase('saving');
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setPassword('');
      setRepeat('');
      setPhase('done');
    } catch (err: any) {
      const code = err?.code || '';
      setPhase(code === 'auth/expired-action-code' || code === 'auth/invalid-action-code' ? 'error' : 'form');
      if (code === 'auth/weak-password') {
        setFormError('Dieses Passwort ist zu schwach. Bitte ein längeres wählen.');
      } else if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setError('Der Link ist inzwischen abgelaufen. Unten kannst du einen neuen anfordern.');
      } else if (code === 'auth/network-request-failed') {
        setFormError('Keine Verbindung. Bitte Internet prüfen und erneut versuchen.');
      } else {
        setFormError(err?.message || 'Das Passwort konnte nicht gespeichert werden.');
      }
    }
  };

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetState('busy');
    const result = await requestPasswordReset(resetEmail.trim());
    if (result.ok === false) {
      setResetError(result.error);
      setResetState('idle');
      return;
    }
    setResetState('sent');
  };

  const platform = detectPlatform();
  const inputClass =
    'w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]';

  return (
    <div className="min-h-dvh bg-slate-100 flex items-start sm:items-center justify-center wj-overlay">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 animate-in fade-in zoom-in-95">
        <div className="text-center">
          <div className="text-lg font-extrabold tracking-tight text-[#003594]">WJOF.</div>
          <div className="mt-1 text-[11px] text-slate-400">Vorstandsportal</div>
        </div>

        {phase === 'loading' && (
          <div className="py-12 flex flex-col items-center gap-3 text-center animate-in fade-in">
            <Loader2 className="w-7 h-7 text-[#003594] animate-spin" />
            <p className="text-sm text-slate-500">Link wird geprüft …</p>
          </div>
        )}

        {(phase === 'form' || phase === 'saving') && (
          <form key="form" onSubmit={handleSubmit} className="mt-6 space-y-4 animate-in fade-in">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#003594] flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="text-base font-bold text-slate-900">
                {isInvite ? 'Willkommen! Lege dein Passwort fest' : 'Neues Passwort festlegen'}
              </h1>
              <p className="text-[13px] text-slate-500">
                für <strong className="text-slate-800">{email}</strong>
              </p>
            </div>

            {/* Fuer Passwort-Manager: zu welchem Konto das neue Passwort gehoert */}
            <input type="email" autoComplete="username" value={email} readOnly hidden />

            <div className="space-y-2">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Neues Passwort (mind. ${MIN_LENGTH} Zeichen)`}
                  className={`${inputClass} pr-11`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                placeholder="Passwort wiederholen"
                className={inputClass}
              />
            </div>

            {formError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[12px] font-semibold text-rose-800">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={phase === 'saving' || !password || !repeat}
              className="w-full py-3.5 rounded-2xl bg-[#003594] hover:bg-[#00266B] text-white text-sm font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
            >
              {phase === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
              {phase === 'saving' ? 'Wird gespeichert …' : 'Passwort speichern'}
            </button>
          </form>
        )}

        {phase === 'done' && (
          <div key="done" className="mt-6 space-y-5 animate-in fade-in slide-in-from-bottom-2">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-in zoom-in-90">
                <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <h1 className="text-base font-bold text-slate-900">Passwort gespeichert</h1>
              <p className="text-[13px] text-slate-500">
                Du meldest dich ab jetzt mit <strong className="text-slate-800">{email}</strong> und
                diesem Passwort an.
              </p>
            </div>

            {!isRunningAsApp() && platform !== 'desktop' && (
              <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 space-y-3">
                <div className="text-sm font-bold text-amber-900">
                  Jetzt noch: Als App auf den Home-Bildschirm legen
                </div>
                <p className="text-[12px] leading-relaxed text-amber-900">
                  Nur so bekommst du Benachrichtigungen bei neuen Beschlüssen und kannst mit Face ID
                  entsperren.{' '}
                  {platform === 'ios' &&
                    'Wichtig: Danach das Portal über das neue Symbol öffnen und dort anmelden – die Anmeldung in Safari gilt nicht für die App.'}
                </p>
                <div className="bg-white rounded-xl p-3">
                  <InstallGuide platform={platform} />
                </div>
              </div>
            )}

            <a
              href="/"
              className="block w-full py-3.5 rounded-2xl bg-[#003594] hover:bg-[#00266B] text-white text-sm font-bold text-center transition-colors"
            >
              {platform === 'desktop' || isRunningAsApp() ? 'Zur Anmeldung' : 'Hier im Browser anmelden'}
            </a>
          </div>
        )}

        {phase === 'error' && (
          <div key="error" className="mt-6 space-y-4 animate-in fade-in">
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" strokeWidth={2} />
              <p className="text-[13px] leading-relaxed text-amber-900">{error}</p>
            </div>

            {alreadyUsed ? (
              <a
                href="/"
                className="block w-full py-3.5 rounded-2xl bg-[#003594] hover:bg-[#00266B] text-white text-sm font-bold text-center"
              >
                Zur Anmeldung
              </a>
            ) : resetState === 'sent' ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-[13px] leading-relaxed text-emerald-900">
                Wenn die Adresse im Portal freigegeben ist, ist ein neuer Link unterwegs. Er gilt 1
                Stunde – bitte auch im Spam-Ordner nachsehen.
              </div>
            ) : (
              <form onSubmit={handleRequestNewLink} className="space-y-2.5">
                <label className="block text-[12px] font-semibold text-slate-600">Neuen Link anfordern</label>
                <input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Deine E-Mail-Adresse"
                  className={inputClass}
                  required
                />
                {resetError && <p className="text-[12px] font-semibold text-rose-700">{resetError}</p>}
                <button
                  type="submit"
                  disabled={resetState === 'busy' || !resetEmail.trim()}
                  className="w-full py-3 rounded-2xl bg-[#003594] hover:bg-[#00266B] text-white text-sm font-bold disabled:opacity-40"
                >
                  {resetState === 'busy' ? 'Wird gesendet …' : 'Link per E-Mail senden'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
