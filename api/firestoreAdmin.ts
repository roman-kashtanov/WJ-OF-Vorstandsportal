import crypto from 'crypto';

/**
 * Minimaler Firestore-Zugriff fuer den Server.
 *
 * Bewusst ohne firebase-admin: Fuer die zwei benoetigten Operationen (ein
 * Dokument lesen, ein Feld schreiben) genuegen ein signiertes JWT und die
 * REST-Schnittstelle. Das haelt das Function-Paket klein und die Fehlerfaelle
 * ueberschaubar.
 *
 * Benoetigt die Umgebungsvariable FIREBASE_SERVICE_ACCOUNT mit dem JSON des
 * Dienstkontos (Firebase Console -> Projekteinstellungen -> Dienstkonten).
 */

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) return null;
    // In Umgebungsvariablen stehen Zeilenumbrueche haeufig als "\n"
    parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
    return parsed as ServiceAccount;
  } catch {
    return null;
  }
}

const base64url = (input: Buffer | string) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Holt ein OAuth2-Zugriffstoken fuer das Dienstkonto (mit kurzem Zwischenspeicher). */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.token;

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );

  const signature = base64url(
    crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(sa.private_key)
  );

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${signature}`,
    }),
  });

  const data: any = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error_description || 'Anmeldung des Dienstkontos fehlgeschlagen.');
  }

  cachedToken = { token: data.access_token, expiresAt: now + (data.expires_in || 3600) };
  return data.access_token;
}

/** Wandelt Firestore-Werte in einfaches JavaScript um (nur die genutzten Typen). */
function fromFirestoreValue(v: any): any {
  if (v == null) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) {
      out[k] = fromFirestoreValue(val);
    }
    return out;
  }
  return undefined;
}

/** Wandelt einfaches JavaScript in Firestore-Werte um. */
function toFirestoreValue(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined) fields[k] = toFirestoreValue(val);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

export const FirestoreAdmin = {
  isConfigured(): boolean {
    return loadServiceAccount() !== null;
  },

  /** Liest ein Dokument. Gibt null zurueck, wenn es nicht existiert. */
  async getDocument(path: string): Promise<Record<string, any> | null> {
    const sa = loadServiceAccount();
    if (!sa) throw new Error('Kein Dienstkonto hinterlegt (FIREBASE_SERVICE_ACCOUNT).');
    const token = await getAccessToken(sa);

    const url = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/${path}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (res.status === 404) return null;
    const data: any = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Lesen fehlgeschlagen.');

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(data.fields || {})) out[k] = fromFirestoreValue(v);
    return out;
  },

  /**
   * Schreibt einzelne Felder. Dank updateMask bleiben alle uebrigen Felder
   * unangetastet - wichtig, damit parallele Aenderungen nicht verloren gehen.
   */
  async patchDocument(path: string, fields: Record<string, any>): Promise<void> {
    const sa = loadServiceAccount();
    if (!sa) throw new Error('Kein Dienstkonto hinterlegt (FIREBASE_SERVICE_ACCOUNT).');
    const token = await getAccessToken(sa);

    const mask = Object.keys(fields)
      .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
      .join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/${path}?${mask}`;

    // Wichtig: Firestore erwartet im Dokumentkoerper eine echte verschachtelte
    // Struktur (votes -> memberId -> ...), keinen flachen Schluessel mit
    // Punkten ("votes.memberId"). Der Query-Parameter updateMask.fieldPaths
    // darf zwar Punktnotation nutzen, der Request-Body selbst nicht - ein
    // flacher Schluessel wird sonst stillschweigend als eigenes Feld mit
    // woertlichem Punkt im Namen abgelegt, statt das verschachtelte Feld zu
    // aktualisieren. Genau das hat die Stimmabgabe per E-Mail-Link unwirksam
    // gemacht: Firestore antwortete mit Erfolg, aber "votes.mem123" landete
    // als eigenstaendiges (nirgends gelesenes) Feld statt in votes.mem123.
    const body: Record<string, any> = { fields: {} };
    for (const [dottedKey, value] of Object.entries(fields)) {
      setNestedFirestoreField(body.fields, dottedKey, value);
    }

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data: any = await res.json().catch(() => ({}));
      throw new Error(data?.error?.message || 'Schreiben fehlgeschlagen.');
    }
  },
};

/** Traegt einen Punkt-Pfad ("votes.mem123") als verschachtelte Firestore-Map ein. */
function setNestedFirestoreField(root: Record<string, any>, dottedPath: string, rawValue: any) {
  const parts = dottedPath.split('.');
  let cursor = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!cursor[key]) cursor[key] = { mapValue: { fields: {} } };
    cursor = cursor[key].mapValue.fields;
  }
  cursor[parts[parts.length - 1]] = toFirestoreValue(rawValue);
}
