import { FirestoreAdmin } from './firestoreAdmin';
import { verifyVoteToken, createVoteToken } from './voteToken';
import { writeNotification, writeAuditLogEntry } from './notify';
import { calculateVoteStats } from '../src/utils/formatters';
import { getResolutionLockState } from '../src/utils/resolutionLock';

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param confirmed Nein/Enthaltung werden erst verbucht, wenn die
 *   Rueckfrageseite bestaetigt wurde (`&confirm=1`) - wie im Portal.
 */
export async function handleVoteLink(
  token: string,
  appUrl: string,
  confirmed = false
): Promise<VoteLinkResult> {
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

    const resolutionTitle = escapeHtml(resolution.title || resolution.number || resolutionId);

    // Festschreibung: dieselbe Regel wie im Portal (src/utils/resolutionLock.ts).
    // Ohne hinterlegte Stimmberechtigten-Liste kann der Server das nicht
    // pruefen - solche Beschluesse gibt es nur aus der Anfangszeit.
    const lock = getResolutionLockState(resolution, resolution.eligibleVoterIds || []);
    if (lock.isLocked) {
      return {
        status: 200,
        html: page(
          'Beschluss festgeschrieben',
          `Für "${resolutionTitle}" haben alle Stimmberechtigten abgestimmt, und die 24-Stunden-Frist für Korrekturen ist abgelaufen. Eine Stimmabgabe ist nicht mehr möglich.`,
          false,
          appUrl
        ),
      };
    }

    // Nein und Enthaltung erst nach Rueckfrage - ein versehentlicher Klick in
    // der E-Mail soll nicht sofort zaehlen. Ja ist der Normalfall.
    if (vote !== 'yes' && !confirmed) {
      const yesToken = createVoteToken(resolutionId, memberId, 'yes');
      const actions = [
        `<a class="danger" href="?t=${encodeURIComponent(token)}&amp;confirm=1">${
          vote === 'no' ? 'Ja, mit NEIN stimmen' : 'Ja, ich enthalte mich'
        }</a>`,
        yesToken ? `<a class="yes" href="?t=${encodeURIComponent(yesToken)}">Doch mit JA stimmen</a>` : '',
        `<a class="ghost" href="${appUrl}">Abbrechen</a>`,
      ].join('');
      return {
        status: 200,
        html: page(
          vote === 'no' ? 'Wirklich mit NEIN stimmen?' : 'Wirklich enthalten?',
          `Beschluss "${resolutionTitle}". Bitte kurz bestätigen, damit kein versehentlicher Klick gezählt wird.`,
          true,
          appUrl,
          { actionsHtml: actions, mark: '?', neutral: true }
        ),
      };
    }

    // Bewusst KEINE Sperre, wenn der Beschluss bereits entschieden ist:
    // sobald die Mehrheit steht, kippt der Status automatisch auf
    // "angenommen" - die uebrigen Stimmberechtigten sollen ihre Stimme
    // trotzdem noch abgeben koennen (fuers vollstaendige Stimmbild und die
    // Revisionshistorie). Frueher kam hier faelschlich "Abstimmung
    // beendet"/"existiert nicht mehr". Am Ergebnis aendert das nichts: eine
    // erreichte Ja-Mehrheit der Stimmberechtigten kann durch weitere Stimmen
    // nicht mehr zurueckgenommen werden.
    //
    // Die Bestaetigungsseite erwaehnt bewusst NICHT, ob der Beschluss schon
    // entschieden war - der Abstimmende soll nur die Rueckmeldung bekommen,
    // dass seine Stimme angekommen ist (ausdruecklicher Nutzerwunsch).

    const members = await FirestoreAdmin.getDocument(`members/${memberId}`);
    const memberName = members?.name || 'Vorstandsmitglied';
    const memberRole = members?.role || '';

    const newVoteEntry = {
      memberId,
      memberName,
      memberRole,
      vote,
      timestamp: new Date().toISOString(),
      note: 'Stimmabgabe über den Link in der E-Mail',
    };

    // Status/Quorum neu berechnen, mit derselben Formel wie im Portal
    // selbst (useResolutions.ts::handleVoteForMember) - sonst bleibt ein
    // Beschluss, der ausschliesslich per E-Mail-Link abgestimmt wird, fuer
    // immer auf "in_abstimmung" stehen, weil bisher NUR das Stimmfeld
    // geschrieben, der Status aber nie neu bewertet wurde.
    const updatedVotes = { ...(resolution.votes || {}), [memberId]: newVoteEntry };
    const stats = calculateVoteStats({ ...resolution, votes: updatedVotes } as any, 0);
    const wasAccepted = resolution.status === 'angenommen';
    let newStatus: string | undefined;
    if (stats.isQuorumReached && stats.yesCount > stats.eligibleCount / 2) {
      newStatus = 'angenommen';
    } else if (stats.isQuorumReached && stats.noCount >= stats.eligibleCount / 2) {
      newStatus = 'abgelehnt';
    }

    // Nur das Stimmfeld + ggf. Status/passedAt schreiben - alles andere
    // bleibt unberuehrt, damit gleichzeitige Aenderungen anderer nicht
    // verloren gehen.
    const resolutionPatch: Record<string, any> = { [`votes.${memberId}`]: newVoteEntry };
    if (newStatus) {
      resolutionPatch.status = newStatus;
      if (newStatus === 'angenommen' && !resolution.passedAt) {
        resolutionPatch.passedAt = new Date().toISOString();
      }
    }
    await FirestoreAdmin.patchDocument(`resolutions/${resolutionId}`, resolutionPatch);

    await FirestoreAdmin.patchDocument(`usedVoteLinks/${nonce}`, {
      resolutionId,
      memberId,
      vote,
      usedAt: new Date().toISOString(),
    });

    const resolutionLabel = resolution.number || resolution.title || resolutionId;
    await writeNotification({
      title: `📧 Stimme per E-Mail: ${resolutionLabel}`,
      message: `${memberName} hat außerhalb der App per E-Mail-Link abgestimmt: ${VOTE_LABEL[vote]}.`,
      type: 'vote',
      targetTab: 'resolutions',
      targetId: resolutionId,
    });
    await writeAuditLogEntry({
      entityType: 'resolution',
      entityId: resolutionId,
      entityLabel: resolutionLabel,
      action: `${memberName} stimmte per E-Mail-Link: ${VOTE_LABEL[vote]}`,
      actorName: 'E-Mail-Stimme',
    });

    if (newStatus === 'angenommen' && !wasAccepted) {
      await writeNotification({
        title: `🎉 Beschluss angenommen: ${resolutionLabel}`,
        message: `"${resolution.title || resolutionLabel}" hat mit ${stats.yesCount} Ja-Stimmen das Quorum erreicht und ist offiziell gültig.`,
        type: 'vote',
        targetTab: 'resolutions',
        targetId: resolutionId,
      });
    }

    return {
      status: 200,
      html: page(
        'Stimme erfasst',
        `${escapeHtml(memberName)} hat für "${resolutionTitle}" mit <strong>${VOTE_LABEL[vote]}</strong> gestimmt.`,
        true,
        appUrl
      ),
    };
  } catch (err: any) {
    return {
      status: 500,
      html: page(
        'Fehler',
        `Die Stimme konnte nicht gespeichert werden: ${escapeHtml(err?.message || 'Unbekannter Fehler')}`,
        false,
        appUrl
      ),
    };
  }
}

