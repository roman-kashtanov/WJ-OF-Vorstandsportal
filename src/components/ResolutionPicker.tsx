import React, { useMemo, useState } from 'react';
import { Search, Check, Archive } from 'lucide-react';
import { Resolution, ResolutionStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { resolutionSectionOf } from '../utils/resolutionSections';
import { Collapse } from './Collapse';

interface Props {
  resolutions: Resolution[];
  value: string;
  onChange: (id: string) => void;
  /** Welche Beschluesse ueberhaupt in Frage kommen. */
  statuses: ResolutionStatus[];
  /** Zusaetzliche Auswahl "keine Zuordnung" (Wert ''). */
  noneLabel?: string;
}

const STATUS_LABEL: Partial<Record<ResolutionStatus, string>> = {
  in_abstimmung: 'In Abstimmung',
  angenommen: 'Angenommen',
};

const decisionDate = (r: Resolution) => r.passedAt || r.createdAt;

/** Steht der Beschluss im Reiter "Archiv" (archiviert oder Buchhaltung erledigt)? */
const isInArchive = (r: Resolution) => resolutionSectionOf(r) === 'archiv';

/**
 * Auswahl eines bestehenden Beschlusses (Zuschuss/Auslage zuordnen).
 *
 * Statt einer Klappliste: durchsuchbar und mit Budget und Datum, weil es
 * ueber die Jahre hunderte Beschluesse werden. Vorgeschlagen werden nur
 * offene Beschluesse; archivierte lassen sich auf Wunsch einblenden, z. B.
 * wenn eine Auslage zu einem laengst gebuchten Beschluss gehoert.
 */
export const ResolutionPicker: React.FC<Props> = ({ resolutions, value, onChange, statuses, noneLabel }) => {
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const { shown, archivedCount } = useMemo(() => {
    const candidates = resolutions.filter((r) => statuses.includes(r.status));
    const pool = candidates.filter((r) => showArchived || !isInArchive(r) || r.id === value);
    const q = query.trim().toLowerCase();
    const matches = pool
      .filter((r) => {
        if (!q) return true;
        return [
          r.number,
          r.title,
          r.motionText,
          r.applicant?.name,
          formatDate(decisionDate(r)),
          r.requestedBudget ? formatCurrency(r.requestedBudget) : '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => decisionDate(b).localeCompare(decisionDate(a)));
    return {
      shown: matches,
      archivedCount: candidates.filter((r) => isInArchive(r) && r.id !== value).length,
    };
  }, [resolutions, statuses, value, query, showArchived]);

  const optionClass = (selected: boolean) =>
    `w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
      selected
        ? 'bg-blue-50 border-[#003594] ring-1 ring-[#003594]/20'
        : 'bg-white border-slate-200 hover:bg-slate-50'
    }`;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search
          className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          strokeWidth={2}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nummer, Titel, Betrag oder Datum …"
          className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
        />
      </div>

      <div className="max-h-64 overflow-y-auto overscroll-contain space-y-1" role="listbox">
        {noneLabel && (
          <button
            type="button"
            role="option"
            aria-selected={value === ''}
            onClick={() => onChange('')}
            className={optionClass(value === '')}
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              {noneLabel}
              {value === '' && <Check className="w-3.5 h-3.5 text-[#003594] ml-auto" strokeWidth={2.5} />}
            </span>
          </button>
        )}

        {shown.length === 0 ? (
          <p className="text-[11px] text-slate-400 text-center py-3">
            {query.trim()
              ? 'Kein passender Beschluss gefunden.'
              : showArchived
              ? 'Keine Beschlüsse vorhanden.'
              : 'Keine offenen Beschlüsse vorhanden.'}
          </p>
        ) : (
          shown.map((r) => {
            const selected = r.id === value;
            return (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onChange(r.id)}
                className={optionClass(selected)}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#003594] shrink-0">{r.number}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      r.status === 'angenommen' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {STATUS_LABEL[r.status] || r.status}
                  </span>
                  {isInArchive(r) && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 bg-slate-100 text-slate-600 inline-flex items-center gap-0.5">
                      <Archive className="w-2.5 h-2.5" strokeWidth={2} />
                      Archiv
                    </span>
                  )}
                  {selected && <Check className="w-3.5 h-3.5 text-[#003594] ml-auto shrink-0" strokeWidth={2.5} />}
                </span>
                <span className="block text-xs font-bold text-slate-900 truncate mt-0.5">{r.title}</span>
                <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                  <span>
                    {r.passedAt ? 'Beschlossen am ' : 'Erstellt am '}
                    {formatDate(decisionDate(r))}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {r.requestedBudget ? `Budget ${formatCurrency(r.requestedBudget)}` : 'Ohne Budget'}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      {archivedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="w-full py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-[#003594] hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Archive className="w-3 h-3" strokeWidth={2} />
          {showArchived
            ? 'Archivierte Beschlüsse wieder ausblenden'
            : `${archivedCount} ${archivedCount === 1 ? 'archivierten Beschluss' : 'archivierte Beschlüsse'} einblenden`}
        </button>
      )}

      <Collapse open={showArchived && archivedCount > 0}>
        <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2">
          Archivierte Beschlüsse sind in der Buchhaltung bereits erledigt. Wird ihnen etwas
          zugeordnet, bitte die Buchhaltung dort erneut prüfen.
        </p>
      </Collapse>
    </div>
  );
};
