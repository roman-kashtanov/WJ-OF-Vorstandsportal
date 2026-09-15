import React, { useEffect, useRef } from 'react';

export interface StageTab<K extends string> {
  key: K;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface Props<K extends string> {
  tabs: StageTab<K>[];
  active: K;
  onSelect: (key: K) => void;
}

/**
 * Reiterleiste fuer die Bereiche einer Ansicht (Offen, Geprueft, Archiv …).
 * Waagerecht scrollbar; der aktive Reiter wird bei jedem Wechsel - auch per
 * Wischen - in die Mitte geschoben, damit man auf dem Handy sieht, wo man ist.
 * Bewusst per scrollTo statt scrollIntoView: Letzteres wuerde auch die Seite
 * senkrecht verschieben, wenn die Leiste gerade nicht im Bild ist.
 */
export function StageTabs<K extends string>({ tabs, active, onSelect }: Props<K>) {
  const barRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const tab = activeRef.current;
    if (!bar || !tab) return;
    const left = tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2;
    bar.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [active]);

  return (
    <div ref={barRef} role="tablist" className="relative flex gap-1.5 overflow-x-auto pb-0.5">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            ref={isActive ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors duration-200 cursor-pointer shrink-0 flex items-center gap-1.5 border ${
              isActive
                ? 'bg-[#003594] border-[#003594] text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && ` (${tab.count})`}
          </button>
        );
      })}
    </div>
  );
}
