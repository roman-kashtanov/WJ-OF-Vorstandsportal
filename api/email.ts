import nodemailer from 'nodemailer';
import { getServerConfig } from './config';

export interface SendEmailInput {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Versendet eine E-Mail.
 *
 * Bevorzugt wird SMTP (das Gmail-Postfach des Vereins), weil dafuer keine
 * eigene Domain verifiziert werden muss. Ist kein SMTP hinterlegt, wird
 * Resend als Alternative genutzt.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = getServerConfig();

  const recipients = (input.to || []).map((t) => t.trim()).filter(Boolean);
  if (recipients.length === 0) {
    return { status: 400, body: { error: 'Kein Empfaenger angegeben.' } };
  }
  if (!input.subject) {
    return { status: 400, body: { error: 'Kein Betreff angegeben.' } };
  }

  if (cfg.isSmtpConfigured) {
    return sendViaSmtp(input, recipients, cfg);
  }

  if (cfg.resendApiKey) {
    return sendViaResend(input, recipients, cfg);
  }

  return {
    status: 400,
    body: {
      error:
        'Kein E-Mail-Versand eingerichtet. Bitte in Netlify unter "Environment variables" SMTP_USER und SMTP_PASSWORD setzen (Gmail-Adresse und App-Passwort).',
    },
  };
}

async function sendViaSmtp(
  input: SendEmailInput,
  recipients: string[],
  cfg: ReturnType<typeof getServerConfig>
): Promise<SendEmailResult> {
  try {
    const transporter = nodemailer.createTransport({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      // Port 465 spricht direkt TLS, 587 beginnt unverschluesselt und
      // schaltet per STARTTLS um.
      secure: cfg.smtpPort === 465,
      auth: { user: cfg.smtpUser, pass: cfg.smtpPassword },
    });

    const info = await transporter.sendMail({
      from: cfg.smtpFrom,
      to: recipients.join(', '),
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { status: 200, body: { success: true, id: info.messageId, via: 'smtp' } };
  } catch (err: any) {
    return { status: 502, body: { error: describeSmtpError(err), via: 'smtp' } };
  }
}

/** SMTP-Fehler in verstaendliche Hinweise uebersetzen. */
function describeSmtpError(err: any): string {
  const code = err?.code || '';
  const response: string = err?.response || err?.message || '';

  if (code === 'EAUTH' || response.includes('535')) {
    return 'Anmeldung am Postfach fehlgeschlagen. Bei Gmail wird ein App-Passwort benötigt (nicht das normale Passwort), und die Bestätigung in zwei Schritten muss aktiv sein.';
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET') {
    return 'Der Mailserver war nicht erreichbar. Bitte Host und Port prüfen.';
  }
  if (response.includes('550') || response.includes('553')) {
    return `Der Mailserver hat die Nachricht abgelehnt: ${response}`;
  }
  return response || 'Der Versand über SMTP ist fehlgeschlagen.';
}

async function sendViaResend(
  input: SendEmailInput,
  recipients: string[],
  cfg: ReturnType<typeof getServerConfig>
): Promise<SendEmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.resendFrom,
        to: recipients,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const data: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        status: response.status,
        body: {
          error: data?.message || data?.name || `Resend meldete Status ${response.status}.`,
          via: 'resend',
        },
      };
    }

    return { status: 200, body: { success: true, id: data?.id, via: 'resend' } };
  } catch (err: any) {
    return {
      status: 502,
      body: { error: err?.message || 'Verbindung zu Resend fehlgeschlagen.', via: 'resend' },
    };
  }
}
