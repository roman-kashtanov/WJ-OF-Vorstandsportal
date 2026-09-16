import { FirestoreAdmin } from './firestoreAdmin';
import { createSubsidyProofToken, PROOF_LINK_VALID_DAYS } from './subsidyProofToken';
import { sendEmail } from './email';
import { verifyBoardCaller } from './auth';
import { writeAuditLogEntry } from './notify';
import { subsidyReminderEmail } from './subsidyEmails';

/**
 * Automatische Erinnerungen an fehlende Zuschuss-Unterlagen (v3.31.0).
 *
 * Zwei Erinnerungen je Zuschuss: am Veranstaltungstag und eine Woche danach,
 * jeweils gegen 20 Uhr deutscher Zeit. Ausgeloest von der zeitgesteuerten
 * Netlify-Funktion `netlify/functions/reminders.mts` (laeuft taeglich) - das
 * ist die einzige Stelle im Projekt, die ohne Zutun eines Nutzers laeuft.
 *
 * Bewusste Einschraenkungen (Nutzervorgabe):
 * - nur Zuschuesse, keine Auslagen (dort ist der Beleg Pflicht),
 * - nur Antraege, die VOR der Veranstaltung eingereicht wurden,
 * - nur solange tatsaechlich ein Nachweis fehlt und der Vorgang noch nicht in
 *   einem Beschluss, bezahlt oder abgelehnt ist.
 *
 * Jede verschickte Erinnerung wird am Vorgang vermerkt
 * (remindedOnEventDayAt / remindedAfterEventAt), damit sie nicht doppelt
 * rausgeht - auch wenn die Funktion mehrfach am Tag laeuft.
 */

const TIMEZONE = 'Europe/Berlin';

/**
 * Stunde in deutscher Zeit (0-23) - Sommer-/Winterzeit inbegriffen.
 * Bewusst 'en-GB' mit hourCycle 'h23': die deutsche Schreibweise liefert
 * "20 Uhr" statt "20" und damit keine brauchbare Zahl.
 */
export function berlinHour(now: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: TIMEZONE, hour: '2-digit', hourCycle: 'h23' }).format(now)
  );
}

