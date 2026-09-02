import { SecuritySettings } from '../types';

/**
 * Computes SHA-256 hash using the native Web Crypto API.
 */
export async function sha256(message: string): Promise<string> {
  try {
    const msgUint8 = new TextEncoder().encode(message.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback simple deterministic hash in non-crypto environments
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }
}

/**
 * Hashes a 5-digit passcode.
 */
export async function hashPasscode(passcode: string): Promise<string> {
  return sha256(passcode.trim());
}

/**
 * Vorberechneter SHA-256-Hash fuer den Standard-Vorstandscode "11111".
 *
 * Achtung: Der vorherige Wert hier stammte aus dem urspruenglichen
 * AI-Studio-Build und war fehlerhaft - er passte zu keinem tatsaechlichen
 * 5-stelligen Code (weder "19540" noch "11111"), obwohl der Kommentar das
 * behauptete. Dieser Wert wurde neu berechnet und geprueft.
 */
export const DEFAULT_PASSCODE_HASH = 'd17f25ecfbcc7857f7bebea469308be0b2580943e96d13a3ad98a13675c4bfc2';

/**
 * Hash aus dem urspruenglichen AI-Studio-Build. Er passte zu keinem
 * tatsaechlichen Code - wer die App vorher geoeffnet hatte, hat ihn im
 * Browser-Speicher (und ggf. in Firestore) liegen und kaeme sonst nie
 * wieder herein.
 */
export const BROKEN_LEGACY_PASSCODE_HASH =
  '5c95e1e82813589c32e9be4efebceea96dfdca7cbbadff08f4c4c233aaee8e4a';

/**
 * Ersetzt den kaputten Alt-Hash durch den gueltigen Standard.
 * Wird auf jede Quelle angewendet: lokaler Speicher und Cloud.
 */
export function normalizeSecuritySettings<T extends { passcodeHash?: string }>(settings: T): T {
  if (settings && settings.passcodeHash === BROKEN_LEGACY_PASSCODE_HASH) {
    return { ...settings, passcodeHash: DEFAULT_PASSCODE_HASH };
  }
  return settings;
}

/**
 * Verifies if the entered code matches the stored security settings (hashed or legacy).
 */
export async function verifyPasscode(
  enteredCode: string,
  settings: SecuritySettings
): Promise<boolean> {
  if (!enteredCode || enteredCode.trim().length === 0) return false;
  
  const cleanEntered = enteredCode.trim();
  const enteredHash = await sha256(cleanEntered);

  // 1. Check against passcodeHash if set
  if (settings.passcodeHash && settings.passcodeHash !== BROKEN_LEGACY_PASSCODE_HASH) {
    return enteredHash === settings.passcodeHash;
  }

  // 2. Check against plain passcode or default
  if (settings.passcode) {
    if (cleanEntered === settings.passcode) return true;
    const settingsHash = await sha256(settings.passcode);
    if (enteredHash === settingsHash) return true;
  }

  // 3. Fallback default passcode hash
  return enteredHash === DEFAULT_PASSCODE_HASH;
}
