import crypto from 'crypto';
import { FirestoreAdmin } from './firestoreAdmin';

/**
 * Prueft den Zugangscode fuers oeffentliche Zuschuss-Antragsformular (/antrag).
 *
 * Gleiches Hash-Schema wie der clientseitige sha256() in src/utils/security.ts
 * (getrimmter UTF-8-Text, SHA-256, Hex) - so passt ein ueber die
 * Vorstands-Einstellungen gesetzter Hash unveraendert auch hier.
 *
 * Fail closed: ohne hinterlegten Hash ist das Formular nicht nutzbar (kein
 * Rueckfall auf einen Standardcode wie beim Vorstandscode - dieses Feature
 * ist neu und optional, es soll nicht "versehentlich offen" starten).
 */
export async function verifySubsidyFormCode(code: string): Promise<boolean> {
  const clean = (code || '').trim();
  if (!clean) return false;
  if (!FirestoreAdmin.isConfigured()) return false;

  try {
    const settings = await FirestoreAdmin.getDocument('settings/security');
    const hash = settings?.subsidyFormCodeHash;
    if (!hash) return false;

    const entered = crypto.createHash('sha256').update(clean, 'utf8').digest('hex');
    const a = Buffer.from(entered);
    const b = Buffer.from(String(hash));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
