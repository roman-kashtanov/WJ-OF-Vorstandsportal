import crypto from 'crypto';

/**
 * Signierte Links zum Nachreichen einer Rechnung/eines Belegs zu einem
 * Beschluss, ohne Login. Gleicher Aufbau wie subsidyProofToken.ts
 * (<nutzdaten>.<signatur>, HMAC-SHA256), aber mit eigenem Secret
 * (INVOICE_ATTACHMENT_LINK_SECRET), damit alle drei Link-Secrets
 * (Stimme, Zuschuss-Nachweis, Beleg) unabhaengig voneinander rotiert
 * werden koennen. Bewusst KEIN "locked"-Zustand wie beim Zuschuss-
 * Nachweis: ein Beschluss darf beliebig viele Rechnungen sammeln, auch
 * nach Annahme/Ablehnung.
 */

export interface InvoiceAttachmentPayload {
  /** Beschluss */
  r: string;
  /** Ablauf (Unix-Sekunden) */
  e: number;
  /** Zufallskennung, nur zur Eindeutigkeit des Tokens */
  n: string;
}

const base64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64url = (input: string) =>
  Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

function getSecret(): string {
  return process.env.INVOICE_ATTACHMENT_LINK_SECRET || '';
}

function sign(data: string, secret: string): string {
  return base64url(crypto.createHmac('sha256', secret).update(data).digest());
}

/** Gueltigkeitsdauer eines Beleg-Nachreichelinks in Tagen. */
export const INVOICE_ATTACHMENT_LINK_VALID_DAYS = 180;

export function createInvoiceAttachmentToken(resolutionId: string): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload: InvoiceAttachmentPayload = {
    r: resolutionId,
    e: Math.floor(Date.now() / 1000) + INVOICE_ATTACHMENT_LINK_VALID_DAYS * 24 * 60 * 60,
    n: crypto.randomBytes(9).toString('hex'),
  };

  const data = base64url(JSON.stringify(payload));
  return `${data}.${sign(data, secret)}`;
}

export type VerifyResult =
  | { ok: true; payload: InvoiceAttachmentPayload }
  | { ok: false; reason: 'no_secret' | 'malformed' | 'bad_signature' | 'expired' };

export function verifyInvoiceAttachmentToken(token: string): VerifyResult {
  const secret = getSecret();
  if (!secret) return { ok: false, reason: 'no_secret' };

  const parts = (token || '').split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };

  const [data, signature] = parts;
  const expected = sign(data, secret);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' };
  }

  let payload: InvoiceAttachmentPayload;
  try {
    payload = JSON.parse(fromBase64url(data));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (!payload?.r || !payload?.e || !payload?.n) {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.e < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, payload };
}
