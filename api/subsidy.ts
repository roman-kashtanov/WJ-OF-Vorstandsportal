import crypto from 'crypto';
import { FirestoreAdmin } from './firestoreAdmin';
import { verifySubsidyFormCode } from './subsidyAccessCode';
import { createSubsidyProofToken, verifySubsidyProofToken } from './subsidyProofToken';
import { sendEmail } from './email';
import { SUBSIDY_CATALOGUE, SubsidyCatalogueEntry } from '../src/data/subsidyCatalogue';
import { isValidIban } from '../src/utils/sepa';
import { dataUrlBytes, formatBytes, MAX_STORED_BYTES } from '../src/utils/fileStorage';
import { writeNotification, writeAuditLogEntry } from './notify';
import { normalizeNameKey, joinPersonName, splitPersonName } from '../src/utils/subsidies';
import { verifyBoardCaller } from './auth';

/**
 * Oeffentliches Zuschuss-Antragsformular (/antrag) und Nachweis-Nachreichen
 * (/nachweis) - beides ohne Anmeldung, nach dem gleichen Vertrauensmodell
 * wie die E-Mail-Abstimmung (vote.ts): der Browser schreibt nie direkt in
 * Firestore, sondern nur ueber diese serverseitig validierten Endpunkte mit
 * dem Dienstkonto (FirestoreAdmin).
 */

