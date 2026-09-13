import React, { useState } from 'react';
import { ResolutionCategory } from '../types';
import { RESOLUTION_CATEGORIES } from '../utils/protocolResolutionParser';
import { formatCurrency, formatDate } from '../utils/formatters';
import { X, ArrowLeft, Vote, Eye, Pencil, RotateCcw, Paperclip, Check, Info } from 'lucide-react';

/**
 * Entwurfsfenster fuer automatisch erzeugte Beschluesse (z. B. beim Buendeln
 * von Zuschuessen): Bevor etwas gespeichert wird, sieht der Vorstand den
 * Beschluss so, wie er spaeter aussieht, und kann Bezeichnung, Antragstext,
 * Erlaeuterung und Kategorie anpassen.
 *
 * Ersetzt das aufrufende Fenster, statt sich darueberzulegen - es ist immer
 * nur ein Fenster offen. Abstimmknoepfe gibt es in der Vorschau bewusst
 * nicht, nur einen Hinweis, dass sie nach dem Anlegen erscheinen.
 */

export interface ResolutionDraft {
  title: string;
  motionText: string;
  description: string;
  category: ResolutionCategory;
}

interface Props {
  /** Nummer, unter der der Beschluss angelegt wird */
  number: string;
  /** Oberzeile im Fensterkopf, z. B. "Zuschüsse 2026" */
  contextLabel: string;
  draft: ResolutionDraft;
  /** Der automatisch erzeugte Vorschlag - fuer "Auf Vorschlag zuruecksetzen" */
  suggestion: ResolutionDraft;
  onChange: (draft: ResolutionDraft) => void;
  applicantName: string;
  requestedBudget?: number;
  /** Was dahintersteht, z. B. "3 Zuschüsse · 280,00 €" */
  summary?: string;
  attachmentCount: number;
  voterNames: string[];
  onBack: () => void;
  onClose: () => void;
  onConfirm: () => void;
}

const inputClass =
  'w-full min-w-0 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-base sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594]';

