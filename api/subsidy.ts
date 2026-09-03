import crypto from 'crypto';
import { FirestoreAdmin } from './firestoreAdmin';
import { verifySubsidyFormCode } from './subsidyAccessCode';
import { createSubsidyProofToken, verifySubsidyProofToken } from './subsidyProofToken';
import { sendEmail } from './email';
import { catalogueEntry } from '../src/data/subsidyCatalogue';
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

export async function handleVerifySubsidyCode(code: string): Promise<{ status: number; body: any }> {
  const ok = await verifySubsidyFormCode(code);
  return { status: ok ? 200 : 401, body: { ok } };
}

export interface SubmitSubsidyInput {
  accessCode: string;
  personName: string;
  personEmail?: string;
  iban: string;
  bic?: string;
  accountHolder?: string;
  eventKey: string;
  eventDate?: string;
  comment?: string;
  proofFile?: ProofFileInput;
}

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
  const iban = (input?.iban || '').trim();
  const eventKey = (input?.eventKey || '').trim();

  if (!personName) return { status: 400, body: { error: 'Bitte einen Namen angeben.' } };
  if (!iban || !isValidIban(iban)) {
    return { status: 400, body: { error: 'Diese IBAN ist ungültig.' } };
  }
  const entry = catalogueEntry(eventKey);
  if (!entry) {
    return { status: 400, body: { error: 'Bitte eine gültige Zuschuss-Art auswählen.' } };
  }

  const proofError = validateProofFile(input.proofFile);
  if (proofError) return { status: 400, body: { error: proofError } };

  try {
    const personId = newId('pub');
    const now = new Date().toISOString();

    await FirestoreAdmin.patchDocument(`subsidyPeople/${personId}`, {
      id: personId,
      name: personName,
      type: 'interessent',
      email: input.personEmail || undefined,
      iban,
      bic: input.bic || undefined,
      accountHolder: input.accountHolder || undefined,
      isActive: true,
      note: 'Über öffentliches Formular angelegt',
      createdAt: now,
    });

    const subsidyId = newId('sub');
    const hasProof = !!input.proofFile;

    await FirestoreAdmin.patchDocument(`subsidies/${subsidyId}`, {
      id: subsidyId,
      personId,
      personName,
      category: entry.category,
      eventKey: entry.key,
      eventName: entry.label,
      eventDate: input.eventDate || undefined,
      amount: entry.amount,
      status: 'beantragt',
      source: 'public',
      appliedAt: now,
      proofState: hasProof ? 'hochgeladen' : 'offen',
      proofFile: hasProof
        ? {
            name: input.proofFile!.name,
            mimeType: input.proofFile!.mimeType,
            dataUrl: input.proofFile!.dataUrl,
            uploadedAt: now,
          }
        : undefined,
      note: input.comment || undefined,
      year: new Date().getFullYear(),
      createdAt: now,
    });

    let proofUploadUrl: string | undefined;
    if (!hasProof) {
      const token = createSubsidyProofToken(subsidyId);
      if (token) {
        proofUploadUrl = `${appUrl.replace(/\/$/, '')}/nachweis?t=${token}`;
        if (input.personEmail) {
          await sendEmail({
            to: [input.personEmail],
            subject: 'Dein Nachweis-Link – Wirtschaftsjunioren Offenbach',
            html: `<p>Hallo ${personName},</p><p>vielen Dank für deinen Zuschuss-Antrag (${entry.label}). Bitte reiche deinen Nachweis über folgenden Link nach, sobald du ihn hast:</p><p><a href="${proofUploadUrl}">${proofUploadUrl}</a></p><p>Bitte diesen Link aufbewahren.</p>`,
            text: `Hallo ${personName}, bitte reiche deinen Nachweis über diesen Link nach: ${proofUploadUrl}`,
          }).catch(() => {});
        }
      }
    }

    // Vorstand informieren, damit niemand die App aktiv beobachten muss.
    const settings = await FirestoreAdmin.getDocument('settings/security').catch(() => null);
    const adminEmail = settings?.adminEmail;
    if (adminEmail) {
      await sendEmail({
        to: [adminEmail],
        subject: `Neuer Zuschuss-Antrag: ${personName} – ${entry.label}`,
        html: `<p>${personName} hat einen Zuschuss für "${entry.label}" beantragt${hasProof ? ' (Nachweis liegt bereits vor)' : ' (Nachweis folgt noch)'}.</p><p>Bitte im Vorstandsportal unter Zuschüsse prüfen.</p>`,
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
        proofState: subsidy.proofState,
        locked,
      },
    };
  } catch {
    return { status: 500, body: { ok: false, reason: 'error' } };
  }
}

export async function handleUploadProof(
  token: string,
  file: ProofFileInput
): Promise<{ status: number; body: any }> {
  const check = verifySubsidyProofToken(token);
  if (check.ok === false) {
    return { status: 400, body: { error: 'Dieser Link ist ungültig oder abgelaufen.' } };
  }
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
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
    await FirestoreAdmin.patchDocument(`subsidies/${check.payload.s}`, {
      proofState: 'hochgeladen',
      proofFile: {
        name: file.name,
        mimeType: file.mimeType,
        dataUrl: file.dataUrl,
        uploadedAt: now,
      },
    });

    return { status: 200, body: { ok: true } };
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Der Nachweis konnte nicht gespeichert werden.' },
    };
  }
}
