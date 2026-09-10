import crypto from 'crypto';

/**
 * Signierter Link aus der Einladungs-E-Mail (/passwort?t=...).
 *
 * Warum nicht direkt der Firebase-Link zum Passwort-Festlegen: Der gilt nur
 * 1 Stunde, eine Einladung wird aber oft erst Tage spaeter geoeffnet. Dieser
 * Link gilt deshalb 14 Tage; erst beim Oeffnen erzeugt der Server daraus
 * einen frischen Firebase-Code (siehe handleExchangeInvite in auth.ts).
 *
 * Gleiches Verfahren wie voteToken.ts und mit demselben Schluessel
 * (VOTE_LINK_SECRET) - der Zweck "invite:" fliesst in die Signatur ein, ein
 * Abstimmungslink kann also nie als Einladung durchgehen und umgekehrt.
 */

export interface InvitePayload {
  /** E-Mail-Adresse */
  e: string;
  /** Mitglied */
  m: string;
  /** Ausgestellt (Unix-Sekunden) - danach festgelegte Passwoerter entwerten den Link. */
  iat: number;
  /** Ablauf (Unix-Sekunden) */
  exp: number;
}

export const INVITE_LINK_VALID_DAYS = 14;

const base64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64url = (input: string) =>
  Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

function getSecret(): string {
  return process.env.VOTE_LINK_SECRET || '';
}

function sign(data: string, secret: string): string {
  return base64url(crypto.createHmac('sha256', secret).update(`invite:${data}`).digest());
}

export function createInviteToken(email: string, memberId: string): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload: InvitePayload = {
    e: email,
    m: memberId,
    iat: now,
    exp: now + INVITE_LINK_VALID_DAYS * 24 * 60 * 60,
  };
  const data = base64url(JSON.stringify(payload));
  return `${data}.${sign(data, secret)}`;
}

export type InviteVerifyResult =
  | { ok: true; payload: InvitePayload }
  | { ok: false; reason: 'no_secret' | 'malformed' | 'bad_signature' | 'expired' };

export function verifyInviteToken(token: string): InviteVerifyResult {
  const secret = getSecret();
  if (!secret) return { ok: false, reason: 'no_secret' };

  const parts = (token || '').split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };

  const [data, signature] = parts;
  const a = Buffer.from(signature);
  const b = Buffer.from(sign(data, secret));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' };
  }

  let payload: InvitePayload;
  try {
    payload = JSON.parse(fromBase64url(data));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (!payload?.e || !payload?.m || !payload?.iat || !payload?.exp) {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: 'expired' };

  return { ok: true, payload };
}
