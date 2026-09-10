import { FirestoreAdmin } from './firestoreAdmin';
import { FirebaseAuthAdmin } from './firebaseAuthAdmin';
import { createInviteToken, verifyInviteToken, INVITE_LINK_VALID_DAYS } from './inviteToken';
import { inviteEmail, passwordResetEmail } from './authEmails';
import { sendEmail } from './email';

/**
 * Anmeldung mit E-Mail + Passwort.
 *
 * Ablauf:
 *   1. Ein Vorstandsmitglied legt eine Person an und laedt sie ein
 *      (handleSendInvite): Konto wird angelegt, Mail mit 14-Tage-Link.
 *   2. Die Person oeffnet /passwort?t=... (handleExchangeInvite liefert
 *      einen frischen Firebase-Code) und legt ihr Passwort fest.
 *   3. "Passwort vergessen" (handleRequestPasswordReset): Mail mit einem
 *      1-Stunden-Link auf /passwort?oobCode=...
 *
 * Das Festlegen selbst passiert im Browser direkt bei Firebase
 * (confirmPasswordReset) - das Passwort kommt nie bei diesem Server vorbei.
 */

interface Result {
  status: number;
  body: Record<string, unknown>;
}

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();
const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
const baseUrl = (origin: string) => (origin || '').replace(/\/$/, '');

/** Mindestabstand zwischen zwei "Passwort vergessen"-Mails an dieselbe Adresse. */
const RESET_COOLDOWN_MS = 2 * 60 * 1000;

const NOT_CONFIGURED: Result = {
  status: 500,
  body: { error: 'Auf dem Server fehlt der Firebase-Zugang (FIREBASE_SERVICE_ACCOUNT).' },
};

async function isAllowlisted(email: string): Promise<boolean> {
  return !!(await FirestoreAdmin.getDocument(`allowlist/${email}`));
}

function mailError(result: { status: number; body: Record<string, unknown> }): string | null {
  if (result.status < 300) return null;
  return String(result.body?.error || 'Die E-Mail konnte nicht versendet werden.');
}

export async function handleSendInvite(
  payload: { idToken?: string; memberId?: string },
  origin: string
): Promise<Result> {
  if (!FirestoreAdmin.isConfigured()) return NOT_CONFIGURED;

  try {
    // Nur freigegebene Vorstandsmitglieder duerfen einladen.
    let caller;
    try {
      caller = await FirebaseAuthAdmin.verifyIdToken(payload.idToken || '');
    } catch {
      return {
        status: 401,
        body: { error: 'Deine Anmeldung ist abgelaufen. Bitte die Seite neu laden und erneut versuchen.' },
      };
    }
    if (!caller.email || !caller.emailVerified || !(await isAllowlisted(caller.email))) {
      return { status: 403, body: { error: 'Nur freigegebene Vorstandsmitglieder dürfen einladen.' } };
    }

    if (!payload.memberId) return { status: 400, body: { error: 'Kein Mitglied angegeben.' } };
    const member = await FirestoreAdmin.getDocument(`members/${payload.memberId}`);
    const email = normalizeEmail(member?.email);
    if (!member || !isEmail(email)) {
      return {
        status: 404,
        body: { error: 'Mitglied nicht gefunden oder ohne gültige E-Mail-Adresse. Bitte kurz warten und erneut versuchen.' },
      };
    }
    if (!(await isAllowlisted(email))) {
      return { status: 409, body: { error: `${email} ist noch nicht freigegeben.` } };
    }

    const account = await FirebaseAuthAdmin.ensureVerifiedAccount(email, member.name);
    if (account.disabled) {
      return { status: 409, body: { error: 'Dieses Konto ist in Firebase gesperrt.' } };
    }

    const token = createInviteToken(email, payload.memberId);
    if (!token) {
      return { status: 500, body: { error: 'Auf dem Server fehlt der Signaturschlüssel (VOTE_LINK_SECRET).' } };
    }

    const portalUrl = baseUrl(origin);
    const mail = inviteEmail({
      name: member.name || '',
      email,
      link: `${portalUrl}/passwort?t=${token}`,
      portalUrl,
      validDays: INVITE_LINK_VALID_DAYS,
    });
    const sent = await sendEmail({ to: [email], ...mail });
    const error = mailError(sent);
    if (error) return { status: 502, body: { error } };

    return { status: 200, body: { ok: true } };
  } catch (err: any) {
    return { status: 500, body: { error: err?.message || 'Die Einladung ist fehlgeschlagen.' } };
  }
}

