import React, { useMemo, useState } from 'react';
import { Subsidy, SubsidyPerson } from '../types';
import { SubsidyLimits } from '../data/subsidyCatalogue';
import { budgetOverview, countsTowardsBudget } from '../utils/subsidies';
import { formatCurrency } from '../utils/formatters';
import { ChevronDown, ChevronRight, Users } from 'lucide-react';
import { Collapse } from './Collapse';

interface Props {
  subsidies: Subsidy[];
  people: SubsidyPerson[];
  year: number;
  limits: SubsidyLimits;
  /** Personenuebersicht direkt bei dieser Person oeffnen */
  onOpenPerson: (personId: string) => void;
  onOpenPeople: () => void;
}

/**
 * Jahresbudget der Zuschuesse als schlanke Leiste - wie der Speicherplatz auf
 * dem iPhone: auf einen Blick, wie viel vergeben ist. Antippen klappt auf, wer
 * wie viel beantragt hat; ein Tipp auf eine Person oeffnet deren Zuschuesse in
 * der Personenuebersicht.
 *
 * Gezaehlt wird wie ueberall im Budget: alle nicht abgelehnten Zuschuesse des
 * Jahres (countsTowardsBudget), Auslagen nicht.
 */
export const SubsidyBudgetBar: React.FC<Props> = ({
  subsidies,
  people,
  year,
  limits,
  onOpenPerson,
  onOpenPeople,
}) => {
  const [open, setOpen] = useState(false);
  const overview = budgetOverview(subsidies, year, limits);

  const perPerson = useMemo(() => {
    const nameOf = new Map(people.map((p) => [p.id, p.name]));
    const byPerson = new Map<string, { personId: string; name: string; amount: number; count: number }>();
    for (const s of subsidies) {
      if (s.year !== year || !countsTowardsBudget(s)) continue;
      const entry = byPerson.get(s.personId) ?? {
        personId: s.personId,
        name: nameOf.get(s.personId) || s.personName,
        amount: 0,
        count: 0,
      };
      entry.amount += s.amount || 0;
      entry.count += 1;
      byPerson.set(s.personId, entry);
    }
    return [...byPerson.values()].sort(
      (a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'de')
    );
  }, [subsidies, people, year]);

  const total = overview.total > 0 ? overview.total : 1;
  const paidPercent = Math.min(100, (overview.paid / total) * 100);
  const committedPercent = Math.min(100 - paidPercent, (overview.committed / total) * 100);
  const personLimit = limits.perPersonPerYear;
  const overLimit = perPerson.filter((p) => p.amount > personLimit).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Leiste - immer sichtbar */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-4 py-3 text-left cursor-pointer hover:bg-slate-50/60 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Budget {year}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span>
              <strong className={overview.isExhausted ? 'text-rose-700' : 'text-slate-900'}>
                {formatCurrency(overview.used)}
              </strong>{' '}
              von {formatCurrency(overview.total)}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              strokeWidth={1.75}
            />
          </span>
        </div>

        <div className="mt-2 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-[width] duration-500"
            style={{ width: `${paidPercent}%` }}
          />
          <div
            className={`h-full transition-[width] duration-500 ${
              overview.isExhausted ? 'bg-rose-500' : 'bg-[#003594]'
            }`}
            style={{ width: `${committedPercent}%` }}
          />
        </div>
      </button>

      {/* Details */}
      <Collapse open={open}>
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Bezahlt {formatCurrency(overview.paid)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#003594]" />
              Zugesagt {formatCurrency(overview.committed)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-200" />
              Frei {formatCurrency(overview.remaining)}
            </span>
          </div>

          {overview.isExhausted && (
            <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Das Jahresbudget ist ausgeschöpft. Nach § 8 der Richtlinie ist das den Mitgliedern
              unverzüglich mitzuteilen.
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Nach Personen
              </span>
              <span className="text-[11px] text-slate-400">
                Grenze je Person {formatCurrency(personLimit)}
              </span>
            </div>

            {perPerson.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-2">Noch keine Zuschüsse in {year}.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {perPerson.map((p) => {
                  const ratio = personLimit > 0 ? p.amount / personLimit : 0;
                  return (
                    <button
                      key={p.personId}
                      type="button"
                      onClick={() => onOpenPerson(p.personId)}
                      className="w-full flex items-center gap-2.5 py-2 text-left rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-bold text-slate-900 truncate">{p.name}</span>
                          <span
                            className={`font-bold shrink-0 ${ratio > 1 ? 'text-rose-700' : 'text-slate-900'}`}
                          >
                            {formatCurrency(p.amount)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                ratio > 1 ? 'bg-rose-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, ratio * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {p.count} {p.count === 1 ? 'Zuschuss' : 'Zuschüsse'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenPeople}
            className="w-full pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-left cursor-pointer group"
          >
            <span className="flex items-center gap-2 font-bold text-slate-800">
              <Users className="w-4 h-4 text-[#003594]" strokeWidth={1.75} />
              Alle Personen & Bankverbindungen
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              {overLimit > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {overLimit} über Grenze
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-[#003594]" strokeWidth={2} />
            </span>
          </button>
        </div>
      </Collapse>
    </div>
  );
};
