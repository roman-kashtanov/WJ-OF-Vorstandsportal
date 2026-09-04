import crypto from 'crypto';
import { FirestoreAdmin } from './firestoreAdmin';
import {
  createInvoiceAttachmentToken,
  verifyInvoiceAttachmentToken,
} from './invoiceAttachmentToken';
import { sendEmail } from './email';
import { dataUrlBytes, formatBytes, MAX_STORED_BYTES } from '../src/utils/fileStorage';
import { writeNotification, writeAuditLogEntry } from './notify';

/**
 * Oeffentlicher Beleg-Nachreichelink zu einem Beschluss (/beleg) - ohne
 * Anmeldung, nach demselben Vertrauensmodell wie subsidy.ts: der Browser
 * schreibt nie direkt in Firestore, sondern nur ueber diese serverseitig
 * validierten Endpunkte mit dem Dienstkonto (FirestoreAdmin). Anders als
 * beim Zuschuss-Nachweis entsteht hier ein vollwertiger Invoice-Datensatz,
 * verknuepft mit dem Beschluss UND sichtbar in der normalen Belege-
 * uebersicht (beide lesen aus derselben invoices-Collection).
 */

interface ProofFileInput {
  name: string;
  mimeType?: string;
  dataUrl: string;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function validateFile(file?: ProofFileInput): string | null {
  if (!file) return null;
  if (!file.dataUrl || !file.dataUrl.startsWith('data:')) {
    return 'Die Datei konnte nicht gelesen werden.';
  }
  // Derselbe Wert wie beim clientseitigen Komprimieren (MAX_STORED_BYTES,
  // src/utils/fileStorage.ts) - Sicherheitsnetz gegen von Hand gebaute
  // Anfragen ohne Client-Komprimierung.
  if (dataUrlBytes(file.dataUrl) > MAX_STORED_BYTES) {
    return `Die Datei ist zu groß (maximal ${formatBytes(MAX_STORED_BYTES)} nach Komprimierung).`;
  }
  return null;
}

export interface RequestInvoiceAttachmentLinkInput {
  resolutionId: string;
  recipientEmail: string;
  recipientName?: string;
}

export async function handleRequestInvoiceAttachmentLink(
  input: RequestInvoiceAttachmentLinkInput,
  appUrl: string
): Promise<{ status: number; body: any }> {
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }

  const resolutionId = (input?.resolutionId || '').trim();
  const recipientEmail = (input?.recipientEmail || '').trim();
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!resolutionId || !recipientEmail || !EMAIL_PATTERN.test(recipientEmail)) {
    return {
      status: 400,
      body: { error: 'resolutionId und eine gültige E-Mail werden benötigt.' },
    };
  }

  try {
    const resolution = await FirestoreAdmin.getDocument(`resolutions/${resolutionId}`);
    if (!resolution) {
      return { status: 404, body: { error: 'Dieser Beschluss existiert nicht mehr.' } };
    }

    const token = createInvoiceAttachmentToken(resolutionId);
    if (!token) {
      return { status: 500, body: { error: 'INVOICE_ATTACHMENT_LINK_SECRET ist nicht gesetzt.' } };
    }
    const uploadUrl = `${appUrl.replace(/\/$/, '')}/beleg?t=${token}`;
    const recipientName = input.recipientName || '';
    const resolutionLabel = `${resolution.number}${resolution.title ? ` – ${resolution.title}` : ''}`;

    const result = await sendEmail({
      to: [recipientEmail],
      subject: `Beleg nachreichen: ${resolutionLabel}`,
      html: `<p>Hallo${recipientName ? ` ${recipientName}` : ''},</p><p>der Vorstand bittet dich, zum Beschluss "${resolutionLabel}" eine Rechnung/einen Beleg nachzureichen:</p><p><a href="${uploadUrl}">${uploadUrl}</a></p>`,
      text: `Hallo${recipientName ? ` ${recipientName}` : ''}, bitte reiche zum Beschluss "${resolutionLabel}" eine Rechnung/einen Beleg über diesen Link nach: ${uploadUrl}`,
    });

    if (result.status >= 400) {
      return { status: result.status, body: result.body };
    }

    return { status: 200, body: { ok: true } };
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Der Link konnte nicht versendet werden.' },
    };
  }
}