/** Datum in deutscher Zeit als YYYY-MM-DD. */
export function berlinDate(now: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Uhrzeit, zu der die Erinnerungen rausgehen sollen. */
export const REMINDER_HOUR = 20;
/** Tage nach der Veranstaltung fuer die zweite Erinnerung. */
export const REMINDER_DAYS_AFTER = 7;

function missingProofs(subsidy: Record<string, any>): string[] {
  const done = (state: unknown) => state === 'hochgeladen' || state === 'anderweitig';
  return [
    done(subsidy.proofState) ? null : 'Teilnahmenachweis',
    done(subsidy.costProofState) ? null : 'Kostennachweis (Rechnung)',
  ].filter((x): x is string => x !== null);
}

export interface ReminderResult {
  ok: true;
  date: string;
  hour: number;
  /** Geprüfte Zuschüsse */
  checked: number;
  sent: number;
  /** Fällig, aber ohne E-Mail-Adresse der Person */
  withoutEmail: number;
  failed: string[];
  /** Gesetzt, wenn wegen der Uhrzeit nichts getan wurde */
  skippedReason?: string;
}

export async function runSubsidyReminders(
  appUrl: string,
  options: { now?: Date; force?: boolean } = {}
): Promise<{ status: number; body: any }> {
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }

  const now = options.now || new Date();
  const hour = berlinHour(now);
  const today = berlinDate(now);

  // Die Netlify-Funktion laeuft zu zwei UTC-Zeiten, damit trotz Sommer- und
  // Winterzeit genau ein Lauf auf 20 Uhr deutscher Zeit faellt.
  if (!options.force && hour !== REMINDER_HOUR) {
    const result: ReminderResult = {
      ok: true,
      date: today,
      hour,
      checked: 0,
      sent: 0,
      withoutEmail: 0,
      failed: [],
      skippedReason: `Läuft nur um ${REMINDER_HOUR} Uhr deutscher Zeit`,
    };
    return { status: 200, body: result };
  }

  try {
    const [subsidies, people] = await Promise.all([
      FirestoreAdmin.listDocuments('subsidies'),
      FirestoreAdmin.listDocuments('subsidyPeople', ['id', 'name', 'email']),
    ]);
    const emailOf = (personId: string) =>
      String(people.find((p) => p.id === personId)?.email || '').trim();

    let checked = 0;
    let sent = 0;
    let withoutEmail = 0;
    const failed: string[] = [];

    for (const subsidy of subsidies) {
      if ((subsidy.kind || 'zuschuss') !== 'zuschuss') continue;
      if (!subsidy.eventDate) continue;
      if (subsidy.resolutionId || subsidy.status === 'bezahlt' || subsidy.status === 'abgelehnt') continue;

      // Nur Antraege, die vor der Veranstaltung gestellt wurden
      const appliedDate = String(subsidy.appliedAt || subsidy.createdAt || '').slice(0, 10);
      if (!appliedDate || appliedDate >= subsidy.eventDate) continue;

      const missing = missingProofs(subsidy);
      if (missing.length === 0) continue;

      checked += 1;

      let phase: 'eventDay' | 'weekAfter' | null = null;
      if (subsidy.eventDate === today && !subsidy.remindedOnEventDayAt) phase = 'eventDay';
      else if (addDays(subsidy.eventDate, REMINDER_DAYS_AFTER) === today && !subsidy.remindedAfterEventAt) {
        phase = 'weekAfter';
      }
      if (!phase) continue;

      const email = emailOf(subsidy.personId);
      if (!email) {
        withoutEmail += 1;
        continue;
      }

      const token = createSubsidyProofToken(subsidy.id);
      if (!token) {
        return { status: 500, body: { error: 'SUBSIDY_PROOF_LINK_SECRET ist nicht gesetzt.' } };
      }

      const mail = subsidyReminderEmail({
        personName: subsidy.personName || '',
        eventName: subsidy.eventName || 'deine Veranstaltung',
        eventDate: subsidy.eventDate,
        missing,
        proofUrl: `${appUrl.replace(/\/$/, '')}/nachweis?t=${token}`,
        validDays: PROOF_LINK_VALID_DAYS,
        phase,
      });

      const result = await sendEmail({ to: [email], ...mail });
      if (result.status >= 400) {
        failed.push(email);
        continue;
      }

      const stamp = new Date().toISOString();
      await FirestoreAdmin.patchDocument(
        `subsidies/${subsidy.id}`,
        phase === 'eventDay' ? { remindedOnEventDayAt: stamp } : { remindedAfterEventAt: stamp }
      );
      await writeAuditLogEntry({
        entityType: 'subsidy',
        entityId: subsidy.id,
        entityLabel: `${subsidy.personName || ''} – ${subsidy.eventName || ''}`,
        action:
          phase === 'eventDay'
            ? 'Erinnerung am Veranstaltungstag verschickt'
            : 'Erinnerung eine Woche nach der Veranstaltung verschickt',
        actorName: 'Automatik',
      }).catch(() => {});

      sent += 1;
    }

    const result: ReminderResult = { ok: true, date: today, hour, checked, sent, withoutEmail, failed };
    return { status: 200, body: result };
  } catch (err: any) {
    return { status: 500, body: { error: err?.message || 'Die Erinnerungen konnten nicht geprüft werden.' } };
  }
}

/**
 * Von Hand aus dem Portal angestossen (Einstellungen → Zuschüsse) - zum
 * Prüfen nach dem Deploy, ohne bis 20 Uhr zu warten. Nur fuer den Vorstand;
 * faellige Erinnerungen gehen dabei wirklich raus.
 */
export async function handleRunReminders(
  input: { idToken?: string },
  appUrl: string
): Promise<{ status: number; body: any }> {
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }
  const caller = await verifyBoardCaller(input?.idToken);
  if (caller.ok === false) return caller.result;
  return runSubsidyReminders(appUrl, { force: true });
}
