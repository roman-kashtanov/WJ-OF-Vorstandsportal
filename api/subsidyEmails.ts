import { escapeHtml, layout, button } from './authEmails';

/**
 * E-Mails an Antragsteller rund um Zuschuss und Auslage (v3.31.0):
 * Eingangsbestätigung direkt nach dem Einreichen und die automatischen
 * Erinnerungen an fehlende Unterlagen (api/reminders.ts).
 *
 * Bewusst im selben Rahmen wie die übrigen Portal-Mails (layout/button aus
 * authEmails.ts). Verschickt wird erst, nachdem der Vorgang tatsächlich in
 * der Datenbank steht - die Bestätigung ist damit auch eine Quittung.
 */

export const money = (value: number) => `${value.toFixed(2).replace('.', ',')} €`;

export const dateDe = (iso?: string) => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}.${m}.${y}` : String(iso || '');
};

function factLines(facts: [string, string][]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 4px 0 16px; font-size: 14px; color: #334155;">${facts
    .filter(([, value]) => !!value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding: 2px 12px 2px 0; color: #64748b;">${escapeHtml(label)}</td><td style="padding: 2px 0; font-weight: 700;">${escapeHtml(value)}</td></tr>`
    )
    .join('')}</table>`;
}

const paragraph = (text: string) =>
  `<p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 12px;">${text}</p>`;

const linkNote = (url: string, validDays: number) =>
  `<p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 12px 0 0;">
      Falls der Knopf nicht funktioniert, diesen Link öffnen:<br>
      <a href="${escapeHtml(url)}" style="color: #003594; word-break: break-all;">${escapeHtml(url)}</a><br>
      Bitte den Link aufbewahren – er ist ${validDays} Tage gültig und zeigt immer den aktuellen Stand.
    </p>`;

export interface SubsidyMailFacts {
  personName: string;
  eventName: string;
  eventDate?: string;
  amount: number;
  actualCost?: number;
}

/** Eingangsbestätigung für einen Zuschuss-Antrag. */
export function subsidyConfirmationEmail(input: SubsidyMailFacts & {
  missing: string[];
  proofUrl?: string;
  validDays: number;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.personName);
  const facts = factLines([
    ['Veranstaltung', input.eventName],
    ['Datum', dateDe(input.eventDate)],
    ['Tatsächliche Kosten', input.actualCost ? money(input.actualCost) : ''],
    ['Möglicher Zuschuss', money(input.amount)],
  ]);

  const missingText = input.missing.join(' und ');
  const statusHtml =
    input.missing.length > 0
      ? paragraph(`Es fehlt uns noch: <strong>${escapeHtml(missingText)}</strong>.`)
      : paragraph('Alle Unterlagen liegen bereits vor – du musst nichts weiter tun.');

  const linkHtml = input.proofUrl
    ? `<div style="margin: 16px 0 8px;">${button(
        escapeHtml(input.proofUrl),
        input.missing.length > 0 ? 'Unterlagen hochladen' : 'Unterlagen ansehen'
      )}</div>${linkNote(input.proofUrl, input.validDays)}`
    : '';

  const html = layout(`
    ${paragraph(`Hallo ${name},`)}
    ${paragraph('dein Zuschuss-Antrag ist bei uns eingegangen. Hier die Daten zum Nachlesen:')}
    ${facts}
    ${statusHtml}
    ${linkHtml}
    ${paragraph(
      'Der Vorstand prüft den Antrag. Ausgezahlt wird erst nach einem Vorstandsbeschluss – du bekommst dann keine weitere Nachricht, das Geld kommt einfach auf dein Konto.'
    )}`);

  const text = [
    `Hallo ${input.personName},`,
    '',
    'dein Zuschuss-Antrag ist bei uns eingegangen.',
    `Veranstaltung: ${input.eventName}`,
    input.eventDate ? `Datum: ${dateDe(input.eventDate)}` : '',
    input.actualCost ? `Tatsächliche Kosten: ${money(input.actualCost)}` : '',
    `Möglicher Zuschuss: ${money(input.amount)}`,
    '',
    input.missing.length > 0 ? `Es fehlt uns noch: ${missingText}.` : 'Alle Unterlagen liegen bereits vor.',
    input.proofUrl ? `Deine Unterlagen: ${input.proofUrl}` : '',
    '',
    'Der Vorstand prüft den Antrag. Ausgezahlt wird erst nach einem Vorstandsbeschluss.',
  ]
    .filter((l) => l !== '')
    .join('\n');

  return { subject: `Antrag eingegangen: ${input.eventName}`, html, text };
}

