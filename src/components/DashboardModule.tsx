import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface DashboardModuleRow {
  key: string;
  label: string;
  count: number;
  /** Farbe des Punkts vor der Zeile (Tailwind-Klasse) */
  dotClass: string;
  onClick: () => void;
}

interface Props {
  icon: React.ReactNode;
  title: string;
  rows: DashboardModuleRow[];
}

/**
 * Ein Modul der Uebersicht: reine Anzeige mit Zaehlern, hier wird nichts
 * bearbeitet. Jede Zeile springt in den passenden Reiter, der Kopf in die
 * erste Zeile mit Eintraegen. Zeilen ohne Eintraege werden ausgeblendet -
 * bleibt keine uebrig, erscheint das Modul gar nicht.
 */
export const DashboardModule: React.FC<Props> = ({ icon, title, rows }) => {
  const visible = rows.filter((r) => r.count > 0);
  if (visible.length === 0) return null;
  const total = visible.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden wj-expand">
      <button
        type="button"
        onClick={visible[0].onClick}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#003594] flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="flex-1 min-w-0 font-bold text-sm text-slate-900 truncate">{title}</span>
        <span className="text-xs font-bold text-slate-500 shrink-0">{total}</span>
        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.75} />
      </button>

      <div className="border-t border-slate-100 divide-y divide-slate-100">
        {visible.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={row.onClick}
            className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${row.dotClass}`} />
            <span className="flex-1 min-w-0 text-xs font-semibold text-slate-700 truncate">
              {row.label}
            </span>
            <span className="min-w-[1.75rem] text-center text-xs font-black text-slate-900 bg-slate-100 rounded-lg px-2 py-0.5 shrink-0">
              {row.count}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={1.75} />
          </button>
        ))}
      </div>
    </div>
  );
};
