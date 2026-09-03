import React, { useMemo, useState } from 'react';
import { SUBSIDY_CATALOGUE, CATEGORY_LABEL, catalogueEntry } from '../data/subsidyCatalogue';
import { isValidIban, formatIban } from '../utils/sepa';
import { prepareFileForStorage, formatBytes } from '../utils/fileStorage';
import { CheckCircle2, Copy, Check, Landmark } from 'lucide-react';

/**
 * Oeffentliches Zuschuss-Antragsformular unter /antrag - ohne Anmeldung.
 *
 * Eigenstaendige Seite ohne jede Abhaengigkeit von App.tsx/Firebase-Auth:
 * src/main.tsx laedt sie per dynamischem Import anstelle der ganzen
 * authentifizierten App, sobald der Pfad /antrag aufgerufen wird. Absenden
 * geht ausschliesslich ueber die neuen /api/subsidy/*-Endpunkte, die
 * serverseitig mit dem Firestore-Dienstkonto schreiben (siehe api/subsidy.ts).
 */

type Step = 'code' | 'form' | 'success';

async function postJson(path: string, body: unknown) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const SubsidyApplicationPage: React.FC = () => {
  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  const [personName, setPersonName] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [eventKey, setEventKey] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [comment, setComment] = useState('');

  const [uploadNow, setUploadNow] = useState(true);
  const [proofFile, setProofFile] = useState<{ name: string; mimeType?: string; dataUrl: string } | null>(
    null
  );
  const [proofError, setProofError] = useState<string | null>(null);
  const [proofBusy, setProofBusy] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [proofUploadUrl, setProofUploadUrl] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const entry = useMemo(() => catalogueEntry(eventKey), [eventKey]);

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    setCheckingCode(true);
    try {
      const { data } = await postJson('subsidy/verify-code', { code });
      if (data?.ok) {
        setStep('form');
      } else {
        setCodeError('Dieser Zugangscode ist nicht korrekt.');
      }
    } catch {
      setCodeError('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setCheckingCode(false);
    }
  };

  const handleProofSelected = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setProofError(null);
    setProofBusy(true);
    try {
      const result = await prepareFileForStorage(file);
      if (result.ok === false) {
        setProofError(result.error);
        return;
      }
      setProofFile({ name: file.name, mimeType: result.file.mimeType, dataUrl: result.file.dataUrl });
    } finally {
      setProofBusy(false);
    }
  };

  const ibanValid = !iban || isValidIban(iban);
  const canSubmit =
    personName.trim().length > 1 && iban.trim().length > 0 && isValidIban(iban) && !!eventKey;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { ok, data } = await postJson('subsidy/submit', {
        accessCode: code,
        personName: personName.trim(),
        personEmail: personEmail.trim() || undefined,
        iban: iban.trim(),
        bic: bic.trim() || undefined,
        accountHolder: accountHolder.trim() || undefined,
        eventKey,
        eventDate: eventDate || undefined,
        comment: comment.trim() || undefined,
        proofFile: uploadNow && proofFile ? proofFile : undefined,
      });
      if (!ok) {
        setSubmitError(data?.error || 'Der Antrag konnte nicht gesendet werden.');
        return;
      }
      setProofUploadUrl(data?.proofUploadUrl);
      setStep('success');
    } catch {
      setSubmitError('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!proofUploadUrl) return;
    try {
      await navigator.clipboard.writeText(proofUploadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-start sm:items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-2xl font-extrabold text-[#003594] tracking-tight">WJOF.</div>
          <div className="text-xs text-slate-400 mt-0.5">Zuschuss-Antrag</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {step === 'code' && (
            <form onSubmit={handleCheckCode} className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#003594] flex items-center justify-center mx-auto">
                <Landmark className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div className="text-center">
                <h1 className="font-bold text-slate-900 text-base">Zugangscode</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Bitte den Zugangscode eingeben, den du vom Vorstand erhalten hast.
                </p>
              </div>
              <input
                type="text"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Zugangscode"
                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594]"
              />
              {codeError && (
                <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center">
                  {codeError}
                </div>
              )}
              <button
                type="submit"
                disabled={!code.trim() || checkingCode}
                className="w-full py-3 bg-[#003594] hover:bg-[#00266B] disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                {checkingCode ? 'Prüfe…' : 'Weiter'}
              </button>
            </form>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <h1 className="font-bold text-slate-900 text-base text-center">Zuschuss beantragen</h1>

              <div>
                <label className="font-bold text-slate-900 text-xs block mb-1.5">Name *</label>
                <input
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-900 text-xs block mb-1.5">
                  E-Mail (optional, für Rückfragen und den Nachweis-Link)
                </label>
                <input
                  type="email"
                  value={personEmail}
                  onChange={(e) => setPersonEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-900 text-xs block mb-1.5">
                  Wofür? *
                </label>
                <select
                  required
                  value={eventKey}
                  onChange={(e) => setEventKey(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                >
                  <option value="">Bitte auswählen…</option>
                  {SUBSIDY_CATALOGUE.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label} ({CATEGORY_LABEL[c.category]})
                    </option>
                  ))}
                </select>
                {entry?.hint && (
                  <p className="text-[11px] text-slate-400 mt-1">{entry.hint}</p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-900 text-xs block mb-1.5">
                  Datum der Veranstaltung (optional)
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>

              <div className="pt-1">
                <div className="font-bold text-slate-900 text-xs mb-1.5">Bankverbindung *</div>
                <input
                  required
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="IBAN"
                  className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl font-mono text-base focus:outline-none focus:ring-2 mb-2 ${
                    ibanValid ? 'border-slate-200 focus:ring-[#003594]' : 'border-rose-300 focus:ring-rose-400'
                  }`}
                />
                {!ibanValid && (
                  <p className="text-[11px] font-semibold text-rose-700 mb-2">Diese IBAN ist ungültig.</p>
                )}
                <input
                  value={bic}
                  onChange={(e) => setBic(e.target.value)}
                  placeholder="BIC (optional)"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base focus:outline-none focus:ring-2 focus:ring-[#003594] mb-2"
                />
                <input
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  placeholder="Kontoinhaber, falls abweichend"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-900 text-xs block mb-1.5">
                  Kommentar (optional)
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-xs">Nachweisfoto</span>
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <input
                      type="checkbox"
                      checked={uploadNow}
                      onChange={(e) => setUploadNow(e.target.checked)}
                      className="rounded text-[#003594]"
                    />
                    Jetzt hochladen
                  </label>
                </div>

                {uploadNow ? (
                  <>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => handleProofSelected(e.target.files)}
                      className="w-full text-xs"
                    />
                    {proofBusy && <p className="text-[11px] text-slate-400 mt-1">Wird verarbeitet…</p>}
                    {proofError && (
                      <p className="text-[11px] font-semibold text-rose-700 mt-1">{proofError}</p>
                    )}
                    {proofFile && (
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                        {proofFile.name} bereit
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    Du bekommst nach dem Absenden einen persönlichen Link, mit dem du den Nachweis
                    später nachreichen kannst.
                  </p>
                )}
              </div>

              {submitError && (
                <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="w-full py-3 bg-[#003594] hover:bg-[#00266B] disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                {submitting ? 'Wird gesendet…' : 'Antrag absenden'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="p-6 space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-slate-900 text-base">Antrag gesendet</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Danke, dein Zuschuss-Antrag ist beim Vorstand eingegangen und wird geprüft.
              </p>

              {proofUploadUrl && (
                <div className="text-left bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] font-bold text-amber-900">
                    Bitte diesen Link aufbewahren – damit kannst du später deinen Nachweis
                    nachreichen:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={proofUploadUrl}
                      className="flex-1 px-2.5 py-2 bg-white border border-amber-300 rounded-lg text-[11px] font-mono text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={copyLink}
                      className="p-2 bg-white border border-amber-300 rounded-lg text-amber-800 shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {personEmail && (
                    <p className="text-[11px] text-amber-800">
                      Der Link wurde außerdem an {personEmail} gesendet.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
