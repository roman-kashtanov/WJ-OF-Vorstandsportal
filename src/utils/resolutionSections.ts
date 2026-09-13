import { Resolution } from '../types';

/**
 * Bereiche der Beschlussliste - Reiter in ResolutionsView und Zeilen im
 * Beschluss-Modul der Uebersicht. Jeder Beschluss gehoert genau EINEM Bereich
 * an (seit v3.22.0 gibt es keinen Reiter "Alle" mehr, also darf nichts
 * durchs Raster fallen):
 *
 * - Offen: Abstimmung laeuft
 * - Abgestimmt · Buchhaltung offen: angenommen, Buchhaltung weder
 *   "bearbeitet" noch "nicht notwendig"
 * - Archiv: ausdruecklich archiviert ODER abgeschlossen - abgelehnt (dort ist
 *   nichts zu buchen) bzw. in der Buchhaltung erledigt
 */
export type ResolutionSectionKey = 'offen' | 'buchhaltung' | 'archiv';

/** Reihenfolge = Reiter-Reihenfolge. */
export const RESOLUTION_SECTIONS: { key: ResolutionSectionKey; label: string }[] = [
  { key: 'offen', label: 'Offen' },
  { key: 'buchhaltung', label: 'Abgestimmt · Buchhaltung offen' },
  { key: 'archiv', label: 'Archiv' },
];

export function resolutionSectionOf(res: Resolution): ResolutionSectionKey {
  if (res.isArchived) return 'archiv';
  if (res.status === 'in_abstimmung') return 'offen';
  if (
    res.status === 'angenommen' &&
    (res.bookkeepingStatus || 'nicht_bearbeitet') === 'nicht_bearbeitet'
  ) {
    return 'buchhaltung';
  }
  return 'archiv';
}

export function isInResolutionSection(res: Resolution, section: ResolutionSectionKey): boolean {
  return resolutionSectionOf(res) === section;
}

export function countResolutionSection(
  resolutions: Resolution[],
  section: ResolutionSectionKey
): number {
  return resolutions.filter((r) => resolutionSectionOf(r) === section).length;
}

/** Vorauswahl: erster Bereich mit Eintraegen, sonst "Offen" - nie das Archiv. */
export function defaultResolutionSection(resolutions: Resolution[]): ResolutionSectionKey {
  if (countResolutionSection(resolutions, 'offen') > 0) return 'offen';
  if (countResolutionSection(resolutions, 'buchhaltung') > 0) return 'buchhaltung';
  return 'offen';
}