export const ResolutionDraftModal: React.FC<Props> = ({
  number,
  contextLabel,
  draft,
  suggestion,
  onChange,
  applicantName,
  requestedBudget,
  summary,
  attachmentCount,
  voterNames,
  onBack,
  onClose,
  onConfirm,
}) => {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');

  const isValid = !!draft.title.trim() && !!draft.motionText.trim();
  const isChanged =
    draft.title !== suggestion.title ||
    draft.motionText !== suggestion.motionText ||
    draft.description !== suggestion.description ||
    draft.category !== suggestion.category;

  const set = <K extends keyof ResolutionDraft>(key: K, value: ResolutionDraft[K]) =>
    onChange({ ...draft, [key]: value });

  const tabClass = (active: boolean) =>
    `flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors duration-200 cursor-pointer ${
      active ? 'bg-white text-[#003594] shadow-xs' : 'text-slate-500 hover:text-slate-800'
    }`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center wj-overlay animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col wj-overlay-panel animate-in fade-in zoom-in-95">
        {/* Kopf */}
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200 truncate">
              {contextLabel}
            </div>
            <h3 className="text-base font-bold">Beschluss-Entwurf prüfen</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Schließen, ohne anzulegen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Umschalter Vorschau / Bearbeiten */}
        <div className="px-4 sm:px-5 pt-3 shrink-0">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            <button type="button" onClick={() => setMode('preview')} className={tabClass(mode === 'preview')}>
              <Eye className="w-3.5 h-3.5" strokeWidth={2} />
              Vorschau
            </button>
            <button type="button" onClick={() => setMode('edit')} className={tabClass(mode === 'edit')}>
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
              Bearbeiten
              {isChanged && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Angepasst" />}
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {mode === 'preview' ? (
            <div key="preview" className="space-y-3 wj-expand">
              <p className="flex items-start gap-2 text-[11px] text-slate-600 bg-blue-50/60 border border-blue-100 rounded-xl p-2.5">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#00A3E0]" strokeWidth={2} />
                So wird der Beschluss angelegt. Noch ist nichts gespeichert – Bezeichnung und
                Text lassen sich unter „Bearbeiten“ anpassen.
              </p>

              {/* Nachbildung der Beschluss-Detailansicht */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-black text-[#003594] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    {number}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Entwurf
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {draft.category}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500">
                  Von <strong className="text-slate-700">{applicantName}</strong> ·{' '}
                  {formatDate(new Date().toISOString())}
                </div>

                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {draft.title.trim() || <span className="text-rose-600">Bezeichnung fehlt</span>}
                </h2>

                {draft.description.trim() && (
                  <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {draft.description}
                  </p>
                )}

                <div className="bg-slate-50 border-l-4 border-slate-300 p-3 rounded-r-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Antragswortlaut
                  </span>
                  <p className="text-sm font-semibold text-slate-900 italic leading-relaxed whitespace-pre-wrap">
                    {draft.motionText.trim() || (
                      <span className="text-rose-600 not-italic">Antragstext fehlt</span>
                    )}
                  </p>
                </div>

                {!!requestedBudget && (
                  <div className="flex items-center justify-between text-sm py-2 border-y border-slate-100">
                    <span className="text-slate-600">Beantragtes Gesamtbudget:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(requestedBudget)}</span>
                  </div>
                )}

                {(summary || attachmentCount > 0) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    {summary && <span>{summary}</span>}
                    {attachmentCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="w-3 h-3" strokeWidth={2} />
                        {attachmentCount} {attachmentCount === 1 ? 'Nachweis wird' : 'Nachweise werden'} angehängt
                      </span>
                    )}
                  </div>
                )}

                {/* Statt Abstimmknoepfen nur ein Hinweis */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-dashed border-slate-300 bg-white">
                  <Vote className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" strokeWidth={2} />
                  <div className="text-[11px] text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-800 block">Abstimmung</span>
                    Nach dem Anlegen erscheinen im Beschluss die Knöpfe Ja, Nein und Enthaltung
                    {voterNames.length > 0 && (
                      <> für {voterNames.length === 1 ? 'das stimmberechtigte Mitglied' : `die ${voterNames.length} Stimmberechtigten`} ({voterNames.join(', ')})</>
                    )}
                    . Angenommen ist er, sobald die Mehrheit der Stimmberechtigten mit Ja stimmt.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div key="edit" className="space-y-3.5 wj-expand">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Bezeichnung *</label>
                <input
                  value={draft.title}
                  onChange={(e) => set('title', e.target.value)}
                  className={`${inputClass} font-semibold`}
                  placeholder="Kurzer, eindeutiger Titel"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Kategorie</label>
                <select
                  value={draft.category}
                  onChange={(e) => set('category', e.target.value as ResolutionCategory)}
                  className={inputClass}
                >
                  {RESOLUTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Antragswortlaut *</label>
                <textarea
                  value={draft.motionText}
                  onChange={(e) => set('motionText', e.target.value)}
                  rows={10}
                  className={`${inputClass} leading-relaxed resize-y`}
                  placeholder="Der Vorstand beschließt …"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Erläuterung <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={3}
                  className={`${inputClass} leading-relaxed resize-y`}
                  placeholder="Hintergrund oder Begründung, erscheint über dem Antragswortlaut"
                />
              </div>

              {isChanged && (
                <button
                  type="button"
                  onClick={() => onChange(suggestion)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-[#003594] inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" strokeWidth={2} />
                  Auf den automatischen Vorschlag zurücksetzen
                </button>
              )}
            </div>
          )}

          {!isValid && (
            <p className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
              Bezeichnung und Antragswortlaut dürfen nicht leer sein.
            </p>
          )}
        </div>

        {/* Fuss */}
        <div className="p-3.5 sm:px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
            Zurück
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isValid}
            className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 font-bold text-white text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" strokeWidth={2.5} />
            Beschluss anlegen
          </button>
        </div>
      </div>
    </div>
  );
};
