import crypto from 'crypto';
import { FirestoreAdmin } from './firestoreAdmin';
import {
  createInvoiceAttachmentToken,
  createGeneralInvoiceUploadToken,
  verifyInvoiceAttachmentToken,
  INVOICE_ATTACHMENT_LINK_VALID_DAYS,
} from './invoiceAttachmentToken';
import { sendEmail } from './email';
import { verifyBoardCaller } from './auth';
import { escapeHtml, layout, button } from './authEmails';
import { dataUrlBytes, formatBytes, MAX_STORED_BYTES } from '../src/utils/fileStorage';
import { fillInvoiceRequestText } from '../src/utils/invoiceRequestText';
import { writeNotification, writeAuditLogEntry } from './notify';

/**
 * Oeffentliche Beleg-Links (/beleg) - ohne Anmeldung, nach demselben
 * Vertrauensmodell wie subsidy.ts: der Browser schreibt nie direkt in
 * Firestore, sondern nur ueber diese serverseitig validierten Endpunkte mit
 * dem Dienstkonto (FirestoreAdmin). Es entsteht ein vollwertiger
 * Invoice-Datensatz in der normalen Belege-Uebersicht.
 *
 * Zwei Arten von Links (api/invoiceAttachmentToken.ts):
 * - zu einem Beschluss (aus der Beschluss-Detailansicht): der Beleg wird mit
 *   dem Beschluss verknuepft und steht damit im Archiv,
 * - allgemein (v3.28.0, "Beleg-Link kopieren" / "Belege anfragen"): der Beleg
 *   landet ohne Beschluss unter Belege → Offen.
 */

interface ProofFileInput {
  name: string;
  mimeType?: string;
  dataUrl: string;
}

type Result = { status: number; body: any };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function validateFile(file?: ProofFileInput): string | null {
  if (!file) return 'Bitte eine Beleg-Datei anhängen.';
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

/** Allgemeiner Beleg-Link ohne Beschluss. */
function buildGeneralUploadLink(appUrl: string): { ok: true; url: string } | { ok: false; result: Result } {
  const token = createGeneralInvoiceUploadToken();
  if (!token) {
    return {
      ok: false,
      result: { status: 500, body: { error: 'INVOICE_ATTACHMENT_LINK_SECRET ist nicht gesetzt.' } },
    };
  }
  return { ok: true, url: `${appUrl.replace(/\/$/, '')}/beleg?t=${token}` };
}

export interface RequestInvoiceAttachmentLinkInput {
  resolutionId: string;
  recipientEmail: string;
  recipientName?: string;
}

export async function handleRequestInvoiceAttachmentLink(
  input: RequestInvoiceAttachmentLinkInput,
  appUrl: string
): Promise<Result> {
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }

  const resolutionId = (input?.resolutionId || '').trim();
  const recipientEmail = (input?.recipientEmail || '').trim();
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

/**
 * "Beleg-Link kopieren" in der Belege-Uebersicht - nur fuer den Vorstand.
 * Jeder Aufruf erzeugt einen frischen, 180 Tage gueltigen Link.
 */
export async function handleGetGeneralUploadLink(
  input: { idToken?: string },
  appUrl: string
): Promise<Result> {
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }
  try {
    const caller = await verifyBoardCaller(input?.idToken);
    if (caller.ok === false) return caller.result;

    const link = buildGeneralUploadLink(appUrl);
    if (link.ok === false) return link.result;

    return {
      status: 200,
      body: { ok: true, url: link.url, validDays: INVOICE_ATTACHMENT_LINK_VALID_DAYS },
    };
  } catch (err: any) {
    return { status: 500, body: { error: err?.message || 'Der Beleg-Link konnte nicht erzeugt werden.' } };
  }
}

export interface SendInvoiceRequestInput {
  idToken?: string;
  recipientEmail?: string;
  recipientName?: string;
  senderName?: string;
  subject?: string;
  message?: string;
}

/**
 * "Belege anfragen": E-Mail mit frei formuliertem Text (aus einer Vorlage
 * oder selbst geschrieben) und dem allgemeinen Beleg-Link als Knopf - nur
 * fuer den Vorstand. Platzhalter {Name}/{Absender} fuellt
 * fillInvoiceRequestText (dieselbe Funktion wie die Vorschau im Portal).
 */
