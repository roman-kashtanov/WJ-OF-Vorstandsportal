/**
 * Format der Sicherungsdatei fuers oeffentliche Zuschuss-Antragsformular
 * (SubsidyApplicationPage.tsx) - Absicherung, falls ein Antrag den Server
 * nicht erreicht. Als schlichte "Feld;Wert"-Paare statt einer echten
 * Tabellenzeile, damit Kommentare/Namen mit Sonderzeichen das Format nicht
 * verwirren und ein spaeterer CSV-Import (useSubsidies.ts) robust bleibt.
 */

const CSV_VERSION = 'WJOF-Zuschuss-Sicherung/1';

export interface SubsidyBackupFields {
  personName: string;
  personEmail: string;
  iban: string;
  bic: string;
  accountHolder: string;
  eventKey: string;
  eventLabel: string;
  eventDate: string;
  actualCost: string;
  comment: string;
}

export interface ParsedSubsidyBackup {
  personName: string;
  personEmail: string;
  iban: string;
  bic: string;
  accountHolder: string;
  eventKey: string;
  eventLabel: string;
  eventDate: string;
  actualCost: number;
  comment: string;
}

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function buildSubsidyBackupCsv(fields: SubsidyBackupFields): string {
  const rows: [string, string][] = [
    ['Format', CSV_VERSION],
    ['Erstellt am', new Date().toISOString()],
    ['Name', fields.personName],
    ['E-Mail', fields.personEmail],
    ['IBAN', fields.iban],
    ['BIC', fields.bic],
    ['Kontoinhaber', fields.accountHolder],
    ['Veranstaltung (Schlüssel)', fields.eventKey],
    ['Veranstaltung (Bezeichnung)', fields.eventLabel],
    ['Datum der Veranstaltung', fields.eventDate],
    ['Tatsächliche Kosten', fields.actualCost],
    ['Kommentar', fields.comment],
  ];
  return rows.map(([k, v]) => `${csvEscape(k)};${csvEscape(v)}`).join('\n');
}

export function downloadSubsidyBackupCsv(fields: SubsidyBackupFields, filenamePrefix: string) {
  const csv = buildSubsidyBackupCsv(fields);
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const datePart = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filenamePrefix}-${datePart}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): [string, string] | null {
  const m = line.match(/^"((?:[^"]|"")*)";"((?:[^"]|"")*)"$/);
  if (!m) return null;
  return [m[1].replace(/""/g, '"'), m[2].replace(/""/g, '"')];
}

/** Liest eine Sicherungsdatei ein. `null`, wenn Format/Pflichtfelder fehlen. */
export function parseSubsidyBackupCsv(text: string): ParsedSubsidyBackup | null {
  const clean = text.replace(/^﻿/, '');
  const map: Record<string, string> = {};
  for (const rawLine of clean.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parsed = parseCsvLine(line);
    if (!parsed) continue;
    map[parsed[0]] = parsed[1];
  }

  if (map['Format'] !== CSV_VERSION) return null;
  if (!map['Name']?.trim() || !map['Veranstaltung (Schlüssel)']?.trim()) return null;

  const actualCost = Number((map['Tatsächliche Kosten'] || '').replace(',', '.'));

  return {
    personName: map['Name'].trim(),
    personEmail: (map['E-Mail'] || '').trim(),
    iban: (map['IBAN'] || '').trim(),
    bic: (map['BIC'] || '').trim(),
    accountHolder: (map['Kontoinhaber'] || '').trim(),
    eventKey: map['Veranstaltung (Schlüssel)'].trim(),
    eventLabel: (map['Veranstaltung (Bezeichnung)'] || '').trim(),
    eventDate: (map['Datum der Veranstaltung'] || '').trim(),
    actualCost: Number.isFinite(actualCost) ? actualCost : 0,
    comment: (map['Kommentar'] || '').trim(),
  };
}
