import { FirestoreAdmin } from './firestoreAdmin';
import { verifyVoteToken } from './voteToken';

/**
 * Verbucht eine Stimme, die ueber einen Einmal-Link aus einer E-Mail kommt -
 * ohne Anmeldung. Der Link ist signiert (siehe voteToken.ts); geschrieben
 * wird serverseitig mit dem Dienstkonto, weil der Browser ohne Anmeldung
 * keine Schreibrechte auf die Datenbank hat.
 */

const VOTE_LABEL: Record<string, string> = {
  yes: 'JA',
  no: 'NEIN',
  abstain: 'ENTHALTUNG',
};

export interface VoteLinkResult {
  status: number;
  html: string;
}

export async function handleVoteLink(token: string, appUrl: string): Promise<VoteLinkResult> {
  const check = verifyVoteToken(token);

  if (check.ok === false) {
    const messages: Record<string, string> = {
      no_secret:
        'Die Abstimmung per Link ist auf dem Server nicht eingerichtet (VOTE_LINK_SECRET fehlt).',
      malformed: 'Dieser Link ist unvollständig. Bitte die E-Mail erneut öffnen.',
      bad_signature:
        'Dieser Link ist ungültig. Möglicherweise wurde er beim Weiterleiten verändert.',
      expired: 'Dieser Link ist abgelaufen. Bitte im Portal abstimmen.',
    };
    return { status: 400, html: page('Nicht möglich', messages[check.reason], false, appUrl) };
  }

  const { r: resolutionId, m: memberId, v: vote, n: nonce } = check.payload;

  if (!FirestoreAdmin.isConfigured()) {
    return {
      status: 500,
      html: page(
        'Noch nicht eingerichtet',
        'Für die Abstimmung per E-Mail fehlt auf dem Server der Datenbankzugang (FIREBASE_SERVICE_ACCOUNT).',
        false,
        appUrl
      ),
    };
  }

  try {
    // Einmalverwendung: Wurde dieser Link schon benutzt?
    const used = await FirestoreAdmin.getDocument(`usedVoteLinks/${nonce}`);
    if (used) {
      return {
        status: 200,
        html: page(
          'Bereits abgestimmt',
          `Über diesen Link wurde bereits mit "${VOTE_LABEL[vote]}" abgestimmt. Eine Änderung ist im Portal möglich.`,
          true,
          appUrl
        ),
      };
    }

    const resolution = await FirestoreAdmin.getDocument(`resolutions/${resolutionId}`);
    if (!resolution) {
      return {
        status: 404,
        html: page('Nicht gefunden', 'Dieser Beschluss existiert nicht mehr.', false, appUrl),
      };
    }

    if (resolution.status && resolution.status !== 'in_abstimmung') {
      return {
        status: 200,
        html: page(
          'Abstimmung beendet',
          `Der Beschluss "${resolution.title || resolutionId}" ist bereits abgeschlossen.`,
          false,
          appUrl
        ),
      };
    }

    const members = await FirestoreAdmin.getDocument(`members/${memberId}`);
    const memberName = members?.name || 'Vorstandsmitglied';
    const memberRole = members?.role || '';

    // Nur das eine Stimmfeld schreiben - alles andere bleibt unberuehrt,
    // damit gleichzeitige Aenderungen anderer nicht verloren gehen.
    await FirestoreAdmin.patchDocument(`resolutions/${resolutionId}`, {
      [`votes.${memberId}`]: {
        memberId,
        memberName,
        memberRole,
        vote,
        timestamp: new Date().toISOString(),
        note: 'Stimmabgabe über den Link in der E-Mail',
      },
    });

    await FirestoreAdmin.patchDocument(`usedVoteLinks/${nonce}`, {
      resolutionId,
      memberId,
      vote,
      usedAt: new Date().toISOString(),
    });

    return {
      status: 200,
      html: page(
        'Stimme erfasst',
        `${memberName} hat für "${resolution.title || resolutionId}" mit <strong>${VOTE_LABEL[vote]}</strong> gestimmt.`,
        true,
        appUrl
      ),
    };
  } catch (err: any) {
    return {
      status: 500,
      html: page(
        'Fehler',
        `Die Stimme konnte nicht gespeichert werden: ${err?.message || 'Unbekannter Fehler'}`,
        false,
        appUrl
      ),
    };
  }
}

/** Schlichte Bestaetigungsseite im Stil des Portals. */
function page(title: string, message: string, success: boolean, appUrl: string): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · WJOF Vorstandsportal</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
         color:#0f172a; padding:20px; }
  .card { background:#fff; border-radius:24px; padding:32px 28px; max-width:420px; width:100%;
          box-shadow:0 10px 40px rgba(15,23,42,.08); text-align:center; }
  .brand { font-weight:800; color:#003594; letter-spacing:-.5px; }
  .sub { font-size:11px; color:#94a3b8; margin-top:2px; }
  .mark { width:52px; height:52px; border-radius:16px; margin:24px auto 0; display:flex;
          align-items:center; justify-content:center; font-size:26px;
          background:${success ? '#ecfdf5' : '#fef2f2'}; color:${success ? '#047857' : '#b91c1c'}; }
  h1 { font-size:17px; margin:16px 0 8px; }
  p { font-size:14px; line-height:1.6; color:#475569; margin:0; }
  a { display:inline-block; margin-top:24px; padding:12px 20px; border-radius:14px;
      background:#003594; color:#fff; text-decoration:none; font-size:13px; font-weight:700; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">WJOF.</div>
    <div class="sub">Vorstandsportal</div>
    <div class="mark">${success ? '✓' : '!'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${appUrl}">Portal öffnen</a>
  </div>
</body>
</html>`;
}