export async function handleGetInvoiceAttachmentStatus(
  token: string
): Promise<{ status: number; body: any }> {
  const check = verifyInvoiceAttachmentToken(token);
  if (check.ok === false) {
    return { status: 400, body: { ok: false, reason: check.reason } };
  }
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { ok: false, reason: 'not_configured' } };
  }

  try {
    const resolution = await FirestoreAdmin.getDocument(`resolutions/${check.payload.r}`);
    if (!resolution) {
      return { status: 404, body: { ok: false, reason: 'not_found' } };
    }
    return {
      status: 200,
      body: {
        ok: true,
        resolutionTitle: resolution.title,
        resolutionNumber: resolution.number,
      },
    };
  } catch {
    return { status: 500, body: { ok: false, reason: 'error' } };
  }
}

export interface SubmitInvoiceAttachmentInput {
  token: string;
  title: string;
  vendor: string;
  amount: number;
  date: string;
  category?: string;
  submittedByName?: string;
  file: ProofFileInput;
}

export async function handleSubmitInvoiceAttachment(
  input: SubmitInvoiceAttachmentInput
): Promise<{ status: number; body: any }> {
  const check = verifyInvoiceAttachmentToken(input?.token || '');
  if (check.ok === false) {
    return { status: 400, body: { error: 'Dieser Link ist ungültig oder abgelaufen.' } };
  }
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }

  const title = (input?.title || '').trim();
  const vendor = (input?.vendor || '').trim();
  const amount = Number(input?.amount);
  const date = (input?.date || '').trim();

  if (!title) return { status: 400, body: { error: 'Bitte einen Titel angeben.' } };
  if (!vendor) return { status: 400, body: { error: 'Bitte den Lieferanten/Anbieter angeben.' } };
  if (!amount || amount <= 0) {
    return { status: 400, body: { error: 'Bitte einen gültigen Betrag angeben.' } };
  }
  if (!date) return { status: 400, body: { error: 'Bitte ein Datum angeben.' } };

  const fileError = validateFile(input.file);
  if (fileError) return { status: 400, body: { error: fileError } };

  try {
    const resolution = await FirestoreAdmin.getDocument(`resolutions/${check.payload.r}`);
    if (!resolution) {
      return { status: 404, body: { error: 'Dieser Beschluss existiert nicht mehr.' } };
    }

    const invoiceId = newId('inv');
    const now = new Date().toISOString();
    const submittedByName = input.submittedByName?.trim() || 'Extern';

    const invoice = {
      id: invoiceId,
      invoiceNumber: `BELEG-${Date.now().toString().slice(-6)}`,
      title,
      vendor,
      amount,
      date,
      category: input.category || 'Sonstiges',
      status: 'eingereicht',
      hasResolution: true,
      resolutionId: check.payload.r,
      resolutionNumber: resolution.number,
      resolutionTitle: resolution.title,
      submittedBy: { id: 'link', name: submittedByName, role: 'Extern' },
      fileUrl: input.file?.dataUrl,
      fileName: input.file?.name,
      fileType: input.file?.mimeType?.startsWith('image/') ? 'image' : 'pdf',
      createdAt: now,
    };

    await FirestoreAdmin.patchDocument(`invoices/${invoiceId}`, invoice);

    const linkedInvoiceIds: string[] = Array.isArray(resolution.linkedInvoiceIds)
      ? resolution.linkedInvoiceIds
      : [];
    await FirestoreAdmin.patchDocument(`resolutions/${check.payload.r}`, {
      linkedInvoiceIds: [...linkedInvoiceIds, invoiceId],
    });

    const resolutionLabel = `${resolution.number}${resolution.title ? ` – ${resolution.title}` : ''}`;
    await writeNotification({
      title: `📥 Beleg nachgereicht: ${resolutionLabel}`,
      message: `${submittedByName} hat einen Beleg für "${title}" (${amount.toFixed(2)} €) zum Beschluss "${resolutionLabel}" nachgereicht.`,
      type: 'invoice',
      targetTab: 'invoices',
      targetId: invoiceId,
    });
    await writeAuditLogEntry({
      entityType: 'invoice',
      entityId: invoiceId,
      entityLabel: invoice.invoiceNumber,
      action: 'Beleg über den Nachreichelink eingereicht',
      actorName: submittedByName,
    });
    await writeAuditLogEntry({
      entityType: 'resolution',
      entityId: check.payload.r,
      entityLabel: resolution.number,
      action: `Beleg nachgereicht: ${invoice.invoiceNumber}`,
      actorName: submittedByName,
    });

    return { status: 200, body: { ok: true } };
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Der Beleg konnte nicht gespeichert werden.' },
    };
  }
}