interface ProofFileInput {
  name: string;
  mimeType?: string;
  dataUrl: string;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Vor- und Nachname aus der Anfrage. Aeltere, noch zwischengespeicherte
 * Formulare schicken nur `personName` - dann wird am letzten Leerzeichen
 * getrennt.
 */
function readPersonName(input: { firstName?: string; lastName?: string; personName?: string }) {
  const firstName = (input?.firstName || '').trim();
  const lastName = (input?.lastName || '').trim();
  if (firstName || lastName) return { firstName, lastName };
  return splitPersonName(input?.personName || '');
}

interface PublicPersonInput {
  firstName: string;
  lastName: string;
  email: string;
  iban: string;
  bic?: string;
  accountHolder?: string;
}

const compactIban = (iban?: string) => (iban || '').replace(/\s+/g, '').toUpperCase();

/**
 * Ordnet einen oeffentlich eingereichten Vorgang einer Person zu. Massgeblich
 * sind Vor- und Nachname (Reihenfolge, Gross-/Kleinschreibung und Umlaute
 * egal, siehe normalizeNameKey) - NICHT die E-Mail-Adresse. Nur so greift die
 * Jahresgrenze je Person, auch wenn jemand eine andere Adresse benutzt.
 * Frueher wurde fuer jeden Antrag eine neue Person angelegt.
 *
 * Bestehende Kontakt- und Bankdaten werden bewusst NIE ueberschrieben: sonst
 * koennte jeder mit dem Zugangscode unter fremdem Namen die IBAN eines
 * Mitglieds austauschen. Fehlende Angaben werden ergaenzt; Abweichungen
 * landen als Hinweis am Vorgang, damit der Vorstand sie bewusst prueft.
 */
async function findOrCreatePublicPerson(
  person: PublicPersonInput,
  createdNote: string,
  now: string
): Promise<{ personId: string; personName: string; hint?: string }> {
  const name = joinPersonName(person.firstName, person.lastName);
  const key = normalizeNameKey(name);

  let existing: Record<string, any> | undefined;
  try {
    const all = await FirestoreAdmin.listDocuments('subsidyPeople', [
      'id',
      'name',
      'firstName',
      'lastName',
      'email',
      'iban',
      'bic',
      'accountHolder',
      'createdAt',
    ]);
    existing = all
      .filter((p) => typeof p.name === 'string' && normalizeNameKey(p.name) === key)
      .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')))[0];
  } catch {
    // Abgleich nicht moeglich - lieber eine neue Person anlegen (in der
    // Personenuebersicht zusammenfuehrbar) als den Antrag abzulehnen.
  }

  if (!existing?.id) {
    const personId = newId('pub');
    await FirestoreAdmin.patchDocument(`subsidyPeople/${personId}`, {
      id: personId,
      name,
      firstName: person.firstName,
      lastName: person.lastName,
      type: 'interessent',
      email: person.email,
      iban: person.iban,
      bic: person.bic || undefined,
      accountHolder: person.accountHolder || undefined,
      isActive: true,
      note: createdNote,
      createdAt: now,
    });
    return { personId, personName: name };
  }

  const fill: Record<string, any> = {};
  if (!existing.email && person.email) fill.email = person.email;
  if (!existing.iban && person.iban) fill.iban = person.iban;
  if (!existing.bic && person.bic) fill.bic = person.bic;
  if (!existing.accountHolder && person.accountHolder) fill.accountHolder = person.accountHolder;
  if (!existing.firstName && !existing.lastName) {
    fill.firstName = person.firstName;
    fill.lastName = person.lastName;
  }
  if (Object.keys(fill).length > 0) {
    await FirestoreAdmin.patchDocument(`subsidyPeople/${existing.id}`, fill);
  }

  const differences: string[] = [];
  if (existing.email && person.email && String(existing.email).toLowerCase() !== person.email.toLowerCase()) {
    differences.push(`E-Mail ${person.email}`);
  }
  if (existing.iban && person.iban && compactIban(existing.iban) !== compactIban(person.iban)) {
    differences.push(`IBAN ${person.iban}`);
  }

  return {
    personId: existing.id,
    personName: existing.name,
    hint: differences.length
      ? `Hinweis: Im Formular abweichend angegeben – ${differences.join(', ')}. Bei der Person bleiben die bisherigen Daten hinterlegt.`
      : undefined,
  };
}

function validateProofFile(file?: ProofFileInput): string | null {
  if (!file) return null;
  if (!file.dataUrl || !file.dataUrl.startsWith('data:')) {
    return 'Der Nachweis konnte nicht gelesen werden.';
  }
  // Serverseitige Nachkontrolle - der Browser komprimiert bereits vorher,
  // aber eine von Hand gebaute Anfrage koennte das umgehen. Derselbe Wert
  // wie beim clientseitigen Komprimieren (MAX_STORED_BYTES) - ein Zuschuss
  // kann zwei solche Dateien gleichzeitig tragen (Teilnahme- + Kosten-
  // nachweis), die Grenze ist also bewusst so bemessen, dass zwei Dateien
  // zusammen unter der 1-MiB-Firestore-Grenze bleiben.
  if (dataUrlBytes(file.dataUrl) > MAX_STORED_BYTES) {
    return `Die Datei ist zu groß (maximal ${formatBytes(MAX_STORED_BYTES)} nach Komprimierung).`;
  }
  return null;
}

/**
 * Der Zuschuss-Katalog (Veranstaltungen + Beträge) ist admin-editierbar
 * (settings/subsidyCatalogue, siehe SubsidyCatalogueEditor.tsx) - anders als
 * frueher kann er nicht mehr statisch importiert werden. Ohne Dokument
 * (frische Installation, oder lokal ohne FIREBASE_SERVICE_ACCOUNT) wird der
 * eingebaute Standard aus der Richtlinie als Fallback verwendet.
 */
async function loadCatalogueEntries(): Promise<SubsidyCatalogueEntry[]> {
  try {
    const settings = await FirestoreAdmin.getDocument('settings/subsidyCatalogue');
    if (settings?.entries && Array.isArray(settings.entries) && settings.entries.length > 0) {
      return settings.entries as SubsidyCatalogueEntry[];
    }
  } catch {
    // faellt unten auf den Standard zurueck
  }
  return SUBSIDY_CATALOGUE;
}

export async function handleGetSubsidyCatalogue(): Promise<{ status: number; body: any }> {
  const entries = await loadCatalogueEntries();
  return { status: 200, body: { entries } };
}

/**
 * Baut aus den beiden Nachweis-Status eine konkrete, fuer Antragsteller
 * verstaendliche Liste - genutzt sowohl in der Erstbestaetigung
 * (handleSubmitSubsidy) als auch beim erneuten Anfordern
 * (handleResendProofLink), damit beide Mails immer sagen, WAS genau fehlt,
 * statt nur generisch "den Nachweis".
 */
function missingProofLabels(hasAttendanceProof: boolean, hasCostProof: boolean): string[] {
  return [
    !hasAttendanceProof ? 'Teilnahmenachweis' : null,
    !hasCostProof ? 'Kostennachweis (Rechnung)' : null,
  ].filter((x): x is string => x !== null);
}

export async function handleVerifySubsidyCode(code: string): Promise<{ status: number; body: any }> {
  const ok = await verifySubsidyFormCode(code);
  return { status: ok ? 200 : 401, body: { ok } };
}

export interface SubmitSubsidyInput {
  accessCode: string;
  firstName?: string;
  lastName?: string;
  /** Nur noch von aelteren, zwischengespeicherten Formularen. */
  personName?: string;
  personEmail: string;
  iban: string;
  bic?: string;
  accountHolder?: string;
  eventKey: string;
  eventDate: string;
  actualCost: number;
  comment?: string;
  attendanceProofFile?: ProofFileInput;
  costProofFile?: ProofFileInput;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleSubmitSubsidy(
  input: SubmitSubsidyInput,
  appUrl: string
): Promise<{ status: number; body: any }> {
  if (!FirestoreAdmin.isConfigured()) {
    return {
      status: 500,
      body: { error: 'Der Server ist nicht eingerichtet (FIREBASE_SERVICE_ACCOUNT fehlt).' },
    };
  }

  const codeOk = await verifySubsidyFormCode(input?.accessCode || '');
  if (!codeOk) {
    return { status: 401, body: { error: 'Zugangscode ist falsch oder abgelaufen.' } };
  }

  const { firstName, lastName } = readPersonName(input);
  const personEmail = (input?.personEmail || '').trim();
  const iban = (input?.iban || '').trim();
  const eventKey = (input?.eventKey || '').trim();
  const eventDate = (input?.eventDate || '').trim();
  const actualCost = Number(input?.actualCost);

  if (!firstName || !lastName) {
    return { status: 400, body: { error: 'Bitte Vor- und Nachnamen angeben.' } };
  }
  if (!personEmail || !EMAIL_PATTERN.test(personEmail)) {
    return { status: 400, body: { error: 'Bitte eine gültige E-Mail-Adresse angeben.' } };
  }
  if (!iban || !isValidIban(iban)) {
    return { status: 400, body: { error: 'Diese IBAN ist ungültig.' } };
  }
  const catalogueEntries = await loadCatalogueEntries();
  const entry = catalogueEntries.find((e) => e.key === eventKey);
  if (!entry) {
    return { status: 400, body: { error: 'Bitte eine gültige Zuschuss-Art auswählen.' } };
  }
  if (!eventDate) {
    return { status: 400, body: { error: 'Bitte das Datum der Veranstaltung angeben.' } };
  }
  if (!actualCost || actualCost <= 0) {
    return { status: 400, body: { error: 'Bitte die tatsächlichen Kosten angeben.' } };
  }

  const attendanceProofError = validateProofFile(input.attendanceProofFile);
  if (attendanceProofError) return { status: 400, body: { error: attendanceProofError } };
  const costProofError = validateProofFile(input.costProofFile);
  if (costProofError) return { status: 400, body: { error: costProofError } };

  try {
    const now = new Date().toISOString();
    const { personId, personName, hint } = await findOrCreatePublicPerson(
      {
        firstName,
        lastName,
        email: personEmail,
        iban,
        bic: input.bic,
        accountHolder: input.accountHolder,
      },
      'Über öffentliches Formular angelegt',
      now
    );

    const subsidyId = newId('sub');
    const hasAttendanceProof = !!input.attendanceProofFile;
    const hasCostProof = !!input.costProofFile;

    // § 9 der Richtlinie: der Zuschuss darf die tatsächlichen Kosten nie
    // uebersteigen - technisch durchgesetzt statt nur als Hinweis.
    const amount = Math.min(entry.amount, actualCost);

    // Liegt die Veranstaltung noch in der Zukunft, koennen zwangslaeufig
    // noch keine Nachweise vorliegen - eigener Status, bis das Datum
    // erreicht ist (siehe die automatische Kaskade in useSubsidies.ts).
    const isFuture = eventDate > now.slice(0, 10);

    await FirestoreAdmin.patchDocument(`subsidies/${subsidyId}`, {
      id: subsidyId,
      personId,
      personName,
      category: entry.category,
      eventKey: entry.key,
      eventName: entry.label,
      eventDate,
      amount,
      actualCost,
      status: isFuture ? 'nicht_stattgefunden' : 'beantragt',
      source: 'public',
      appliedAt: now,
      proofState: hasAttendanceProof ? 'hochgeladen' : 'offen',
      proofFile: hasAttendanceProof
        ? {
            name: input.attendanceProofFile!.name,
            mimeType: input.attendanceProofFile!.mimeType,
            dataUrl: input.attendanceProofFile!.dataUrl,
            uploadedAt: now,
          }
        : undefined,
      costProofState: hasCostProof ? 'hochgeladen' : 'offen',
      costProofFile: hasCostProof
        ? {
            name: input.costProofFile!.name,
            mimeType: input.costProofFile!.mimeType,
            dataUrl: input.costProofFile!.dataUrl,
            uploadedAt: now,
          }
        : undefined,
      note: [input.comment, hint].filter(Boolean).join('\n\n') || undefined,
      year: new Date().getFullYear(),
      createdAt: now,
    });

    const missing = missingProofLabels(hasAttendanceProof, hasCostProof);

    let proofUploadUrl: string | undefined;
    if (missing.length > 0) {
      const token = createSubsidyProofToken(subsidyId);
      if (token) {
        proofUploadUrl = `${appUrl.replace(/\/$/, '')}/nachweis?t=${token}`;
        const missingText = missing.join(' und ');
        await sendEmail({
          to: [personEmail],
          subject: 'Dein Nachweis-Link – Wirtschaftsjunioren Offenbach',
          html: `<p>Hallo ${personName},</p><p>vielen Dank für deinen Zuschuss-Antrag (${entry.label}). Es fehlt uns noch: <strong>${missingText}</strong>. Bitte über folgenden Link nachreichen:</p><p><a href="${proofUploadUrl}">${proofUploadUrl}</a></p><p>Bitte diesen Link aufbewahren.</p>`,
          text: `Hallo ${personName}, es fehlt uns noch: ${missingText}. Bitte über diesen Link nachreichen: ${proofUploadUrl}`,
        }).catch(() => {});
      }
    }

    // Vorstand informieren, damit niemand die App aktiv beobachten muss.
    const settings = await FirestoreAdmin.getDocument('settings/security').catch(() => null);
    const adminEmail = settings?.adminEmail;
    if (adminEmail) {
      await sendEmail({
        to: [adminEmail],
        subject: `Neuer Zuschuss-Antrag: ${personName} – ${entry.label}`,
        html: `<p>${personName} hat einen Zuschuss für "${entry.label}" beantragt.</p><p>${
          missing.length > 0 ? `Es fehlt noch: ${missing.join(' und ')}.` : 'Beide Nachweise liegen bereits vor.'
        }</p><p>Bitte im Vorstandsportal unter Zuschüsse prüfen.</p>`,
        text: `${personName} hat einen Zuschuss für "${entry.label}" beantragt. Bitte im Portal prüfen.`,
      }).catch(() => {});
    }

    await writeNotification({
      title: `💶 Neuer Zuschuss-Antrag: ${entry.label}`,
      message: `${personName} hat einen Zuschuss für "${entry.label}" beantragt.`,
      type: 'subsidy',
      targetTab: 'subsidies',
      targetId: subsidyId,
    });
    await writeAuditLogEntry({
      entityType: 'subsidy',
      entityId: subsidyId,
      entityLabel: `${personName} – ${entry.label}`,
      action: 'Antrag über das öffentliche Formular eingereicht',
      actorName: 'Öffentliches Formular',
    });

    return { status: 200, body: { ok: true, subsidyId, proofUploadUrl } };
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Der Antrag konnte nicht gespeichert werden.' },
    };
  }
}

export interface ResendProofLinkInput {
  subsidyId: string;
  email: string;
  personName: string;
  eventName: string;
}

/**
 * Gemeinsam fuer "Nachweis-Link senden" und "Link kopieren": prueft, dass der
 * Zuschuss existiert und noch ein Nachweis fehlt, und baut den signierten
 * Link zur /nachweis-Seite (siehe subsidyProofToken.ts).
 */
async function buildProofLink(
  subsidyId: string,
  appUrl: string
): Promise<
  | { ok: true; url: string; subsidy: Record<string, any>; missingText: string }
  | { ok: false; status: number; body: any }
> {
  const subsidy = await FirestoreAdmin.getDocument(`subsidies/${subsidyId}`);
  if (!subsidy) {
    return { ok: false, status: 404, body: { error: 'Dieser Zuschuss existiert nicht mehr.' } };
  }

  const missing = missingProofLabels(
    subsidy.proofState === 'hochgeladen',
    subsidy.costProofState === 'hochgeladen'
  );
  if (missing.length === 0) {
    return {
      ok: false,
      status: 400,
      body: { error: 'Beide Nachweise liegen bereits vor - kein Link nötig.' },
    };
  }

  const token = createSubsidyProofToken(subsidyId);
  if (!token) {
    return { ok: false, status: 500, body: { error: 'SUBSIDY_PROOF_LINK_SECRET ist nicht gesetzt.' } };
  }

  return {
    ok: true,
    url: `${appUrl.replace(/\/$/, '')}/nachweis?t=${token}`,
    subsidy,
    missingText: missing.join(' und '),
  };
}

/**
 * Vom Vorstand aus der App heraus ausgeloest (nicht Teil des oeffentlichen
 * Formulars), wenn ein Nachweis fehlt und noch einmal per E-Mail
 * nachgefordert werden soll.
 *
 * Seit v3.23.0 nur fuer angemeldete Vorstandsmitglieder: vorher genuegte eine
 * bekannte subsidyId, um sich einen gueltigen Hochlade-Link an eine beliebige
 * Adresse schicken zu lassen.
 */
export async function handleResendProofLink(
  input: ResendProofLinkInput & { idToken?: string },
  appUrl: string
): Promise<{ status: number; body: any }> {
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }

