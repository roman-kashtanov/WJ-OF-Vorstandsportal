import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapse } from './Collapse';

/**
 * Aufklappbarer Archiv-Baum mit drei Ebenen, gemeinsam genutzt von
 * Beschluessen (Jahr → Monat → Art) und Belegen (Jahr → Kategorie → mit/ohne
 * Beschluss). Die Karten zeichnet der Aufrufer (renderItem), damit Liste und
 * Archiv dieselbe Darstellung haben.
 *
 * Anfangs offen: auf Ebenen mit `defaultOpen: 'first'` nur die jeweils erste
 * Gruppe, und auch nur, solange alle uebergeordneten Gruppen ebenfalls die
 * ersten sind (also z. B. das neueste Jahr und darin der neueste Monat).
 */

export interface ArchiveLevel<T> {
  /** Gruppe eines Eintrags auf dieser Ebene. */
  keyOf: (item: T) => string;
  label: (key: string) => string;
  /** Reihenfolge der Gruppen (negativ = a zuerst). */
  compare: (a: string, b: string) => number;
  defaultOpen: 'first' | 'all';
  /** Nur unterste Ebene: Farbe des Etiketts. */
  chipClass?: (key: string) => string;
}

interface Props<T> {
  items: T[];
  levels: [ArchiveLevel<T>, ArchiveLevel<T>, ArchiveLevel<T>];
  sortItems: (a: T, b: T) => number;
  renderItem: (item: T) => React.ReactNode;
}

interface Group<T> {
  key: string;
  items: T[];
  children: Group<T>[];
}

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

export function ArchiveTree<T>({ items, levels, sortItems, renderItem }: Props<T>) {
  const groups = useMemo(() => {
    const build = (list: T[], depth: number): Group<T>[] => {
      const level = levels[depth];
      const byKey = new Map<string, T[]>();
      for (const item of list) {
        const key = level.keyOf(item);
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(item);
      }
      const last = depth === levels.length - 1;
      return [...byKey.entries()]
        .sort((a, b) => level.compare(a[0], b[0]))
        .map(([key, groupItems]) => ({
          key,
          items: last ? [...groupItems].sort(sortItems) : groupItems,
          children: last ? [] : build(groupItems, depth + 1),
        }));
    };
    return build(items, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, levels]);

  /** Nur die vom Nutzer umgeschalteten Gruppen; alles andere folgt dem Standard. */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (key: string, defaultOpen: boolean) => (key in toggled ? toggled[key] : defaultOpen);
  const toggle = (key: string, defaultOpen: boolean) =>
    setToggled((prev) => ({ ...prev, [key]: !isOpen(key, defaultOpen) }));

  const defaultFor = (depth: number, index: number, parentsFirst: boolean) =>
    levels[depth].defaultOpen === 'all' || (parentsFirst && index === 0);

  return (
    <div className="space-y-2">
      {groups.map((top, topIndex) => {
        const topKey = `0:${top.key}`;
        const topDefault = defaultFor(0, topIndex, true);
        const topOpen = isOpen(topKey, topDefault);

        return (
          <div key={topKey} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(topKey, topDefault)}
              aria-expanded={topOpen}
              className="w-full px-3.5 py-3 flex items-center gap-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="flex-1 font-black text-slate-900 text-sm">{levels[0].label(top.key)}</span>
              {count(top.items.length)}
              {chevron(topOpen)}
            </button>

            <Collapse open={!!(topOpen)}>{topOpen && (
              <div className="px-2.5 pb-2.5 space-y-1.5">
                {top.children.map((mid, midIndex) => {
                  const midKey = `1:${top.key}/${mid.key}`;
                  const midDefault = defaultFor(1, midIndex, topIndex === 0);
                  const midOpen = isOpen(midKey, midDefault);

                  return (
                    <div key={midKey} className="rounded-xl border border-slate-100 bg-slate-50/60">
                      <button
                        type="button"
                        onClick={() => toggle(midKey, midDefault)}
                        aria-expanded={midOpen}
                        className="w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-slate-100/70 rounded-xl transition-colors cursor-pointer"
                      >
                        <span className="flex-1 font-bold text-slate-800 text-xs">{levels[1].label(mid.key)}</span>
                        {count(mid.items.length)}
                        {chevron(midOpen)}
                      </button>

                      <Collapse open={!!(midOpen)}>{midOpen && (
                        <div className="px-2 pb-2 space-y-1.5">
                          {mid.children.map((leaf, leafIndex) => {
                            const leafKey = `2:${top.key}/${mid.key}/${leaf.key}`;
                            const leafDefault = defaultFor(2, leafIndex, topIndex === 0 && midIndex === 0);
                            const leafOpen = isOpen(leafKey, leafDefault);

                            return (
                              <div key={leafKey}>
                                <button
                                  type="button"
                                  onClick={() => toggle(leafKey, leafDefault)}
                                  aria-expanded={leafOpen}
                                  className="w-full px-2 py-1.5 flex items-center gap-2 text-left rounded-lg hover:bg-white transition-colors cursor-pointer"
                                >
                                  <span
                                    className={`min-w-0 truncate text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                                      levels[2].chipClass?.(leaf.key) || 'bg-slate-100 border-slate-200 text-slate-600'
                                    }`}
                                  >
                                    {levels[2].label(leaf.key)}
                                  </span>
                                  <span className="flex-1" />
                                  {count(leaf.items.length)}
                                  {chevron(leafOpen)}
                                </button>

                                <Collapse open={!!(leafOpen)}>{leafOpen && (
                                  <div className="mt-1 space-y-1.5">
                                    {leaf.items.map((item) => renderItem(item))}
                                  </div>
                                )}</Collapse>
                              </div>
                            );
                          })}
                        </div>
                      )}</Collapse>
                    </div>
                  );
                })}
              </div>
            )}</Collapse>
          </div>
        );
      })}
    </div>
  );
}
