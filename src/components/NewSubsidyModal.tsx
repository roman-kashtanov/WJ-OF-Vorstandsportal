import React, { useState, useRef, useMemo } from 'react';
import {
  Subsidy,
  SubsidyPerson,
  SubsidyCategory,
  SubsidyStatus,
  SubsidyProofState,
} from '../types';
import { SUBSIDY_CATALOGUE, catalogueEntry, CATEGORY_LABEL } from '../data/subsidyCatalogue';
import { checkSubsidy, STATUS_LABEL, PIPELINE_MANAGED_STATUSES, personBudget } from '../utils/subsidies';
import { formatCurrency } from '../utils/formatters';
import { prepareFileForStorage, formatBytes } from '../utils/fileStorage';
import { X, Paperclip, AlertTriangle, Info, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  people: SubsidyPerson[];
  subsidies: Subsidy[];
  editing?: Subsidy | null;
  year: number;
  onSubmit: (subsidy: Subsidy) => void;
  onManagePeople: () => void;
}

export const NewSubsidyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  people,
  subsidies,
  editing,
  year,
  onSubmit,
  onManagePeople,
}) => {
  const [personId, setPersonId] = useState(editing?.personId || '');
  const [eventKey, setEventKey] = useState(editing?.eventKey || '');
  const [eventName, setEventName] = useState(editing?.eventName || '');
  const [eventDate, setEventDate] = useState(editing?.eventDate || '');
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : '');
  const [actualCost, setActualCost] = useState<string>(
    editing?.actualCost !== undefined ? String(editing.actualCost) : ''
  );
  const [status, setStatus] = useState<SubsidyStatus>(editing?.status || 'beantragt');
  const [proofState, setProofState] = useState<SubsidyProofState>(editing?.proofState || 'offen');
  const [proofNote, setProofNote] = useState(editing?.proofNote || '');
  const [proofFile, setProofFile] = useState(editing?.proofFile);
  const [note, setNote] = useState(editing?.note || '');
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const entry = catalogueEntry(eventKey);
  const category: SubsidyCategory = entry?.category || 'sonstiges';
  const numericAmount = parseFloat(amount) || 0;

  const warnings = useMemo(() => {
    if (!personId || !numericAmount) return [];
    return checkSubsidy(
      {
        personId,
        category,
        amount: numericAmount,
        eventKey,
        year,
        actualCost: actualCost ? parseFloat(actualCost) : undefined,
      },
      subsidies,
      editing?.id
    );
  }, [personId, category, numericAmount, eventKey, year, actualCost, subsidies, editing?.id]);

  const budget = personId ? personBudget(subsidies, personId, year) : null;

  if (!isOpen) return null;

  const pickEvent = (key: string) => {
    setEventKey(key);
    const e = catalogueEntry(key);
    if (e) {
      if (!eventName || SUBSIDY_CATALOGUE.some((c) => c.label === eventName)) {
        setEventName(e.label);
      }
      if (e.amount > 0 && !amount) setAmount(String(e.amount));
    }
  };

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setFileError(null);

    const result = await prepareFileForStorage(file);
    if (result.ok === false) {
      setFileError(result.error);
      return;
    }

    setProofFile({
      name: file.name,
      size: formatBytes(result.file.bytes),
      mimeType: result.file.mimeType,
      dataUrl: result.file.dataUrl,
      uploadedAt: new Date().toISOString(),
    });
    setProofState('hochgeladen');
  };

  const proofIncomplete = proofState === 'anderweitig' && !proofNote.trim();
  const canSubmit = !!personId && !!eventName.trim() && numericAmount > 0 && !proofIncomplete;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const person = people.find((p) => p.id === personId);
    const now = new Date().toISOString();

    onSubmit({
      id: editing?.id || `sub_${Date.now()}`,
      personId,
      personName: person?.name || '',
      category,
      eventKey: eventKey || undefined,
      eventName: eventName.trim(),
      eventDate: eventDate || undefined,
      amount: numericAmount,
      actualCost: actualCost ? parseFloat(actualCost) : undefined,
      status,
      appliedAt: editing?.appliedAt || now,
      approvedAt:
        status === 'bestaetigt' || status === 'bezahlt' ? editing?.approvedAt || now : undefined,
      paidAt: status === 'bezahlt' ? editing?.paidAt || now : undefined,
      resolutionId: editing?.resolutionId,
      proofState,
      proofNote: proofState === 'anderweitig' ? proofNote.trim() : undefined,
      proofFile: proofState === 'hochgeladen' ? proofFile : undefined,
      note: note.trim() || undefined,
      year: editing?.year || year,
      createdAt: editing?.createdAt || now,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              Zuschuss {year}
            </div>
            <h3 className="text-base font-bold">
              {editing ? 'Zuschuss bearbeiten' : 'Zuschuss erfassen'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form id="subsidy-form" onSubmit={submit} className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Person */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-900 text-xs sm:text-sm">Wer *</label>
              <button
                type="button"
                onClick={onManagePeople}
                className="text-[11px] font-bold text-[#003594] hover:underline cursor-pointer"
              >
                Personen verwalten
              </button>
            </div>
            <select
              required
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594]"
            >
              <option value="">— Person wählen —</option>
              {[...people]
                .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>

            {budget && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                {year} bereits {formatCurrency(budget.used)} verbraucht ·{' '}
                {formatCurrency(budget.remaining)} offen
              </p>
            )}
          </div>

          {/* Veranstaltung */}
          <div>
            <label className="font-bold text-slate-900 text-xs sm:text-sm block mb-1.5">
              Wofür *
            </label>
            <select
              value={eventKey}
              onChange={(e) => pickEvent(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594]"
            >
              <option value="">— aus der Richtlinie wählen —</option>
              {SUBSIDY_CATALOGUE.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                  {c.amount > 0 ? ` · ${c.amount} €` : ''}
                </option>
              ))}
            </select>

            <input
              required
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Bezeichnung, z. B. LAKO Hessen (Hanau)"
              className="mt-2 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594]"
            />

            {entry?.hint && (
              <p className="mt-1.5 text-[11px] text-slate-500 flex items-start gap-1.5">
                <Info className="w-3 h-3 mt-0.5 shrink-0 text-[#00A3E0]" strokeWidth={2} />
                <span>{entry.hint}</span>
              </p>
            )}
          </div>

          {/* Datum, Betrag, Kosten */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="font-bold text-slate-900 block mb-1.5">Wann</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-900 block mb-1.5">Zuschuss € *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594]"
              />
            </div>
            <div>
              <label className="font-bold text-slate-900 block mb-1.5">
                Kosten €
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                placeholder="optional"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594]"
              />
            </div>
          </div>

          {/* Hinweise aus der Richtlinie */}
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-2.5 text-[11px] leading-relaxed flex items-start gap-2 ${
                    w.level === 'warnung'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" strokeWidth={2} />
                  <span>{w.text}</span>
                </div>
              ))}
              <p className="text-[10px] text-slate-400 px-1">
                Hinweise, keine Sperre – der Vorstand kann im Einzelfall abweichen.
              </p>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="font-bold text-slate-900 block mb-1.5">Stand</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SubsidyStatus)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594]"
            >
              {(Object.keys(STATUS_LABEL) as SubsidyStatus[])
                .filter((s) => !PIPELINE_MANAGED_STATUSES.includes(s) || s === status)
                .map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
            </select>
            {PIPELINE_MANAGED_STATUSES.includes(status) && (
              <p className="text-[10px] text-slate-400 px-1 mt-1">
                Dieser Stand wird normalerweise automatisch über den Beschluss gesetzt, nicht
                manuell.
              </p>
            )}
          </div>

          {/* Nachweis */}
          <div>
            <label className="font-bold text-slate-900 block mb-1.5">Nachweis</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['offen', 'Offen'],
                  ['hochgeladen', 'Hier abgelegt'],
                  ['anderweitig', 'Woanders'],
                ] as [SubsidyProofState, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setProofState(value)}
                  className={`py-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                    proofState === value
                      ? 'bg-[#003594] text-white border-[#003594]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {proofState === 'hochgeladen' && (
              <div className="mt-2">
                {proofFile ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="truncate text-slate-700">
                      {proofFile.name}{' '}
                      <span className="text-slate-400">({proofFile.size})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setProofFile(undefined)}
                      className="p-1 text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full py-3 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-[#003594] hover:text-[#003594] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Paperclip className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Foto, PDF oder Beleg auswählen</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFile(e.target.files)}
                />
                {fileError && (
                  <div className="mt-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-[11px] leading-relaxed text-rose-800">
                    {fileError}
                  </div>
                )}
              </div>
            )}

            {proofState === 'anderweitig' && (
              <div className="mt-2">
                <input
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="Wo liegt der Nachweis? *"
                  className={`w-full px-3 py-2.5 bg-slate-50 border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 ${
                    proofIncomplete
                      ? 'border-rose-300 focus:ring-rose-400'
                      : 'border-slate-200 focus:ring-[#003594]'
                  }`}
                />
                {proofIncomplete && (
                  <p className="mt-1 text-[11px] font-semibold text-rose-700">
                    Bitte angeben, wo der Nachweis abgelegt ist.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-900 block mb-1.5">Notiz</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="optional"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594]"
            />
          </div>
        </form>

        <div className="p-3.5 sm:px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold text-xs cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            form="subsidy-form"
            disabled={!canSubmit}
            className="px-5 py-2.5 rounded-xl bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 font-bold text-white text-xs sm:text-sm transition-all cursor-pointer"
          >
            {editing ? 'Speichern' : 'Erfassen'}
          </button>
        </div>
      </div>
    </div>
  );
};
