import React, { useState } from 'react';
import { CHANGELOG, ChangelogEntry } from '../data/changelog';
import { CURRENT_APP_VERSION } from '../constants/version';
import { Collapse } from './Collapse';
import { ChevronDown, Sparkles } from 'lucide-react';

/**
 * Versionsverlauf zum Nachlesen - gespeist aus src/data/changelog.ts.
 * Eingebunden in Einstellungen → System und im Fenster hinter der
 * Versionsnummer in der Fußzeile (ChangelogModal).
 *
 * Die installierte Version ist markiert und standardmaessig aufgeklappt;
 * aeltere Versionen kommen erst auf Wunsch dazu, damit die Liste auf dem
 * Handy nicht endlos wird.
 */

interface Props {
  /** Wie viele Einträge zunächst sichtbar sind. */
  initialCount?: number;
  entries?: ChangelogEntry[];
}

export const ChangelogList: React.FC<Props> = ({ initialCount = 5, entries = CHANGELOG }) => {
  const [showAll, setShowAll] = useState(false);
  const [openVersion, setOpenVersion] = useState<string | null>(entries[0]?.version || null);

  const visible = showAll ? entries : entries.slice(0, initialCount);
  const hidden = entries.length - visible.length;

  return (
    <div className="space-y-1.5">
      {visible.map((entry) => {
        const isCurrent = entry.version === CURRENT_APP_VERSION;
        const isOpen = openVersion === entry.version;

        return (
          <div
            key={entry.version}
            className={`rounded-xl border overflow-hidden ${
              isCurrent ? 'border-[#003594]/30 bg-blue-50/40' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenVersion(isOpen ? null : entry.version)}
              aria-expanded={isOpen}
              className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <span
                className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                  isCurrent ? 'bg-[#003594] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                v{entry.version}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-slate-900 text-xs truncate">{entry.title}</span>
                {entry.date && <span className="block text-[10px] text-slate-400">{entry.date}</span>}
              </span>
              {isCurrent && (
                <span className="text-[10px] font-bold text-[#003594] shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" strokeWidth={2} />
                  installiert
                </span>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                strokeWidth={1.75}
              />
            </button>

            <Collapse open={isOpen}>
              <ul className="px-3 pb-3 pt-0.5 space-y-1 text-[11px] text-slate-600 leading-relaxed">
                {entry.changes.map((change, index) => (
                  <li key={index} className="flex gap-1.5">
                    <span className="text-slate-300 shrink-0">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </Collapse>
          </div>
        );
      })}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-[11px] font-bold text-[#003594] hover:underline cursor-pointer"
        >
          {hidden} ältere {hidden === 1 ? 'Version' : 'Versionen'} anzeigen
        </button>
      )}
    </div>
  );
};
