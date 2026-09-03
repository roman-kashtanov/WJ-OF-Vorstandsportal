import React, { useEffect, useState } from 'react';
import { prepareFileForStorage } from '../utils/fileStorage';
import { CheckCircle2, XCircle, Upload } from 'lucide-react';

/**
 * Seite unter /nachweis?t=<token> - Nachweisfoto nachtraeglich hochladen,
 * ohne Anmeldung. Siehe api/subsidy.ts (handleGetProofStatus/handleUploadProof)
 * und api/subsidyProofToken.ts fuer die serverseitige Validierung.
 */

type State = 'loading' | 'invalid' | 'locked' | 'open' | 'done';

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

export const SubsidyProofUploadPage: React.FC = () => {
  const token = new URLSearchParams(window.location.search).get('t') || '';
  const [state, setState] = useState<State>('loading');
  const [info, setInfo] = useState<{ eventName?: string; personName?: string } | null>(null);

  const [file, setFile] = useState<{ name: string; mimeType?: string; dataUrl: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    getJson(`subsidy/proof?t=${encodeURIComponent(token)}`).then(({ ok, data }) => {
      if (!ok || !data?.ok) {
        setState('invalid');
        return;
      }
      setInfo({ eventName: data.eventName, personName: data.personName });
      setState(data.locked ? 'locked' : 'open');
    });
  }, [token]);

  const handleFileSelected = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setFileError(null);
    setBusy(true);
    try {
      const result = await prepareFileForStorage(f);
      if (result.ok === false) {
        setFileError(result.error);
        return;
      }
      setFile({ name: f.name, mimeType: result.file.mimeType, dataUrl: result.file.dataUrl });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const { ok, data } = await postJson('subsidy/proof', { token, file });
      if (!ok) {
        setSubmitError(data?.error || 'Der Nachweis konnte nicht gespeichert werden.');
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
          <div className="text-xs text-slate-400 mt-0.5">Nachweis nachreichen</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 text-center space-y-4">
          {state === 'loading' && <p className="text-sm text-slate-500">Lade…</p>}

          {state === 'invalid' && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-slate-900 text-base">Link ungültig</h1>
              <p className="text-xs text-slate-500">
                Dieser Link ist abgelaufen oder ungültig. Bitte den Vorstand kontaktieren.
              </p>
            </>
          )}

          {state === 'locked' && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-slate-900 text-base">Bereits in Bearbeitung</h1>
              <p className="text-xs text-slate-500">
                {info?.personName ? `${info.personName}s ` : 'Dieser '}Antrag
                {info?.eventName ? ` für "${info.eventName}"` : ''} wird bereits weiter
                bearbeitet. Über diesen Link kann kein Nachweis mehr geändert werden. Bitte den
                Vorstand kontaktieren, falls noch etwas fehlt.
              </p>
            </>
          )}

          {state === 'open' && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#003594] flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-slate-900 text-base">Nachweis hochladen</h1>
              <p className="text-xs text-slate-500">
                {info?.personName && `Für ${info.personName}`}
                {info?.eventName && ` – ${info.eventName}`}
              </p>

              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileSelected(e.target.files)}
                className="w-full text-xs"
              />
              {busy && <p className="text-[11px] text-slate-400">Wird verarbeitet…</p>}
              {fileError && <p className="text-[11px] font-semibold text-rose-700">{fileError}</p>}
              {file && (
                <p className="text-[11px] text-emerald-700 font-semibold">{file.name} bereit</p>
              )}
              {submitError && (
                <p className="text-[11px] font-semibold text-rose-700">{submitError}</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!file || submitting}
                className="w-full py-3 bg-[#003594] hover:bg-[#00266B] disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                {submitting ? 'Wird gesendet…' : 'Nachweis senden'}
              </button>
            </>
          )}

          {state === 'done' && (
            <>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-slate-900 text-base">Nachweis gesendet</h1>
              <p className="text-xs text-slate-500">Danke, der Vorstand wurde informiert.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