  const subsidyId = (input?.subsidyId || '').trim();
  const email = (input?.email || '').trim();
  if (!subsidyId || !email || !EMAIL_PATTERN.test(email)) {
    return { status: 400, body: { error: 'subsidyId und eine gültige E-Mail werden benötigt.' } };
  }

  try {
    const caller = await verifyBoardCaller(input?.idToken);
    if (caller.ok === false) return caller.result;

    const link = await buildProofLink(subsidyId, appUrl);
    if (link.ok === false) return { status: link.status, body: link.body };
    const { url: proofUploadUrl, subsidy, missingText } = link;
    const personName = input.personName || subsidy.personName || '';
    const eventName = input.eventName || subsidy.eventName || '';

    const result = await sendEmail({
      to: [email],
      subject: `Erinnerung: Nachweis für deinen Zuschuss-Antrag${eventName ? ` (${eventName})` : ''}`,
      html: `<p>Hallo ${personName},</p><p>der Vorstand bittet dich, zu deinem Zuschuss-Antrag${eventName ? ` für "${eventName}"` : ''} noch <strong>${missingText}</strong> nachzureichen:</p><p><a href="${proofUploadUrl}">${proofUploadUrl}</a></p>`,
      text: `Hallo ${personName}, bitte reiche noch ${missingText} über diesen Link nach: ${proofUploadUrl}`,
    });

    if (result.status >= 400) {
      return { status: result.status, body: result.body };
    }

    return { status: 200, body: { ok: true } };
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Der Nachweis-Link konnte nicht versendet werden.' },
    };
  }
}

