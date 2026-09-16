/**
 * Wer aus dem Vorstand bekommt bei welchem Ereignis eine E-Mail? (v3.32.0)
 *
 * Geteilt über das Firestore-Dokument `settings/boardEmails`, gleiches Muster
 * wie `settings/roleCatalogue`. Bewusst pro Person UND pro Ereignis, damit
 * z. B. nur der Schatzmeister Zuschüsse und Auslagen bekommt, jemand anderes
 * aber die Belege.
 *
 * Betrifft nur E-Mails für Vorgänge, die von außen hereinkommen (öffentliche
 * Formulare und Links) - die Mitteilungen in der App und die Push-Nachrichten
 * bleiben davon unberührt.
 *
 * Existiert das Dokument noch nicht, gilt der bisherige Stand: Zuschuss und
 * Auslage gehen an die im Portal hinterlegte Admin-Adresse (siehe
 * api/boardNotify.ts). Sobald hier etwas gespeichert ist, zählt ausschließlich
 * diese Auswahl.
 */

export type BoardEmailEvent = 'subsidy' | 'expense' | 'invoice' | 'proof';

export interface BoardEmailSettings {
  /** Mitglieds-Kennung → Ereignisse, die diese Person per E-Mail bekommt */
  recipients: Record<string, BoardEmailEvent[]>;
}

export const BOARD_EMAIL_EVENTS: { key: BoardEmailEvent; label: string; hint: string }[] = [
  {
    key: 'subsidy',
    label: 'Neuer Zuschuss-Antrag',
    hint: 'Über das öffentliche Antragsformular eingereicht',
  },
  {
    key: 'expense',
    label: 'Neue Auslagenerstattung',
    hint: 'Über das öffentliche Auslagen-Formular eingereicht',
  },
  {
    key: 'invoice',
    label: 'Neuer Beleg',
    hint: 'Über einen Beleg-Link hochgeladen',
  },
  {
    key: 'proof',
    label: 'Nachweis nachgereicht',
    hint: 'Teilnahme- oder Kostennachweis zu einem Zuschuss',
  },
];

export const DEFAULT_BOARD_EMAIL_SETTINGS: BoardEmailSettings = { recipients: {} };

export function boardEmailEventsOf(
  settings: BoardEmailSettings | null | undefined,
  memberId: string
): BoardEmailEvent[] {
  const events = settings?.recipients?.[memberId];
  return Array.isArray(events) ? events : [];
}

/** Einen Haken setzen oder entfernen - gibt die vollständigen Einstellungen zurück. */
export function toggleBoardEmailEvent(
  settings: BoardEmailSettings,
  memberId: string,
  event: BoardEmailEvent,
  enabled: boolean
): BoardEmailSettings {
  const current = boardEmailEventsOf(settings, memberId);
  const next = enabled ? [...new Set([...current, event])] : current.filter((e) => e !== event);
  return { ...settings, recipients: { ...settings.recipients, [memberId]: next } };
}
