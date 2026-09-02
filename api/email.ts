import { getServerConfig } from './config';

export interface SendEmailInput {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  /** Nur Fallback fuer den lokalen Test - im Betrieb kommt der Key aus der Umgebung. */
  apiKey?: string;
}

export interface SendEmailResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Versendet eine E-Mail ueber Resend.
 * Gibt bei Fehlern die Original-Fehlermeldung von Resend zurueck, damit in der
 * App sichtbar wird, warum eine Mail nicht angekommen ist (z.B. Domain nicht
 * verifiziert).
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = getServerConfig();
  const apiKey = cfg.resendApiKey || input.apiKey || '';

  if (!apiKey) {
    return {
      status: 400,
      body: {
        error:
          'Kein Resend API-Key hinterlegt. Bitte in Netlify unter "Environment variables" den Wert RESEND_API_KEY setzen.',
      },
    };
  }

  const recipients = (input.to || []).map((t) => t.trim()).filter(Boolean);
  if (recipients.length === 0) {
    return { status: 400, body: { error: 'Kein Empfaenger angegeben.' } };
  }
  if (!input.subject) {
    return { status: 400, body: { error: 'Kein Betreff angegeben.' } };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: cfg.resendFrom || input.from,
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
          details: data,
        },
      };
    }

    return { status: 200, body: { success: true, id: data?.id } };
  } catch (err: any) {
    return { status: 502, body: { error: err?.message || 'Verbindung zu Resend fehlgeschlagen.' } };
  }
}
