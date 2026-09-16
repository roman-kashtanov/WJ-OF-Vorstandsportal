import { FirestoreAdmin } from './firestoreAdmin';
import { sendEmail } from './email';
import { escapeHtml, layout } from './authEmails';

/**
 * E-Mails an den Vorstand, wenn von außen etwas hereinkommt (v3.32.0):
 * Zuschuss-Antrag, Auslagenerstattung, Beleg, nachgereichter Nachweis.
 *
 * Wer was bekommt, steht in `settings/boardEmails`
 * (src/data/boardEmailSettings.ts) - pro Person und pro Ereignis. Solange
 * dieses Dokument nicht existiert, gilt der bisherige Stand: Zuschuss und
 * Auslage gehen an `settings/security.adminEmail`. Ist es vorhanden, zählt
 * ausschließlich die dort getroffene Auswahl; ohne Haken geht bewusst keine
 * E-Mail raus.
 *
 * Fehler beim Versand werden geschluckt: eine fehlende Benachrichtigung darf
 * nie dazu führen, dass ein eingereichter Vorgang verloren geht.
 */

export type BoardEmailEventKey = 'subsidy' | 'expense' | 'invoice' | 'proof';

/** Ereignisse, die frueher (vor der Auswahl je Person) an die Admin-Adresse gingen. */
const LEGACY_ADMIN_EVENTS: BoardEmailEventKey[] = ['subsidy', 'expense'];

/** Exportiert, damit die Auswahl ohne echten Mailversand geprüft werden kann. */
export async function resolveRecipients(event: BoardEmailEventKey): Promise<string[]> {
  const settings = await FirestoreAdmin.getDocument('settings/boardEmails').catch(() => null);

  if (!settings || typeof settings.recipients !== 'object' || settings.recipients === null) {
    // Noch nie eingestellt: Verhalten wie bisher
    if (!LEGACY_ADMIN_EVENTS.includes(event)) return [];
    const security = await FirestoreAdmin.getDocument('settings/security').catch(() => null);
    const adminEmail = String(security?.adminEmail || '').trim();
    return adminEmail ? [adminEmail] : [];
  }

  const recipients = settings.recipients as Record<string, unknown>;
  const memberIds = Object.keys(recipients).filter((id) => {
    const events = recipients[id];
    return Array.isArray(events) && events.includes(event);
  });
  if (memberIds.length === 0) return [];

  const members = await FirestoreAdmin.listDocuments('members', ['id', 'name', 'email']).catch(() => []);
  const seen = new Set<string>();
  const addresses: string[] = [];
  for (const id of memberIds) {
    const email = String(members.find((m) => m.id === id)?.email || '').trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    addresses.push(email);
  }
  return addresses;
}

/**
 * Baut eine schlichte Portal-Mail: Überschrift, Stichpunkte, Hinweis, wo es
 * im Portal steht.
 */
export function boardMail(input: {
  title: string;
  lines: string[];
  where: string;
}): { subject: string; html: string; text: string } {
  const items = input.lines
    .filter(Boolean)
    .map(
      (line) =>
        `<p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 8px;">${escapeHtml(line)}</p>`
    )
    .join('');

  const html = layout(`
    <p style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 12px;">${escapeHtml(input.title)}</p>
    ${items}
    <p style="font-size: 12px; color: #64748b; margin: 16px 0 0;">${escapeHtml(input.where)}</p>`);

  const text = [input.title, '', ...input.lines.filter(Boolean), '', input.where].join('\n');
  return { subject: input.title, html, text };
}

export async function notifyBoardByEmail(
  event: BoardEmailEventKey,
  mail: { subject: string; html: string; text: string }
): Promise<void> {
  try {
    const to = await resolveRecipients(event);
    if (to.length === 0) return;
    await sendEmail({ to, ...mail });
  } catch {
    // Benachrichtigung ist Beiwerk - der Vorgang selbst ist bereits gespeichert
  }
}
