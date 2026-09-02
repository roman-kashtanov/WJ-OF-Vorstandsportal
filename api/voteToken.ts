import crypto from 'crypto';

/**
 * Signierte Einmal-Links fuer die Stimmabgabe direkt aus der E-Mail.
 *
 * Aufbau: <nutzdaten>.<signatur>
 * Die Signatur ist ein HMAC-SHA256 ueber die Nutzdaten mit einem nur auf dem
 * Server bekannten Schluessel. Damit laesst sich ein Link weder erraten noch
 * veraendern - wer die Gueltigkeitsdauer oder die Stimme im Link umschreibt,
 * macht die Signatur ungueltig.
 *
 * Bewusste Einschraenkung: Wer den Link besitzt, kann damit abstimmen. Das
 * liegt in der Natur der Sache, wenn ohne Anmeldung abgestimmt werden soll.
 * Abgefedert wird es durch die begrenzte Gueltigkeit, die Einmalverwendung
 * und die Protokollierung jeder so abgegebenen Stimme.
 */

export interface VotePayload {
  /** Beschluss */
  r: string;
  /** Mitglied */
  m: string;
  /** Stimme */
  v: 'yes' | 'no' | 'abstain';
  /** Ablauf (Unix-Sekunden) */
  e: number;
  /** Einmalkennung */
  n: string;
}

const base64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const fromBase64url = (input: string) =>
  Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

function getSecret(): string {
  return process.env.VOTE_LINK_SECRET || '';
}

function sign(data: string, secret: string): string {
  return base64url(crypto.createHmac('sha256', secret).update(data).digest());
}

/** Gueltigkeitsdauer eines Abstimmungslinks in Tagen. */
export const VOTE_LINK_VALID_DAYS = 21;

export function createVoteToken(
  resolutionId: string,
  memberId: string,
  vote: VotePayload['v']
): string | null {
  const secret = getSecret();
  if (!secret) return null;

  const payload: VotePayload = {
    r: resolutionId,
    m: memberId,
    v: vote,
    e: Math.floor(Date.now() / 1000) + VOTE_LINK_VALID_DAYS * 24 * 60 * 60,
    n: crypto.randomBytes(9).toString('hex'),
  };

  const data = base64url(JSON.stringify(payload));
  return `${data}.${sign(data, secret)}`;
}

export type VerifyResult =
  | { ok: true; payload: VotePayload }
  | { ok: false; reason: 'no_secret' | 'malformed' | 'bad_signature' | 'expired' };

export function verifyVoteToken(token: string): VerifyResult {
  const secret = getSecret();
  if (!secret) return { ok: false, reason: 'no_secret' };

  const parts = (token || '').split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };

  const [data, signature] = parts;
  const expected = sign(data, secret);

  // Zeitkonstanter Vergleich: verhindert, dass sich die Signatur ueber die
  // Antwortzeit Zeichen fuer Zeichen erraten laesst.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' };
  }

  let payload: VotePayload;
  try {
    payload = JSON.parse(fromBase64url(data));
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (!payload?.r || !payload?.m || !payload?.v || !payload?.e || !payload?.n) {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.e < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, payload };
}