export async function handleSendInvoiceRequest(input: SendInvoiceRequestInput, appUrl: string): Promise<Result> {
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }

  const recipientEmail = (input?.recipientEmail || '').trim();
  const recipientName = (input?.recipientName || '').trim().slice(0, 120);
  const senderName = (input?.senderName || '').trim().slice(0, 120);
  const rawSubject = (input?.subject || '').trim();
  const rawMessage = (input?.message || '').trim();

  if (!EMAIL_PATTERN.test(recipientEmail)) {
    return { status: 400, body: { error: 'Bitte eine gültige E-Mail-Adresse angeben.' } };
  }
  if (!rawSubject || rawSubject.length > 200) {
    return { status: 400, body: { error: 'Bitte einen Betreff angeben (höchstens 200 Zeichen).' } };
  }
  if (!rawMessage || rawMessage.length > 5000) {
    return { status: 400, body: { error: 'Bitte einen Text angeben (höchstens 5.000 Zeichen).' } };
  }

  try {
    const caller = await verifyBoardCaller(input?.idToken);
    if (caller.ok === false) return caller.result;

    const link = buildGeneralUploadLink(appUrl);
    if (link.ok === false) return link.result;

    const values = { name: recipientName, sender: senderName };
    const subject = fillInvoiceRequestText(rawSubject, values).replace(/\s+/g, ' ');
    const message = fillInvoiceRequestText(rawMessage, values);
    const url = escapeHtml(link.url);

    const paragraphs = message
      .split(/\n{2,}/)
      .map(
        (p) =>
          `<p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 12px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`
      )
      .join('');

    const html = layout(`
    ${paragraphs}
    <div style="margin: 20px 0 8px;">${button(url, 'Beleg hochladen')}</div>
    <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 12px 0 0;">
      Foto oder PDF, ohne Anmeldung. Falls der Knopf nicht funktioniert, diesen Link öffnen:<br>
      <a href="${url}" style="color: #003594; word-break: break-all;">${url}</a><br>
      Der Link ist ${INVOICE_ATTACHMENT_LINK_VALID_DAYS} Tage gültig.
    </p>`);

    const text = `${message}\n\nBeleg hochladen (Foto oder PDF, ohne Anmeldung):\n${link.url}`;

    const result = await sendEmail({ to: [recipientEmail], subject, html, text });
    if (result.status >= 400) {
      return { status: result.status, body: result.body };
    }
    return { status: 200, body: { ok: true } };
  } catch (err: any) {
    return { status: 500, body: { error: err?.message || 'Die E-Mail konnte nicht gesendet werden.' } };
  }
}

export async function handleGetInvoiceAttachmentStatus(token: string): Promise<Result> {
  const check = verifyInvoiceAttachmentToken(token);
  if (check.ok === false) {
    return { status: 400, body: { ok: false, reason: check.reason } };
  }
  // Allgemeiner Link: kein Beschluss, nichts nachzuschlagen
  if (!check.payload.r) {
    return { status: 200, body: { ok: true, general: true } };
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
  notes?: string;
  file: ProofFileInput;
}

export async function handleSubmitInvoiceAttachment(input: SubmitInvoiceAttachmentInput): Promise<Result> {
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
  const notes = (input?.notes || '').trim().slice(0, 1000);

  if (!title) return { status: 400, body: { error: 'Bitte einen Titel angeben.' } };
  if (!vendor) return { status: 400, body: { error: 'Bitte den Lieferanten/Anbieter angeben.' } };
  if (!amount || amount <= 0) {
    return { status: 400, body: { error: 'Bitte einen gültigen Betrag angeben.' } };
  }
  if (!date) return { status: 400, body: { error: 'Bitte ein Datum angeben.' } };

  const fileError = validateFile(input.file);
  if (fileError) return { status: 400, body: { error: fileError } };

  try {
    const resolutionId = check.payload.r;
    let resolution: any = null;
    if (resolutionId) {
      resolution = await FirestoreAdmin.getDocument(`resolutions/${resolutionId}`);
      if (!resolution) {
        return { status: 404, body: { error: 'Dieser Beschluss existiert nicht mehr.' } };
      }
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
      hasResolution: !!resolution,
      ...(resolution
        ? { resolutionId, resolutionNumber: resolution.number, resolutionTitle: resolution.title }
        : {}),
      ...(notes ? { notes } : {}),
      submittedBy: { id: 'link', name: submittedByName, role: 'Extern' },
      fileUrl: input.file.dataUrl,
      fileName: input.file.name,
      fileType: input.file.mimeType?.startsWith('image/') ? 'image' : 'pdf',
      createdAt: now,
    };

    await FirestoreAdmin.patchDocument(`invoices/${invoiceId}`, invoice);

    if (!resolution) {
      await writeNotification({
        title: '📥 Neuer Beleg eingereicht',
        message: `${submittedByName} hat einen Beleg für "${title}" (${amount.toFixed(2)} €) über den Beleg-Link eingereicht.`,
        type: 'invoice',
        targetTab: 'invoices',
        targetId: invoiceId,
      });
      await writeAuditLogEntry({
        entityType: 'invoice',
        entityId: invoiceId,
        entityLabel: invoice.invoiceNumber,
        action: 'Beleg über den Beleg-Link eingereicht',
        actorName: submittedByName,
      });
      return { status: 200, body: { ok: true } };
    }

    const linkedInvoiceIds: string[] = Array.isArray(resolution.linkedInvoiceIds)
      ? resolution.linkedInvoiceIds
      : [];
    await FirestoreAdmin.patchDocument(`resolutions/${resolutionId}`, {
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
      entityId: resolutionId!,
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