/**
 * "Link kopieren": liefert denselben Nachweis-Link wie die E-Mail, ohne sie
 * zu verschicken - zum Weiterleiten z. B. per WhatsApp. Nur fuer angemeldete
 * Vorstandsmitglieder, denn wer den Link hat, kann Nachweise hochladen. Jeder
 * Abruf landet in der Historie des Zuschusses.
 */
export async function handleGetProofLink(
  input: { idToken?: string; subsidyId?: string },
  appUrl: string
): Promise<{ status: number; body: any }> {
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }

  const subsidyId = (input?.subsidyId || '').trim();
  if (!subsidyId) {
    return { status: 400, body: { error: 'subsidyId wird benötigt.' } };
  }

  try {
    const caller = await verifyBoardCaller(input?.idToken);
    if (caller.ok === false) return caller.result;

    const link = await buildProofLink(subsidyId, appUrl);
    if (link.ok === false) return { status: link.status, body: link.body };

    await writeAuditLogEntry({
      entityType: 'subsidy',
      entityId: subsidyId,
      entityLabel: `${link.subsidy.personName || ''} – ${link.subsidy.eventName || ''}`,
      action: 'Nachweis-Link zum Weiterleiten kopiert',
      actorName: caller.email,
    }).catch(() => {});

    return { status: 200, body: { ok: true, url: link.url, missing: link.missingText } };
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Der Nachweis-Link konnte nicht erzeugt werden.' },
    };
  }
}

