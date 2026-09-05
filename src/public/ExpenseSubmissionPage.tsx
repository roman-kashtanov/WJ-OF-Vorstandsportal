import React, { useState } from 'react';
import { isValidIban } from '../utils/sepa';
import { prepareFileForStorage } from '../utils/fileStorage';
import { DropzoneFileInput } from '../components/DropzoneFileInput';
import { CheckCircle2, Wallet, UploadCloud, Check } from 'lucide-react';

/**
 * Oeffentliches Formular fuer eine Auslagenerstattung unter /auslage - ohne
 * Anmeldung, aufgebaut wie das Zuschuss-Formular (/antrag) und mit demselben
 * Zugangscode.
 *
 * Wesentlicher Unterschied zum Zuschuss: der Beleg ist PFLICHT und kann
 * nicht nachgereicht werden - ohne Rechnung gibt es nichts zu erstatten und
 * fuer den Schatzmeister nichts zu pruefen. Geschrieben wird ausschliesslich
 * serverseitig ueber /api/subsidy/submit-expense (siehe api/subsidy.ts).
 */

type Step = 'code' | 'form' | 'success';
type ReceiptFileState = { name: string; mimeType?: string; dataUrl: string } | null;

async function postJson(path: string, body: unknown) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const ExpenseSubmissionPage: React.FC = () => {
  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  const [personName, setPersonName] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [purpose, setPurpose] = useState('');
  const [eventName, setEventName] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');

  const [receiptFile, setReceiptFile] = useState<ReceiptFileState>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amountNumber = Number(amount.replace(',', '.'));

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    setCheckingCode(true);
    try {
      const { data } = await postJson('subsidy/verify-code', { code });
      if (data?.ok) {
        setStep('form');
      } else {
        setCodeError('Dieser Zugangscode stimmt nicht.');
      }
    } catch {
      setCodeError('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setCheckingCode(false);
    }
  };

  const handleReceipt = async (file: File) => {
    setReceiptError(null);
    setReceiptBusy(true);
    try {
      const result = await prepareFileForStorage(file);
      if (result.ok === false) {
        setReceiptError(result.error);
        return;
      }
      setReceiptFile({
        name: file.name,
        mimeType: result.file.mimeType,
        dataUrl: result.file.dataUrl,
      });
    } finally {
      setReceiptBusy(false);
    }
  };

  const canSubmit =
    !!personName.trim() &&
    !!personEmail.trim() &&
    isValidIban(iban) &&
    !!purpose.trim() &&
    !!expenseDate &&
    amountNumber > 0 &&
    !!receiptFile &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { ok, data } = await postJson('subsidy/submit-expense', {
        accessCode: code,
        personName: personName.trim(),
        personEmail: personEmail.trim(),
        iban: iban.trim(),
        bic: bic.trim() || undefined,
        accountHolder: accountHolder.trim() || undefined,
        purpose: purpose.trim(),
        eventName: eventName.trim() || undefined,
        expenseDate,
        amount: amountNumber,
        comment: comment.trim() || undefined,
        receiptFile,
      });
      if (!ok) {
        setSubmitError(data?.error || 'Die Auslage konnte nicht gesendet werden.');
        return;
      }
      setStep('success');
    } catch {
      setSubmitError('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full max-w-full min-w-0 block px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]';

  return (
    <div className="min-h-screen bg-slate-50 flex items-start sm:items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-2xl font-extrabold text-[#003594] tracking-tight">WJOF.</div>
          <div className="text-xs text-slate-400 mt-0.5">Auslagenerstattung</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {step === 'code' && (
            <form onSubmit={handleCheckCode} className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#003594] flex items-center justify-center mx-auto">
                <Wallet className="w-6 h-6" strokeWidth={1.75} />
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
                className="w-full py-3 rounded-xl bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                {checkingCode ? 'Wird geprüft…' : 'Weiter'}
              </button>
            </form>
          )}

          {step === 'form' && (
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-sm">
              <div>
                <h1 className="font-bold text-slate-900 text-base">Auslage einreichen</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Für etwas, das du vorgestreckt hast. Die Rechnung bzw. der Beleg muss
                  mit hochgeladen werden.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Dein Name *</label>
                <input
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Vor- und Nachname"
                  className={inputClass}
                />
                <label className="block text-xs font-bold text-slate-700 pt-1">
                  E-Mail-Adresse *
                </label>
                <input
                  required
                  type="email"
                  value={personEmail}
                  onChange={(e) => setPersonEmail(e.target.value)}
                  placeholder="name@example.de"
                  className={inputClass}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Wofür war die Auslage? *
                </label>
                <input
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="z. B. Getränke für den Neujahrsempfang"
                  className={inputClass}
                />
                <label className="block text-xs font-bold text-slate-700 pt-1">
                  Veranstaltung <span className="font-normal text-slate-400">(falls zutreffend)</span>
                </label>
                <input
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="leer lassen, wenn keine Veranstaltung"
                  className={inputClass}
                />
              </div>

              {/* Auf dem Handy untereinander: das native Datumsfeld hat eine
                  Mindestbreite und schob sonst das Betragsfeld aus der Spalte. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Datum des Belegs *
                  </label>
                  <input
                    required
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Betrag (€) *</label>
                  <input
                    required
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Deine Bankverbindung *
                </label>
                <input
                  required
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="IBAN"
                  className={`${inputClass} font-mono ${
                    iban && !isValidIban(iban) ? 'border-rose-300 focus:ring-rose-400' : ''
                  }`}
                />
                {iban && !isValidIban(iban) && (
                  <p className="text-[11px] font-semibold text-rose-700">
                    Diese IBAN ist nicht gültig.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      BIC <span className="text-slate-400">(nur falls bekannt)</span>
                    </label>
                    <input
                      value={bic}
                      onChange={(e) => setBic(e.target.value)}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Kontoinhaber <span className="text-slate-400">(falls abweichend)</span>
                    </label>
                    <input
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Rechnung / Beleg * <span className="font-normal text-slate-400">(Pflicht)</span>
                </label>
                {receiptFile ? (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-900 truncate">
                      {receiptFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReceiptFile(null)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 shrink-0 cursor-pointer"
                    >
                      Ersetzen
                    </button>
                  </div>
                ) : (
                  <DropzoneFileInput
                    accept="image/*,.pdf"
                    disabled={receiptBusy}
                    onFile={handleReceipt}
                    className="block"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5 p-5 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-[#003594] hover:text-[#003594] transition-colors cursor-pointer">
                      <UploadCloud className="w-6 h-6" strokeWidth={1.75} />
                      <span className="text-xs font-semibold">
                        {receiptBusy ? 'Wird verarbeitet…' : 'Foto oder PDF auswählen'}
                      </span>
                    </div>
                  </DropzoneFileInput>
                )}
                {receiptError && (
                  <p className="text-[11px] font-semibold text-rose-700">{receiptError}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kommentar <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className={inputClass}
                />
              </div>

              {submitError && (
                <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-3 rounded-xl bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                {submitting ? 'Wird gesendet…' : 'Auslage einreichen'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="p-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-base">Auslage eingereicht</h1>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Der Schatzmeister prüft deinen Beleg. Sobald der Vorstand die Erstattung
                  beschlossen hat, wird der Betrag auf dein Konto überwiesen.
                </p>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <Check className="w-3.5 h-3.5" strokeWidth={2} />
                Du kannst dieses Fenster jetzt schließen.
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-5">
          Wirtschaftsjunioren Offenbach am Main e.V.
        </p>
      </div>
    </div>
  );
};