/** Schlichte Bestaetigungsseite im Stil des Portals. */
function page(
  title: string,
  message: string,
  success: boolean,
  appUrl: string,
  options: { actionsHtml?: string; mark?: string; neutral?: boolean } = {}
): string {
  const markBg = options.neutral ? '#eff6ff' : success ? '#ecfdf5' : '#fef2f2';
  const markFg = options.neutral ? '#003594' : success ? '#047857' : '#b91c1c';
  const mark = options.mark || (success ? '✓' : '!');
  const actions = options.actionsHtml
    ? `<div class="actions">${options.actionsHtml}</div>`
    : `<a href="${appUrl}">Portal öffnen</a>`;

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
          background:${markBg}; color:${markFg}; }
  h1 { font-size:17px; margin:16px 0 8px; }
  p { font-size:14px; line-height:1.6; color:#475569; margin:0; }
  a { display:inline-block; margin-top:24px; padding:12px 20px; border-radius:14px;
      background:#003594; color:#fff; text-decoration:none; font-size:13px; font-weight:700; }
  .actions { margin-top:22px; }
  .actions a { display:block; margin-top:10px; }
  a.danger { background:#e11d48; }
  a.yes { background:#059669; }
  a.ghost { background:#f1f5f9; color:#334155; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">WJOF.</div>
    <div class="sub">Vorstandsportal</div>
    <div class="mark">${mark}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${actions}
  </div>
</body>
</html>`;
}