/** Eingangsbestätigung für eine Auslagenerstattung. */
export function expenseConfirmationEmail(input: {
  personName: string;
  label: string;
  expenseDate?: string;
  amount: number;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.personName);
  const facts = factLines([
    ['Wofür', input.label],
    ['Datum des Belegs', dateDe(input.expenseDate)],
    ['Betrag', money(input.amount)],
  ]);

  const html = layout(`
    ${paragraph(`Hallo ${name},`)}
    ${paragraph('deine Auslagenerstattung ist bei uns eingegangen. Hier die Daten zum Nachlesen:')}
    ${facts}
    ${paragraph('Dein Beleg liegt uns vor – du musst nichts weiter tun.')}
    ${paragraph(
      'Der Vorstand prüft die Erstattung. Ausgezahlt wird erst nach einem Vorstandsbeschluss; das Geld kommt dann auf dein Konto.'
    )}`);

  const text = [
    `Hallo ${input.personName},`,
    '',
    'deine Auslagenerstattung ist bei uns eingegangen.',
    `Wofür: ${input.label}`,
    input.expenseDate ? `Datum des Belegs: ${dateDe(input.expenseDate)}` : '',
    `Betrag: ${money(input.amount)}`,
    '',
    'Dein Beleg liegt uns vor. Der Vorstand prüft die Erstattung; ausgezahlt wird nach einem Vorstandsbeschluss.',
  ]
    .filter((l) => l !== '')
    .join('\n');

  return { subject: `Auslage eingegangen: ${input.label}`, html, text };
}

/** Automatische Erinnerung an fehlende Unterlagen. */
export function subsidyReminderEmail(input: {
  personName: string;
  eventName: string;
  eventDate?: string;
  missing: string[];
  proofUrl: string;
  validDays: number;
  phase: 'eventDay' | 'weekAfter';
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.personName);
  const missingText = input.missing.join(' und ');
  const intro =
    input.phase === 'eventDay'
      ? `heute war „${escapeHtml(input.eventName)}“ – für deinen Zuschuss fehlt uns noch <strong>${escapeHtml(missingText)}</strong>.`
      : `deine Veranstaltung „${escapeHtml(input.eventName)}“ ist eine Woche her. Für deinen Zuschuss fehlt uns weiterhin <strong>${escapeHtml(missingText)}</strong>.`;

  const html = layout(`
    ${paragraph(`Hallo ${name},`)}
    ${paragraph(intro)}
    ${paragraph('Ein Foto oder PDF genügt, eine Anmeldung ist nicht nötig:')}
    <div style="margin: 16px 0 8px;">${button(escapeHtml(input.proofUrl), 'Unterlagen hochladen')}</div>
    ${linkNote(input.proofUrl, input.validDays)}
    ${paragraph('Liegt schon alles vor, zeigt dir der Link das ebenfalls an – dann ist nichts zu tun.')}`);

  const text = [
    `Hallo ${input.personName},`,
    '',
    input.phase === 'eventDay'
      ? `heute war "${input.eventName}". Für deinen Zuschuss fehlt uns noch: ${missingText}.`
      : `deine Veranstaltung "${input.eventName}" ist eine Woche her. Für deinen Zuschuss fehlt uns noch: ${missingText}.`,
    '',
    `Hochladen (Foto oder PDF, ohne Anmeldung): ${input.proofUrl}`,
  ].join('\n');

  const subject =
    input.phase === 'eventDay'
      ? `Unterlagen zu ${input.eventName} nachreichen`
      : `Erinnerung: Unterlagen zu ${input.eventName} fehlen noch`;

  return { subject, html, text };
}
