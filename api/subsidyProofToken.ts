import crypto from 'crypto';

/**
 * Signierte Links zum nachtraeglichen Hochladen eines Zuschuss-Nachweisfotos.
 *
 * Gleicher Aufbau wie voteToken.ts (<nutzdaten>.<signatur>, HMAC-SHA256),
 * aber bewusst mit eigenem Secret (SUBSIDY_PROOF_LINK_SECRET) statt
 * VOTE_LINK_SECRET, damit beide unabhaengig voneinander rotiert werden
 * koennen. Bewusst KEIN Einmalverbrauch wie bei Stimm-Tokens: der
 * Antragsteller darf den Link mehrfach oeffnen, bevor er endlich einen
 * Nachweis hochlaedt. Der Handler prueft stattdessen bei jedem Aufruf den
 * aktuellen Zuschuss-Status live - ein bereits gebuendelter oder bezahlter
 * Zuschuss lehnt weitere Uploads ab, unabhaengig vom Token selbst.
 */

export interface ProofPayload {
  /** Zuschuss */
  s: string;
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
  return process.env.SUBSIDY_PROOF_LINK_SECRET || '';
}

function sign(data: string, secret: string): string {
  return base64url(crypto.createHmac('sha256', secret).update(data).digest());
}

/** Gueltigkeitsdauer eines Nachweis-Links in Tagen - grosszuegig, Antragsteller brauchen oft Zeit. */
export const PROOF_LINK_VALID_DAYS = 180;

export function createSubsidyProofToken(subsidyId: string): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload: ProofPayload = {
    s: subsidyId,
    e: Math.floor(Date.now() / 1000) + PROOF_LINK_VALID_DAYS * 24 * 60 * 60,
    n: crypto.randomBytes(9).toString('hex'),
  };

  const data = base64url(JSON.stringify(payload));
  return `${data}.${sign(data, secret)}`;
}

export type VerifyResult =
  | { ok: true; payload: ProofPayload }
  | { ok: false; reason: 'no_secret' | 'malformed' | 'bad_signature' | 'expired' };

export function verifySubsidyProofToken(token: string): VerifyResult {
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

  let payload: ProofPayload;
  try {
    payload = JSON.parse(fromBase64url(data));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (!payload?.s || !payload?.e || !payload?.n) {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.e < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, payload };
}
