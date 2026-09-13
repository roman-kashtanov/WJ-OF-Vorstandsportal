import { Resolution } from '../types';

/**
 * Bereiche der Beschlussliste - Reiter in ResolutionsView und Zeilen im
 * Beschluss-Modul der Uebersicht. Archivierte Beschluesse gehoeren zu keinem
 * Bereich, sie haben ihren eigenen Archiv-Schalter.
 *
 * "Buchhaltung offen" = angenommen, aber in der Buchhaltung weder
 * "bearbeitet" noch "nicht notwendig". Abgelehnte Beschluesse brauchen keine
 * Buchung und stehen deshalb nur unter "Alle".
 */
export type ResolutionSectionKey = 'offen' | 'buchhaltung' | 'alle';

/** Reihenfolge = Reiter-Reihenfolge. "Alle" bewusst am Ende. */
export const RESOLUTION_SECTIONS: { key: ResolutionSectionKey; label: string }[] = [
  { key: 'offen', label: 'Offen' },
  { key: 'buchhaltung', label: 'Abgestimmt · Buchhaltung offen' },
  { key: 'alle', label: 'Alle' },
];

export function isInResolutionSection(res: Resolution, section: ResolutionSectionKey): boolean {
  if (section === 'alle') return true;
  if (section === 'offen') return res.status === 'in_abstimmung';
  return (
    res.status === 'angenommen' &&
    (res.bookkeepingStatus || 'nicht_bearbeitet') === 'nicht_bearbeitet'
  );
}

export function countResolutionSection(
  resolutions: Resolution[],
  section: ResolutionSectionKey
): number {
  return resolutions.filter((r) => !r.isArchived && isInResolutionSection(r, section)).length;
}

/** Vorauswahl: erster Bereich mit Eintraegen, sonst "Offen" - nie "Alle". */
export function defaultResolutionSection(resolutions: Resolution[]): ResolutionSectionKey {
  if (countResolutionSection(resolutions, 'offen') > 0) return 'offen';
  if (countResolutionSection(resolutions, 'buchhaltung') > 0) return 'buchhaltung';
  return 'offen';
}