export async function handleExchangeInvite(payload: { token?: string }): Promise<Result> {
  if (!FirestoreAdmin.isConfigured()) return NOT_CONFIGURED;

  const check = verifyInviteToken(payload.token || '');
  if (check.ok === false) {
    const messages: Record<string, string> = {
      no_secret: 'Auf dem Server fehlt der Signaturschlüssel (VOTE_LINK_SECRET).',
      malformed: 'Dieser Link ist unvollständig. Bitte den Link aus der E-Mail vollständig öffnen.',
      bad_signature: 'Dieser Link ist ungültig. Möglicherweise wurde er beim Weiterleiten verändert.',
      expired:
        'Dieser Einladungslink ist abgelaufen. Unten kannst du einen neuen Link anfordern – oder den Vorstand um eine neue Einladung bitten.',
    };
    return { status: 400, body: { error: messages[check.reason] } };
  }

  try {
    const { e: email, iat } = check.payload;
    if (!(await isAllowlisted(email))) {
      return { status: 403, body: { error: 'Dieser Zugang wurde inzwischen entfernt.' } };
    }

    const user = await FirebaseAuthAdmin.findUserByEmail(email);
    if (!user) {
      return { status: 404, body: { error: 'Zu dieser Einladung gibt es kein Konto mehr. Bitte eine neue Einladung anfordern.' } };
    }

    // Wurde nach dem Versand der Einladung bereits ein Passwort festgelegt,
    // ist der Link verbraucht - sonst liesse er sich 14 Tage lang zum
    // Ueberschreiben des Passworts nutzen.
    if (user.passwordUpdatedAt && user.passwordUpdatedAt > iat * 1000 + 5000) {
      return {
        status: 409,
        body: {
          error:
            'Über diese Einladung wurde bereits ein Passwort festgelegt. Bitte im Portal anmelden – oder dort „Passwort vergessen" nutzen.',
          alreadyUsed: true,
        },
      };
    }

    const oobCode = await FirebaseAuthAdmin.createPasswordResetCode(email);
    return { status: 200, body: { ok: true, oobCode, email } };
  } catch (err: any) {
    return { status: 500, body: { error: err?.message || 'Der Link konnte nicht geprüft werden.' } };
  }
}

export async function handleRequestPasswordReset(
  payload: { email?: string },
  origin: string
): Promise<Result> {
  const email = normalizeEmail(payload.email);
  if (!isEmail(email)) return { status: 400, body: { error: 'Bitte eine gültige E-Mail-Adresse eingeben.' } };
  if (!FirestoreAdmin.isConfigured()) return NOT_CONFIGURED;

  // Immer dieselbe Antwort, egal ob die Adresse freigegeben ist - sonst liesse
  // sich hierueber ausprobieren, wer im Vorstand ist.
  const generic: Result = { status: 200, body: { ok: true } };

  try {
    if (!(await isAllowlisted(email))) return generic;

    const throttle = await FirestoreAdmin.getDocument(`passwordResets/${email}`);
    const last = throttle?.lastRequestedAt ? Date.parse(throttle.lastRequestedAt) : 0;
    if (last && Date.now() - last < RESET_COOLDOWN_MS) return generic;
    await FirestoreAdmin.patchDocument(`passwordResets/${email}`, {
      lastRequestedAt: new Date().toISOString(),
    });

    await FirebaseAuthAdmin.ensureVerifiedAccount(email);
    const oobCode = await FirebaseAuthAdmin.createPasswordResetCode(email);
    const mail = passwordResetEmail({
      link: `${baseUrl(origin)}/passwort?oobCode=${encodeURIComponent(oobCode)}`,
    });
    const sent = await sendEmail({ to: [email], ...mail });
    const error = mailError(sent);
    if (error) {
      return { status: 502, body: { error: 'Die E-Mail konnte gerade nicht versendet werden. Bitte später erneut versuchen.' } };
    }
    return generic;
  } catch (err: any) {
    return { status: 500, body: { error: err?.message || 'Das hat nicht geklappt. Bitte später erneut versuchen.' } };
  }
}
