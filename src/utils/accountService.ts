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
