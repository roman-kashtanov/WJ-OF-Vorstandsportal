import crypto from 'crypto';
import { loadServiceAccount, getAccessToken } from './firestoreAdmin';

/**
 * Minimaler Zugriff auf die Firebase-Anmeldung (Identity Toolkit) fuer den
 * Server - wie firestoreAdmin.ts bewusst ohne firebase-admin, nur REST und
 * dasselbe Dienstkonto (FIREBASE_SERVICE_ACCOUNT).
 *
 * Gebraucht fuer die Anmeldung mit E-Mail + Passwort:
 *   - Konto fuer ein eingeladenes Mitglied anlegen (bereits bestaetigt),
 *   - Link zum Passwort-Festlegen erzeugen, OHNE dass Firebase selbst eine
 *     Mail verschickt (die Mail kommt aus dem Vereinspostfach, mit Anleitung),
 *   - pruefen, wer eine Einladung ausloesen will (ID-Token des Browsers).
 */

const IDENTITY_TOOLKIT = 'https://identitytoolkit.googleapis.com/v1';

export interface AuthUserRecord {
  localId: string;
  email?: string;
  emailVerified: boolean;
  /** Letzte Passwortaenderung in Millisekunden. */
  passwordUpdatedAt?: number;
  disabled: boolean;
}

async function callIdentityToolkit(endpoint: string, body: unknown): Promise<any> {
  const sa = loadServiceAccount();
  if (!sa) throw new Error('Kein Dienstkonto hinterlegt (FIREBASE_SERVICE_ACCOUNT).');
  const token = await getAccessToken(sa);

  const res = await fetch(`${IDENTITY_TOOLKIT}/projects/${sa.project_id}/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Firebase-Anmeldedienst antwortete mit Status ${res.status}.`);
  }
  return data;
}

const randomPassword = () => crypto.randomBytes(24).toString('base64url');

const fromBase64url = (input: string) =>
  Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/** Oeffentliche Zertifikate, mit denen Firebase die ID-Tokens signiert. */
let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getSigningCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.certs;
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) throw new Error('Die Signaturschlüssel von Firebase sind gerade nicht abrufbar.');
  const certs = (await res.json()) as Record<string, string>;
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') || '')?.[1] || 3600);
  certCache = { certs, expiresAt: Date.now() + maxAge * 1000 };
  return certs;
}

export const FirebaseAuthAdmin = {
  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const data = await callIdentityToolkit('accounts:lookup', { email: [email] });
    const user = data?.users?.[0];
    if (!user) return null;
    return {
      localId: user.localId,
      email: user.email,
      emailVerified: user.emailVerified === true,
      passwordUpdatedAt: user.passwordUpdatedAt ? Number(user.passwordUpdatedAt) : undefined,
      disabled: user.disabled === true,
    };
  },

  /**
   * Stellt sicher, dass fuer die Adresse ein BESTAETIGTES Konto existiert.
   *
   * - Kein Konto: wird angelegt, bestaetigt, mit Zufallspasswort (niemand
   *   kennt es - das echte Passwort legt die Person ueber den Link fest).
   * - Unbestaetigtes Konto: kann nur jemand selbst angelegt haben, ohne das
   *   Postfach zu besitzen. Es wird bestaetigt, bekommt aber ein neues
   *   Zufallspasswort, und alle bestehenden Anmeldungen werden ungueltig -
   *   wer es angelegt hat, kommt damit nicht hinein.
   * - Bestaetigtes Konto (auch Google): bleibt unveraendert.
   */
  async ensureVerifiedAccount(email: string, displayName?: string): Promise<AuthUserRecord> {
    const existing = await this.findUserByEmail(email);

    if (!existing) {
      const created = await callIdentityToolkit('accounts', {
        email,
        emailVerified: true,
        password: randomPassword(),
        ...(displayName ? { displayName } : {}),
      });
      return {
        localId: created.localId,
        email,
        emailVerified: true,
        passwordUpdatedAt: Date.now(),
        disabled: false,
      };
    }

    if (!existing.emailVerified) {
      await callIdentityToolkit('accounts:update', {
        localId: existing.localId,
        emailVerified: true,
        password: randomPassword(),
        validSince: Math.floor(Date.now() / 1000),
      });
      return { ...existing, emailVerified: true, passwordUpdatedAt: Date.now() };
    }

    return existing;
  },

  /**
   * Erzeugt einen Code zum Festlegen eines neuen Passworts, ohne dass Firebase
   * eine eigene E-Mail verschickt. Firebase-Codes gelten 1 Stunde - fuer
   * Einladungen wird deshalb erst beim Oeffnen ein frischer Code erzeugt
   * (siehe handleExchangeInvite in auth.ts).
   */
  async createPasswordResetCode(email: string): Promise<string> {
    const data = await callIdentityToolkit('accounts:sendOobCode', {
      requestType: 'PASSWORD_RESET',
      email,
      returnOobLink: true,
    });
    const code = data?.oobLink ? new URL(String(data.oobLink)).searchParams.get('oobCode') : null;
    if (!code) throw new Error('Firebase hat keinen gültigen Link erzeugt.');
    return code;
  },

  /**
   * Prueft das ID-Token aus dem Browser (wer ist angemeldet?). Signatur,
   * Projekt, Aussteller und Ablauf werden kontrolliert - dieselben Pruefungen,
   * die firebase-admin intern vornimmt.
   */
  async verifyIdToken(idToken: string): Promise<{ uid: string; email?: string; emailVerified: boolean }> {
    const sa = loadServiceAccount();
    if (!sa) throw new Error('Kein Dienstkonto hinterlegt (FIREBASE_SERVICE_ACCOUNT).');

    const parts = String(idToken || '').split('.');
    if (parts.length !== 3) throw new Error('Ungültiges Anmelde-Token.');

    const header = JSON.parse(fromBase64url(parts[0]).toString('utf8'));
    const payload = JSON.parse(fromBase64url(parts[1]).toString('utf8'));
    if (header.alg !== 'RS256' || !header.kid) throw new Error('Ungültiges Anmelde-Token.');

    const cert = (await getSigningCerts())[header.kid];
    if (!cert) throw new Error('Unbekannter Signaturschlüssel.');

    const signatureOk = crypto
      .createVerify('RSA-SHA256')
      .update(`${parts[0]}.${parts[1]}`)
      .verify(cert, fromBase64url(parts[2]));
    if (!signatureOk) throw new Error('Die Signatur des Anmelde-Tokens stimmt nicht.');

    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== sa.project_id) throw new Error('Token gehört zu einem anderen Projekt.');
    if (payload.iss !== `https://securetoken.google.com/${sa.project_id}`) {
      throw new Error('Token stammt nicht von Firebase.');
    }
    if (!payload.sub) throw new Error('Token ohne Benutzer.');
    if (typeof payload.exp !== 'number' || payload.exp < now) throw new Error('Anmeldung abgelaufen.');
    if (typeof payload.iat === 'number' && payload.iat > now + 300) throw new Error('Token aus der Zukunft.');

    return {
      uid: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined,
      emailVerified: payload.email_verified === true,
    };
  },
};