export async function handleGetProofStatus(token: string): Promise<{ status: number; body: any }> {
  const check = verifySubsidyProofToken(token);
  if (check.ok === false) {
    return { status: 400, body: { ok: false, reason: check.reason } };
  }
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { ok: false, reason: 'not_configured' } };
  }

  try {
    const subsidy = await FirestoreAdmin.getDocument(`subsidies/${check.payload.s}`);
    if (!subsidy) {
      return { status: 404, body: { ok: false, reason: 'not_found' } };
    }

    const locked =
      !!subsidy.resolutionId || subsidy.status === 'bezahlt' || subsidy.status === 'abgelehnt';

    return {
      status: 200,
      body: {
        ok: true,
        eventName: subsidy.eventName,
        personName: subsidy.personName,
        attendanceProofState: subsidy.proofState,
        costProofState: subsidy.costProofState,
        locked,
      },
    };
  } catch {
    return { status: 500, body: { ok: false, reason: 'error' } };
  }
}

export async function handleUploadProof(
  token: string,
  file: ProofFileInput,
  proofType: 'attendance' | 'cost'
): Promise<{ status: number; body: any }> {
  const check = verifySubsidyProofToken(token);
  if (check.ok === false) {
    return { status: 400, body: { error: 'Dieser Link ist ungültig oder abgelaufen.' } };
  }
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }
  if (proofType !== 'attendance' && proofType !== 'cost') {
    return { status: 400, body: { error: 'Unbekannter Nachweistyp.' } };
  }

  const proofError = validateProofFile(file);
  if (proofError) return { status: 400, body: { error: proofError } };
  if (!file) return { status: 400, body: { error: 'Keine Datei erhalten.' } };

  try {
    const subsidy = await FirestoreAdmin.getDocument(`subsidies/${check.payload.s}`);
    if (!subsidy) return { status: 404, body: { error: 'Dieser Zuschuss existiert nicht mehr.' } };

    if (subsidy.resolutionId || subsidy.status === 'bezahlt' || subsidy.status === 'abgelehnt') {
      return {
        status: 409,
        body: {
          error:
            'Dieser Antrag ist bereits in Bearbeitung und kann über diesen Link nicht mehr geändert werden. Bitte den Vorstand kontaktieren.',
        },
      };
    }

    // Schutz gegen stillschweigendes Ueberschreiben: die /nachweis-Seite
    // fragt bei jedem Oeffnen den LIVE-Stand ab und blendet das Formular
    // fuer einen bereits hochgeladenen Nachweis aus - das greift aber nicht,
    // wenn jemand eine Seite von einem AELTEREN Link noch offen hatte
    // (z. B. weil zwischenzeitlich ein Erinnerungslink verschickt und
    // darueber schon hochgeladen wurde) und danach trotzdem absendet.
    const alreadyUploaded =
      proofType === 'attendance'
        ? subsidy.proofState === 'hochgeladen'
        : subsidy.costProofState === 'hochgeladen';
    if (alreadyUploaded) {
      return {
        status: 409,
        body: {
          error: `${
            proofType === 'attendance' ? 'Der Teilnahmenachweis' : 'Der Kostennachweis'
          } liegt bereits vor und kann über diesen Link nicht mehr ersetzt werden. Bitte den Vorstand kontaktieren, falls er ausgetauscht werden muss.`,
        },
      };
    }

    const now = new Date().toISOString();
    const uploadedFile = {
      name: file.name,
      mimeType: file.mimeType,
      dataUrl: file.dataUrl,
      uploadedAt: now,
    };
    await FirestoreAdmin.patchDocument(
      `subsidies/${check.payload.s}`,
      proofType === 'attendance'
        ? { proofState: 'hochgeladen', proofFile: uploadedFile }
        : { costProofState: 'hochgeladen', costProofFile: uploadedFile }
    );

    const proofTypeLabel = proofType === 'attendance' ? 'Teilnahmenachweis' : 'Kostennachweis (Rechnung)';
    await writeNotification({
      title: `📎 Nachweis hochgeladen: ${subsidy.eventName}`,
      message: `${subsidy.personName} hat den ${proofTypeLabel} zum Zuschuss "${subsidy.eventName}" hochgeladen.`,
      type: 'subsidy',
      targetTab: 'subsidies',
      targetId: check.payload.s,
    });
    await writeAuditLogEntry({
      entityType: 'subsidy',
      entityId: check.payload.s,
      entityLabel: `${subsidy.personName} – ${subsidy.eventName}`,
      action: `${proofTypeLabel} über den Nachweis-Link hochgeladen`,
      actorName: 'Öffentliches Formular',
    });

    return { status: 200, body: { ok: true } };
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Der Nachweis konnte nicht gespeichert werden.' },
    };
  }
}

