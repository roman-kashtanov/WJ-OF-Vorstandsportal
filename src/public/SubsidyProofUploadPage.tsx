import React, { useEffect, useState } from 'react';
import { prepareFileForStorage } from '../utils/fileStorage';
import { DropzoneFileInput } from '../components/DropzoneFileInput';
import { CheckCircle2, XCircle, Upload, UploadCloud } from 'lucide-react';

/**
 * Seite unter /nachweis?t=<token> - Teilnahme- und Kostennachweis
 * nachtraeglich hochladen, ohne Anmeldung. Beide Nachweise sind
 * unabhaengig voneinander (ein fehlender Nachweis blockiert den anderen
 * nicht). Siehe api/subsidy.ts (handleGetProofStatus/handleUploadProof)
 * und api/subsidyProofToken.ts fuer die serverseitige Validierung.
 */

type PageState = 'loading' | 'invalid' | 'locked' | 'ready';
type ProofState = 'offen' | 'hochgeladen';
type ProofType = 'attendance' | 'cost';
type StagedFile = { name: string; mimeType?: string; dataUrl: string } | null;

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

interface ProofSectionProps {
  title: string;
  proofType: ProofType;
  token: string;
  state: ProofState;
  onUploaded: () => void;
}

const ProofSection: React.FC<ProofSectionProps> = ({ title, proofType, token, state, onUploaded }) => {
  const [file, setFile] = useState<StagedFile>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state === 'hochgeladen') {
    return (
      <div className="text-left bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" strokeWidth={1.75} />
        <p className="text-xs font-semibold text-emerald-800">{title} liegt bereits vor.</p>
      </div>
    );
  }

  const handleFile = async (f: File) => {
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
      const { ok, data } = await postJson('subsidy/proof', { token, file, proofType });
      if (!ok) {
        setSubmitError(data?.error || 'Der Nachweis konnte nicht gespeichert werden.');
        return;
      }
      onUploaded();
    } catch {
      setSubmitError('Verbindung fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-left space-y-2">
      <p className="font-bold text-slate-900 text-xs">{title}</p>
      <DropzoneFileInput accept="image/*,.pdf" disabled={busy} onFile={handleFile}>
        <UploadCloud className="w-5 h-5 mx-auto text-slate-400 mb-1" strokeWidth={1.75} />
        <span className="text-[11px] text-slate-500">Datei auswählen oder hierher ziehen</span>
      </DropzoneFileInput>
      {busy && <p className="text-[11px] text-slate-400">Wird verarbeitet…</p>}
      {fileError && <p className="text-[11px] font-semibold text-rose-700">{fileError}</p>}
      {file && <p className="text-[11px] text-emerald-700 font-semibold">{file.name} bereit</p>}
      {submitError && <p className="text-[11px] font-semibold text-rose-700">{submitError}</p>}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!file || submitting}
        className="w-full py-2.5 bg-[#003594] hover:bg-[#00266B] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all cursor-pointer"
      >
        {submitting ? 'Wird gesendet…' : `${title} senden`}
      </button>
    </div>
  );
};

export const SubsidyProofUploadPage: React.FC = () => {
  const token = new URLSearchParams(window.location.search).get('t') || '';
  const [state, setState] = useState<PageState>('loading');
  const [info, setInfo] = useState<{ eventName?: string; personName?: string } | null>(null);
  const [attendanceState, setAttendanceState] = useState<ProofState>('offen');
  const [costState, setCostState] = useState<ProofState>('offen');

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
      setAttendanceState(data.attendanceProofState === 'hochgeladen' ? 'hochgeladen' : 'offen');
      setCostState(data.costProofState === 'hochgeladen' ? 'hochgeladen' : 'offen');
      setState(data.locked ? 'locked' : 'ready');
    });
  }, [token]);

  const allComplete = attendanceState === 'hochgeladen' && costState === 'hochgeladen';

  return (
    <div className="min-h-screen bg-slate-50 flex items-start sm:items-center justify-center p-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-2xl font-extrabold text-[#003594] tracking-tight">WJOF.</div>
          <div className="text-xs text-slate-400 mt-0.5">Nachweis nachreichen</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          {state === 'loading' && <p className="text-sm text-slate-500 text-center">Lade…</p>}

          {state === 'invalid' && (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-slate-900 text-base">Link ungültig</h1>
              <p className="text-xs text-slate-500">
                Dieser Link ist abgelaufen oder ungültig. Bitte den Vorstand kontaktieren.
              </p>
            </div>
          )}

          {state === 'locked' && (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h1 className="font-bold text-slate-900 text-base">Bereits in Bearbeitung</h1>
              <p className="text-xs text-slate-500">
                {info?.personName ? `${info.personName}s ` : 'Dieser '}Antrag
                {info?.eventName ? ` für "${info.eventName}"` : ''} wird bereits weiter
                bearbeitet. Über diesen Link können keine Nachweise mehr geändert werden. Bitte
                den Vorstand kontaktieren, falls noch etwas fehlt.
              </p>
            </div>
          )}

          {state === 'ready' && (
            <>
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#003594] flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <h1 className="font-bold text-slate-900 text-base">Nachweise hochladen</h1>
                <p className="text-xs text-slate-500">
                  {info?.personName && `Für ${info.personName}`}
                  {info?.eventName && ` – ${info.eventName}`}
                </p>
              </div>

              {allComplete ? (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <p className="text-xs text-slate-500">
                    Beide Nachweise liegen vor. Danke, der Vorstand wurde informiert.
                  </p>
                </div>
              ) : (
                <>
                  <ProofSection
                    title="Teilnahmenachweis"
                    proofType="attendance"
                    token={token}
                    state={attendanceState}
                    onUploaded={() => setAttendanceState('hochgeladen')}
                  />
                  <ProofSection
                    title="Kostennachweis (Rechnung)"
                    proofType="cost"
                    token={token}
                    state={costState}
                    onUploaded={() => setCostState('hochgeladen')}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
