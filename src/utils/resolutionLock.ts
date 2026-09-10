/**
 * Festschreibung von Beschluessen.
 *
 * Sobald ALLE Stimmberechtigten abgestimmt haben, bleibt noch 24 Stunden Zeit,
 * eine versehentlich falsch abgegebene Stimme zu korrigieren. Danach ist der
 * Beschluss festgeschrieben: keine Stimmabgabe und keine Stimmaenderung mehr.
 * Kommentare, Rechnungen und Nachweise bleiben weiterhin moeglich.
 *
 * Bewusst BERECHNET statt als Feld gespeichert: So gibt es keinen Zeitpunkt,
 * zu dem jemand "festschreiben" muss (kein Hintergrundjob), und Stimmen per
 * E-Mail-Link (api/vote.ts) werden mit derselben Regel geprueft wie im
 * Portal. Gespeichert wird nur die Aufhebung (`lockLiftedAt`) - sie gibt
 * erneut 24 Stunden, gerechnet ab der Aufhebung bzw. der letzten Stimme.
 *
 * Wird auch serverseitig importiert - deshalb ohne Browser-Abhaengigkeiten.
 */

export const LOCK_DELAY_MS = 24 * 60 * 60 * 1000;

interface LockableResolution {
  votes?: Record<string, { timestamp: string } | undefined>;
  eligibleVoterIds?: string[];
  lockLiftedAt?: string;
}

export interface ResolutionLockState {
  /** Haben alle Stimmberechtigten abgestimmt? */
  allVotesCast: boolean;
  /** Ab wann gilt (bzw. galt) die Festschreibung - nur wenn alle abgestimmt haben. */
  lockAt: Date | null;
  isLocked: boolean;
}

/**
 * Wer ist bei diesem Beschluss stimmberechtigt? Gleiche Regel wie die
 * Abstimmungsliste in ResolutionsView: ohne hinterlegte Liste zaehlen alle
 * Mitglieder.
 */
export function eligibleVoterIdsFor(
  resolution: LockableResolution,
  members: { id: string }[] = []
): string[] {
  if (resolution.eligibleVoterIds && resolution.eligibleVoterIds.length > 0) {
    return resolution.eligibleVoterIds;
  }
  return members.map((m) => m.id);
}

export function getResolutionLockState(
  resolution: LockableResolution,
  eligibleIds: string[],
  now: number = Date.now()
): ResolutionLockState {
  const open: ResolutionLockState = { allVotesCast: false, lockAt: null, isLocked: false };
  if (eligibleIds.length === 0) return open;

  const votes = eligibleIds.map((id) => resolution.votes?.[id]);
  if (votes.some((v) => !v)) return open;

  const lastVoteAt = Math.max(...votes.map((v) => Date.parse(v!.timestamp) || 0));
  const liftedAt = resolution.lockLiftedAt ? Date.parse(resolution.lockLiftedAt) || 0 : 0;
  const lockAt = Math.max(lastVoteAt, liftedAt) + LOCK_DELAY_MS;

  return { allVotesCast: true, lockAt: new Date(lockAt), isLocked: now >= lockAt };
}

export function formatLockDate(date: Date): string {
  return `${date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })} Uhr`;
}
