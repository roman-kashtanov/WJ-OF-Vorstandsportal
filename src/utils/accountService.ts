import { BoardMember } from '../types';
import { auth } from '../lib/firebase';

/**
 * Anmeldung mit E-Mail + Passwort: Einladung, Passwort vergessen, Einladungslink.
 *
 * Eigene Datei statt emailService.ts: sie braucht die Firebase-Anmeldung,
 * und emailService wird auch von oeffentlichen Seiten geladen, die ohne
 * Firebase auskommen sollen.
 */

type Outcome<T = {}> = ({ ok: true } & T) | { ok: false; error: string; alreadyUsed?: boolean };

async function postJson(path: string, body: unknown): Promise<{ ok: boolean; data: any }> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, data: { error: 'Keine Verbindung. Bitte Internet prüfen und erneut versuchen.' } };
  }
  const data = await res.json().catch(() => ({
    error: 'Der Server ist nicht erreichbar. Bitte später erneut versuchen.',
  }));
  return { ok: res.ok, data };
}

/** Einladung mit Link zum Passwort-Festlegen und Installationsanleitung. */
export async function sendMemberInvite(member: BoardMember): Promise<Outcome> {
  if (!member.email) {
    return { ok: false, error: 'Für diese Person ist keine E-Mail-Adresse hinterlegt.' };
  }

  // Beim Start stellt Firebase die Anmeldung erst asynchron wieder her.
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    return {
      ok: false,
      error: 'Zum Einladen musst du angemeldet sein. Bitte einmal ab- und wieder anmelden.',
    };
  }

  const { ok, data } = await postJson('auth/invite', {
    idToken: await user.getIdToken(),
    memberId: member.id,
  });
  return ok ? { ok: true } : { ok: false, error: data?.error || 'Die Einladung ist fehlgeschlagen.' };
}

/** ID-Token des angemeldeten Mitglieds - damit prueft der Server, dass der Vorstand fragt. */
async function currentIdToken(): Promise<string | null> {
  await auth.authStateReady();
  const user = auth.currentUser;
  return user ? user.getIdToken() : null;
}

const NOT_SIGNED_IN = 'Dafür musst du angemeldet sein. Bitte einmal ab- und wieder anmelden.';

/**
 * Fehlender Nachweis beim Zuschuss: per E-Mail erneut anfordern
 * (api/subsidy.ts handleResendProofLink, nur fuer den Vorstand).
 */
export async function resendSubsidyProofLink(input: {
  subsidyId: string;
  email: string;
  personName: string;
  eventName: string;
}): Promise<Outcome> {
  const idToken = await currentIdToken();
  if (!idToken) return { ok: false, error: NOT_SIGNED_IN };
  const { ok, data } = await postJson('subsidy/resend-proof-link', { ...input, idToken });
  return ok
    ? { ok: true }
    : { ok: false, error: data?.error || 'Der Nachweis-Link konnte nicht versendet werden.' };
}

/**
 * "Link kopieren": derselbe Nachweis-Link wie in der E-Mail, ohne sie zu
 * verschicken - zum Weiterleiten z. B. per WhatsApp (api/subsidy.ts
 * handleGetProofLink, nur fuer den Vorstand).
 */
export async function getSubsidyProofLink(
  subsidyId: string
): Promise<Outcome<{ url: string; missing: string }>> {
  const idToken = await currentIdToken();
  if (!idToken) return { ok: false, error: NOT_SIGNED_IN };
  const { ok, data } = await postJson('subsidy/proof-link', { subsidyId, idToken });
  if (ok && data?.url) return { ok: true, url: data.url, missing: data.missing || '' };
  return { ok: false, error: data?.error || 'Der Nachweis-Link konnte nicht erzeugt werden.' };
}

/**
 * Allgemeiner Beleg-Link ohne Beschluss (api/invoice.ts
 * handleGetGeneralUploadLink, nur fuer den Vorstand) - zum Weiterleiten.
 */
export async function getInvoiceUploadLink(): Promise<Outcome<{ url: string }>> {
  const idToken = await currentIdToken();
  if (!idToken) return { ok: false, error: NOT_SIGNED_IN };
  const { ok, data } = await postJson('invoice/upload-link', { idToken });
  if (ok && data?.url) return { ok: true, url: data.url };
  return { ok: false, error: data?.error || 'Der Beleg-Link konnte nicht erzeugt werden.' };
}

/** "Belege anfragen": E-Mail mit eigenem Text und Beleg-Link (api/invoice.ts handleSendInvoiceRequest). */
export async function sendInvoiceRequest(input: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  subject: string;
  message: string;
}): Promise<Outcome> {
  const idToken = await currentIdToken();
  if (!idToken) return { ok: false, error: NOT_SIGNED_IN };
  const { ok, data } = await postJson('invoice/send-request', { ...input, idToken });
  return ok ? { ok: true } : { ok: false, error: data?.error || 'Die E-Mail konnte nicht gesendet werden.' };
}

/** "Passwort vergessen" - antwortet bewusst gleich, egal ob die Adresse freigegeben ist. */
export async function requestPasswordReset(email: string): Promise<Outcome> {
  const { ok, data } = await postJson('auth/password-reset', { email });
  return ok ? { ok: true } : { ok: false, error: data?.error || 'Das hat nicht geklappt.' };
}

/** Einladungslink (14 Tage) gegen einen frischen Firebase-Code tauschen. */
export async function exchangeInviteToken(token: string): Promise<Outcome<{ oobCode: string; email: string }>> {
  const { ok, data } = await postJson('auth/invite-exchange', { token });
  if (ok && data?.oobCode) return { ok: true, oobCode: data.oobCode, email: data.email };
  return {
    ok: false,
    error: data?.error || 'Der Link konnte nicht geprüft werden.',
    alreadyUsed: data?.alreadyUsed === true,
  };
}
