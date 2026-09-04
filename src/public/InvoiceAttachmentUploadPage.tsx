import React, { useEffect, useState } from 'react';
import { DropzoneFileInput } from '../components/DropzoneFileInput';
import { prepareFileForStorage } from '../utils/fileStorage';
import { CheckCircle2, XCircle, UploadCloud, Receipt } from 'lucide-react';

/**
 * Seite unter /beleg?t=<token> - Rechnung/Beleg zu einem Beschluss
 * nachreichen, ohne Anmeldung. Siehe api/invoice.ts
 * (handleGetInvoiceAttachmentStatus/handleSubmitInvoiceAttachment) und
 * api/invoiceAttachmentToken.ts fuer die serverseitige Validierung -
 * strukturell 1:1 nach dem Vorbild von SubsidyProofUploadPage.tsx, nur mit
 * einem vollstaendigen Rechnungsformular statt nur einem Datei-Upload.
 */

type State = 'loading' | 'invalid' | 'ready' | 'done';
type ProofFileState = { name: string; mimeType?: string; dataUrl: string } | null;

const CATEGORIES = [
  'Events & Projekte',
  'Marketing & PR',
  'IT, Web & Lizenzen',
  'Verwaltung & IHK',
  'Konferenzen (LAKO/BUKO)',
  'Sonstiges',
];

async function getJson(path: string) {
  const res = await fetch(`/api/${path}`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function postJson(path: string, body: unknown) {
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export const InvoiceAttachmentUploadPage: React.FC = () => {
  const token = new URLSearchParams(window.location.search).get('t') || '';
  const [state, setState] = useState<State>('loading');
  const [resolutionLabel, setResolutionLabel] = useState('');

  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Sonstiges');
  const [submittedByName, setSubmittedByName] = useState('');

  const [file, setFile] = useState<ProofFileState>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileBusy, setFileBusy] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    getJson(`invoice/attachment?t=${encodeURIComponent(token)}`).then(({ ok, data }) => {
      if (!ok || !data?.ok) {
        setState('invalid');
        return;
      }
      setResolutionLabel(
        `${data.resolutionNumber || ''}${data.resolutionTitle ? ` – ${data.resolutionTitle}` : ''}`
      );
      setState('ready');
    });
  }, [token]);

  const handleFile = async (f: File) => {
    setFileError(null);
    setFileBusy(true);
    try {
      const result = await prepareFileForStorage(f);
      if (result.ok === false) {
        setFileError(result.error);
        return;
      }
      setFile({ name: f.name, mimeType: result.file.mimeType, dataUrl: result.file.dataUrl });
    } finally {
      setFileBusy(false);
    }
  };

  const amountNumber = Number(amount.replace(',', '.'));
  const canSubmit =
    title.trim().length > 0 &&
    vendor.trim().length > 0 &&
    amountNumber > 0 &&
    !!date &&
    !!file;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { ok, data } = await postJson('invoice/attachment', {
        token,
        title: title.trim(),
        vendor: vendor.trim(),
        amount: amountNumber,
        date,
        category,
        submittedByName: submittedByName.trim() || undefined,
        file,
      });
      if (!ok) {
        setSubmitError(data?.error || 'Der Beleg konnte nicht gesendet werden.');
        return;
      }
      setState('done');
    } catch {
      setSubmitError('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-start sm:items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-2xl font-extrabold text-[#003594] tracking-tight">WJOF.</div>
          <div className="text-xs text-slate-400 mt-0.5">Beleg nachreichen</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {state === 'loading' && <p className="text-sm text-slate-500 text-center p-6">Lade…</p>}

          {state === 'invalid' && (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-slate-900 text-base">Link ungültig</h1>
              <p className="text-xs text-slate-500">
                Dieser Link ist abgelaufen oder ungültig. Bitte den Vorstand kontaktieren.
              </p>
            </div>
          )}

          {state === 'ready' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#003594] flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-slate-900 text-base text-center">Beleg nachreichen</h1>
              {resolutionLabel && (
                <p className="text-xs text-slate-500 text-center">Zu Beschluss: {resolutionLabel}</p>
              )}

              <div>
                <label className="font-bold text-slate-900 text-xs block mb-1.5">Titel *</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z. B. Übernachtung LAKO"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-900 text-xs block mb-1.5">
                  Lieferant / Anbieter *
                </label>
                <input
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-bold text-slate-900 text-xs block mb-1.5">Betrag (€) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-900 text-xs block mb-1.5">Datum *</label>
                  <input
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-900 text-xs block mb-1.5">Kategorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-900 text-xs block mb-1.5">
                  Dein Name <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  value={submittedByName}
                  onChange={(e) => setSubmittedByName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-900 text-xs block mb-1.5">Beleg-Datei *</label>
                <DropzoneFileInput accept="image/*,.pdf" disabled={fileBusy} onFile={handleFile}>
                  <UploadCloud className="w-5 h-5 mx-auto text-slate-400 mb-1" strokeWidth={1.75} />
                  <span className="text-[11px] text-slate-500">
                    Datei auswählen oder hierher ziehen
                  </span>
                </DropzoneFileInput>
                {fileBusy && <p className="text-[11px] text-slate-400 mt-1">Wird verarbeitet…</p>}
                {fileError && (
                  <p className="text-[11px] font-semibold text-rose-700 mt-1">{fileError}</p>
                )}
                {file && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">{file.name} bereit</p>
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
                {submitting ? 'Wird gesendet…' : 'Beleg senden'}
              </button>
            </form>
          )}

          {state === 'done' && (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-slate-900 text-base">Beleg gesendet</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Danke, dein Beleg ist beim Vorstand eingegangen.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
