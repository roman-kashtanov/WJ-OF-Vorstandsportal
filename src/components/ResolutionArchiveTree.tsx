import React, { useMemo, useState } from 'react';
import { Resolution } from '../types';
import { ChevronDown } from 'lucide-react';

/**
 * Archiv der Beschluesse als aufklappbarer Baum: Jahr → Monat → Art
 * (Zuschuesse, Auslagen, allgemeine Beschluesse). Einsortiert wird nach dem
 * Beschlussdatum, ohne ein solches nach dem Erstelldatum. Standardmaessig
 * sind das neueste Jahr und dessen neuester Monat aufgeklappt.
 *
 * Die Karten selbst zeichnet ResolutionsView (renderCard), damit Liste und
 * Archiv dieselbe Darstellung haben.
 */

type ArchiveKind = 'zuschuss' | 'auslage' | 'allgemein';

const KIND_ORDER: ArchiveKind[] = ['zuschuss', 'auslage', 'allgemein'];

const KIND_LABEL: Record<ArchiveKind, string> = {
  zuschuss: 'Zuschüsse',
  auslage: 'Auslagen',
  allgemein: 'Allgemeine Beschlüsse',
};

const KIND_CHIP: Record<ArchiveKind, string> = {
  zuschuss: 'bg-blue-50 border-blue-200 text-[#003594]',
  auslage: 'bg-violet-50 border-violet-200 text-violet-700',
  allgemein: 'bg-slate-100 border-slate-200 text-slate-600',
};

const MONTH_FORMAT = new Intl.DateTimeFormat('de-DE', { month: 'long' });

interface Props {
  resolutions: Resolution[];
  /** Wie viele Zuschuesse/Auslagen am Beschluss haengen (aus ResolutionsView). */
  linkCounts: Map<string, { files: number; zuschuss: number; auslage: number }>;
  renderCard: (res: Resolution) => React.ReactNode;
}

const archiveDateOf = (res: Resolution) => res.passedAt || res.createdAt || '';

export const ResolutionArchiveTree: React.FC<Props> = ({ resolutions, linkCounts, renderCard }) => {
  const kindOf = (res: Resolution): ArchiveKind => {
    const counts = linkCounts.get(res.id);
    if (counts?.zuschuss) return 'zuschuss';
    if (counts?.auslage) return 'auslage';
    return 'allgemein';
  };

  /** Jahr → Monat → Art, jeweils neueste zuerst. */
  const years = useMemo(() => {
    const byYear = new Map<number, Map<number, Map<ArchiveKind, Resolution[]>>>();
    for (const res of resolutions) {
      const d = new Date(archiveDateOf(res));
      const valid = !isNaN(d.getTime());
      const year = valid ? d.getFullYear() : 0;
      const month = valid ? d.getMonth() : 0;
      if (!byYear.has(year)) byYear.set(year, new Map());
      const byMonth = byYear.get(year)!;
      if (!byMonth.has(month)) byMonth.set(month, new Map());
      const byKind = byMonth.get(month)!;
      const kind = kindOf(res);
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind)!.push(res);
    }

    return [...byYear.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, byMonth]) => ({
        year,
        months: [...byMonth.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([month, byKind]) => ({
            month,
            kinds: KIND_ORDER.filter((k) => byKind.has(k)).map((kind) => ({
              kind,
              items: byKind
                .get(kind)!
                .sort((a, b) => archiveDateOf(b).localeCompare(archiveDateOf(a))),
            })),
          })),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolutions, linkCounts]);

  /** Nur die vom Nutzer umgeschalteten Gruppen; alles andere folgt dem Standard. */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const newestYear = years[0]?.year;
  const newestMonthKey = years[0] ? `${years[0].year}-${years[0].months[0]?.month}` : '';

  const isOpen = (key: string, defaultOpen: boolean) => (key in toggled ? toggled[key] : defaultOpen);
  const toggle = (key: string, defaultOpen: boolean) =>
    setToggled((prev) => ({ ...prev, [key]: !isOpen(key, defaultOpen) }));

  const count = (n: number) => (
    <span className="min-w-[1.5rem] text-center text-[11px] font-bold text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5 shrink-0">
      {n}
    </span>
  );

  const chevron = (open: boolean) => (
    <ChevronDown
      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      strokeWidth={1.75}
    />
  );

  return (
    <div className="space-y-2">
      {years.map(({ year, months }) => {
        const yearKey = `y:${year}`;
        const yearDefault = year === newestYear;
        const yearOpen = isOpen(yearKey, yearDefault);
        const yearTotal = months.reduce(
          (sum, m) => sum + m.kinds.reduce((s, k) => s + k.items.length, 0),
          0
        );

        return (
          <div key={yearKey} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(yearKey, yearDefault)}
              aria-expanded={yearOpen}
              className="w-full px-3.5 py-3 flex items-center gap-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="flex-1 font-black text-slate-900 text-sm">
                {year || 'Ohne Datum'}
              </span>
              {count(yearTotal)}
              {chevron(yearOpen)}
            </button>

            {yearOpen && (
              <div className="px-2.5 pb-2.5 space-y-1.5 wj-expand">
                {months.map(({ month, kinds }) => {
                  const monthKey = `m:${year}-${month}`;
                  const monthDefault = `${year}-${month}` === newestMonthKey;
                  const monthOpen = isOpen(monthKey, monthDefault);
                  const monthTotal = kinds.reduce((s, k) => s + k.items.length, 0);

                  return (
                    <div key={monthKey} className="rounded-xl border border-slate-100 bg-slate-50/60">
                      <button
                        type="button"
                        onClick={() => toggle(monthKey, monthDefault)}
                        aria-expanded={monthOpen}
                        className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-slate-100/70 rounded-xl transition-colors cursor-pointer"
                      >
                        <span className="flex-1 font-bold text-slate-800 text-xs">
                          {year ? MONTH_FORMAT.format(new Date(year, month, 1)) : 'Unbekannt'}
                        </span>
                        {count(monthTotal)}
                        {chevron(monthOpen)}
                      </button>

                      {monthOpen && (
                        <div className="px-2 pb-2 space-y-1.5 wj-expand">
                          {kinds.map(({ kind, items }) => {
                            const kindKey = `k:${year}-${month}-${kind}`;
                            const kindOpen = isOpen(kindKey, true);

                            return (
                              <div key={kindKey}>
                                <button
                                  type="button"
                                  onClick={() => toggle(kindKey, true)}
                                  aria-expanded={kindOpen}
                                  className="w-full px-2 py-1.5 flex items-center gap-2 text-left rounded-lg hover:bg-white transition-colors cursor-pointer"
                                >
                                  <span
                                    className={`min-w-0 truncate text-[11px] font-bold px-2 py-0.5 rounded-md border ${KIND_CHIP[kind]}`}
                                  >
                                    {KIND_LABEL[kind]}
                                  </span>
                                  <span className="flex-1" />
                                  {count(items.length)}
                                  {chevron(kindOpen)}
                                </button>

                                {kindOpen && (
                                  <div className="mt-1 space-y-1.5 wj-expand">
                                    {items.map((res) => renderCard(res))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