// ---------------------------------------------------------------------------
// Auslagenerstattung (/auslage) - gleicher Ablauf wie beim Zuschuss, aber:
// kein Richtlinien-Katalog, keine Budgetgrenzen, dafuer ist der Beleg
// PFLICHT. Ohne Rechnung gibt es nichts zu erstatten, deshalb wird hier
// serverseitig darauf bestanden statt nur erinnert.
// ---------------------------------------------------------------------------

export interface SubmitExpenseInput {
  accessCode: string;
  firstName?: string;
  lastName?: string;
  /** Nur noch von aelteren, zwischengespeicherten Formularen. */
  personName?: string;
  personEmail: string;
  iban: string;
  bic?: string;
  accountHolder?: string;
  /** Frei benannt - eine Auslage haengt nicht am Veranstaltungskatalog. */
  purpose: string;
  /** Optional: leer heisst "ohne Veranstaltung". */
  eventName?: string;
  expenseDate: string;
  amount: number;
  comment?: string;
  receiptFile?: ProofFileInput;
}

export async function handleSubmitExpense(
  input: SubmitExpenseInput,
  appUrl: string
): Promise<{ status: number; body: any }> {
  if (!FirestoreAdmin.isConfigured()) {
    return {
      status: 500,
      body: { error: 'Der Server ist nicht eingerichtet (FIREBASE_SERVICE_ACCOUNT fehlt).' },
    };
  }

  const codeOk = await verifySubsidyFormCode(input?.accessCode || '');
  if (!codeOk) {
    return { status: 401, body: { error: 'Zugangscode ist falsch oder abgelaufen.' } };
  }

  const { firstName, lastName } = readPersonName(input);
  const personEmail = (input?.personEmail || '').trim();
  const iban = (input?.iban || '').trim();
  const purpose = (input?.purpose || '').trim();
  const eventName = (input?.eventName || '').trim();
  const expenseDate = (input?.expenseDate || '').trim();
  const amount = Number(input?.amount);

  if (!firstName || !lastName) {
    return { status: 400, body: { error: 'Bitte Vor- und Nachnamen angeben.' } };
  }
  if (!personEmail || !EMAIL_PATTERN.test(personEmail)) {
    return { status: 400, body: { error: 'Bitte eine gültige E-Mail-Adresse angeben.' } };
  }
  if (!iban || !isValidIban(iban)) {
    return { status: 400, body: { error: 'Diese IBAN ist ungültig.' } };
  }
  if (!purpose) {
    return { status: 400, body: { error: 'Bitte angeben, wofür die Auslage entstanden ist.' } };
  }
  if (!expenseDate) {
    return { status: 400, body: { error: 'Bitte das Datum des Belegs angeben.' } };
  }
  if (!amount || amount <= 0) {
    return { status: 400, body: { error: 'Bitte den Betrag des Belegs angeben.' } };
  }

  // Der Beleg ist bei einer Erstattung Pflicht - anders als beim Zuschuss
  // kann er nicht nachgereicht werden, sonst waere nichts zu pruefen.
  if (!input.receiptFile) {
    return { status: 400, body: { error: 'Bitte die Rechnung bzw. den Beleg hochladen.' } };
  }
  const receiptError = validateProofFile(input.receiptFile);
  if (receiptError) return { status: 400, body: { error: receiptError } };

  try {
    const now = new Date().toISOString();
    const { personId, personName, hint } = await findOrCreatePublicPerson(
      {
        firstName,
        lastName,
        email: personEmail,
        iban,
        bic: input.bic,
        accountHolder: input.accountHolder,
      },
      'Über das Auslagen-Formular angelegt',
      now
    );

    const expenseId = newId('exp');
    const label = eventName ? `${purpose} (${eventName})` : purpose;

    await FirestoreAdmin.patchDocument(`subsidies/${expenseId}`, {
      id: expenseId,
      kind: 'auslage',
      personId,
      personName,
      category: 'sonstiges',
      eventName: label,
      eventDate: expenseDate,
      amount,
      actualCost: amount,
      status: 'beantragt',
      source: 'public',
      appliedAt: now,
      // Der Beleg IST der Kostennachweis; einen davon getrennten
      // Teilnahmenachweis gibt es bei einer Auslage nicht.
      proofState: 'anderweitig',
      proofNote: 'Bei einer Auslagenerstattung nicht erforderlich',
      costProofState: 'hochgeladen',
      costProofFile: {
        name: input.receiptFile.name,
        mimeType: input.receiptFile.mimeType,
        dataUrl: input.receiptFile.dataUrl,
        uploadedAt: now,
      },
      note: [input.comment, hint].filter(Boolean).join('\n\n') || undefined,
      year: new Date().getFullYear(),
      createdAt: now,
    });

    const settings = await FirestoreAdmin.getDocument('settings/security').catch(() => null);
    const adminEmail = settings?.adminEmail;
    if (adminEmail) {
      await sendEmail({
        to: [adminEmail],
        subject: `Neue Auslagenerstattung: ${personName} – ${label}`,
        html: `<p>${personName} hat eine Auslagenerstattung über <strong>${amount.toFixed(
          2
        )} €</strong> eingereicht: "${label}".</p><p>Der Beleg liegt bereits bei. Bitte im Vorstandsportal unter Auslagen prüfen.</p>`,
        text: `${personName} hat eine Auslagenerstattung über ${amount.toFixed(
          2
        )} € eingereicht: "${label}". Bitte im Portal unter Auslagen prüfen.`,
      }).catch(() => {});
    }

    await writeNotification({
      title: `🧾 Neue Auslagenerstattung: ${label}`,
      message: `${personName} bittet um Erstattung von ${amount.toFixed(2)} €.`,
      type: 'subsidy',
      targetTab: 'expenses',
      targetId: expenseId,
    });
    await writeAuditLogEntry({
      entityType: 'subsidy',
      entityId: expenseId,
      entityLabel: `${personName} – ${label}`,
      action: 'Auslagenerstattung über das öffentliche Formular eingereicht',
      actorName: 'Öffentliches Formular',
    });

    return { status: 200, body: { ok: true, expenseId } };
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Die Auslage konnte nicht gespeichert werden.' },
    };
  }
}
