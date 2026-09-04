import crypto from 'crypto';
import { FirestoreAdmin } from './firestoreAdmin';
import { verifySubsidyFormCode } from './subsidyAccessCode';
import { createSubsidyProofToken, verifySubsidyProofToken } from './subsidyProofToken';
import { sendEmail } from './email';
import { SUBSIDY_CATALOGUE, SubsidyCatalogueEntry } from '../src/data/subsidyCatalogue';
import { isValidIban } from '../src/utils/sepa';
import { dataUrlBytes } from '../src/utils/fileStorage';

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

function validateProofFile(file?: ProofFileInput): string | null {
  if (!file) return null;
  if (!file.dataUrl || !file.dataUrl.startsWith('data:')) {
    return 'Der Nachweis konnte nicht gelesen werden.';
  }
  // Serverseitige Nachkontrolle - der Browser komprimiert bereits vorher,
  // aber eine von Hand gebaute Anfrage koennte das umgehen.
  if (dataUrlBytes(file.dataUrl) > 800 * 1024) {
    return 'Die Datei ist zu groß (maximal 800 KB nach Komprimierung).';
  }
  return null;
}

/**
 * Der Zuschuss-Katalog (Veranstaltungen + Beträge) ist admin-editierbar
 * (settings/subsidyCatalogue, siehe SubsidyCatalogueModal.tsx) - anders als
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
  personName: string;
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

  const personName = (input?.personName || '').trim();
  const personEmail = (input?.personEmail || '').trim();
  const iban = (input?.iban || '').trim();
  const eventKey = (input?.eventKey || '').trim();
  const eventDate = (input?.eventDate || '').trim();
  const actualCost = Number(input?.actualCost);

  if (!personName) return { status: 400, body: { error: 'Bitte einen Namen angeben.' } };
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
    const personId = newId('pub');
    const now = new Date().toISOString();

    await FirestoreAdmin.patchDocument(`subsidyPeople/${personId}`, {
      id: personId,
      name: personName,
      type: 'interessent',
      email: personEmail,
      iban,
      bic: input.bic || undefined,
      accountHolder: input.accountHolder || undefined,
      isActive: true,
      note: 'Über öffentliches Formular angelegt',
      createdAt: now,
    });

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
      note: input.comment || undefined,
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
 * Vom Vorstand aus der App heraus ausgeloest (nicht Teil des oeffentlichen
 * Formulars), wenn ein Nachweis fehlt und noch einmal per E-Mail
 * nachgefordert werden soll. Die Anzeige-Werte (Name/Veranstaltung) kennt
 * die Admin-Ansicht bereits aus dem geladenen State - nur eine knappe
 * Existenzpruefung der subsidyId schuetzt davor, den Endpunkt als
 * beliebigen Mail-Versender zu missbrauchen.
 */
export async function handleResendProofLink(
  input: ResendProofLinkInput,
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
    const subsidy = await FirestoreAdmin.getDocument(`subsidies/${subsidyId}`);
    if (!subsidy) {
      return { status: 404, body: { error: 'Dieser Zuschuss existiert nicht mehr.' } };
    }

    const token = createSubsidyProofToken(subsidyId);
    if (!token) {
      return { status: 500, body: { error: 'SUBSIDY_PROOF_LINK_SECRET ist nicht gesetzt.' } };
    }
    const proofUploadUrl = `${appUrl.replace(/\/$/, '')}/nachweis?t=${token}`;
    const personName = input.personName || subsidy.personName || '';
    const eventName = input.eventName || subsidy.eventName || '';

    const missing = missingProofLabels(
      subsidy.proofState === 'hochgeladen',
      subsidy.costProofState === 'hochgeladen'
    );
    if (missing.length === 0) {
      return {
        status: 400,
        body: { error: 'Beide Nachweise liegen bereits vor - kein Link nötig.' },
      };
    }
    const missingText = missing.join(' und ');

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

    return { status: 200, body: { ok: true } };
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Der Nachweis konnte nicht gespeichert werden.' },
    };
  }
}
