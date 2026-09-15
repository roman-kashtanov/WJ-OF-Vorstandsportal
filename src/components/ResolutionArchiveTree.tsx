import React, { useMemo } from 'react';
import { Resolution } from '../types';
import { ArchiveTree, ArchiveLevel } from './ArchiveTree';

/**
 * Archiv der Beschluesse als aufklappbarer Baum: Jahr → Monat → Art
 * (Zuschuesse, Auslagen, allgemeine Beschluesse). Einsortiert wird nach dem
 * Beschlussdatum, ohne ein solches nach dem Erstelldatum. Standardmaessig
 * sind das neueste Jahr und dessen neuester Monat aufgeklappt.
 *
 * Die Karten selbst zeichnet ResolutionsView (renderCard), damit Liste und
 * Archiv dieselbe Darstellung haben. Der Baum selbst ist ArchiveTree.
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

const validDate = (res: Resolution) => {
  const d = new Date(archiveDateOf(res));
  return isNaN(d.getTime()) ? null : d;
};

export const ResolutionArchiveTree: React.FC<Props> = ({ resolutions, linkCounts, renderCard }) => {
  const levels = useMemo<[ArchiveLevel<Resolution>, ArchiveLevel<Resolution>, ArchiveLevel<Resolution>]>(() => {
    const kindOf = (res: Resolution): ArchiveKind => {
      const counts = linkCounts.get(res.id);
      if (counts?.zuschuss) return 'zuschuss';
      if (counts?.auslage) return 'auslage';
      return 'allgemein';
    };

    return [
      {
        keyOf: (res) => String(validDate(res)?.getFullYear() ?? 0),
        label: (key) => (key === '0' ? 'Ohne Datum' : key),
        compare: (a, b) => Number(b) - Number(a),
        defaultOpen: 'first',
      },
      {
        // Zweistellig, damit die Monate als Text richtig sortieren; '' = ohne Datum
        keyOf: (res) => {
          const d = validDate(res);
          return d ? String(d.getMonth()).padStart(2, '0') : '';
        },
        label: (key) => (key === '' ? 'Unbekannt' : MONTH_FORMAT.format(new Date(2000, Number(key), 1))),
        compare: (a, b) => b.localeCompare(a),
        defaultOpen: 'first',
      },
      {
        keyOf: kindOf,
        label: (key) => KIND_LABEL[key as ArchiveKind],
        compare: (a, b) => KIND_ORDER.indexOf(a as ArchiveKind) - KIND_ORDER.indexOf(b as ArchiveKind),
        defaultOpen: 'all',
        chipClass: (key) => KIND_CHIP[key as ArchiveKind],
      },
    ];
  }, [linkCounts]);

  return (
    <ArchiveTree
      items={resolutions}
      levels={levels}
      sortItems={(a, b) => archiveDateOf(b).localeCompare(archiveDateOf(a))}
      renderItem={renderCard}
    />
  );
};
