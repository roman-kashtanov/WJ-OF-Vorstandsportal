import { flushSync } from 'react-dom';

/**
 * Weicher Uebergang fuer eine Zustandsaenderung, die das Bild umbaut - z. B.
 * ein Beschluss wandert ins Archiv, ein Reiter wechselt, ein Eintrag faellt
 * aus einer Liste.
 *
 * Nutzt die View Transitions API des Browsers: Er haelt das alte Bild fest,
 * fuehrt die Aenderung aus und blendet weich ins neue ueber; Elemente mit
 * `view-transition-name` gleiten dabei an ihre neue Position (Dauer und
 * Kurve in index.css). Ohne Unterstuetzung (aeltere Browser) oder bei
 * "Bewegung reduzieren" wird die Aenderung einfach sofort ausgefuehrt.
 *
 * Nur fuer Aenderungen, die der Nutzer selbst ausloest - nicht fuer
 * Live-Aktualisierungen aus Firestore: waehrend des Uebergangs liegt kurz ein
 * Standbild ueber der Seite, das wuerde beim Tippen stoeren.
 */
export function smooth(update: () => void): void {
  if (!supportsSmooth()) {
    update();
    return;
  }
  const doc = document as Document & { startViewTransition: (cb: () => void) => unknown };
  doc.startViewTransition(() => {
    flushSync(update);
  });
}

/**
 * Kurzform zum Weiterreichen: `onDelete={smoothly(handleDelete)}` fuehrt die
 * Aktion bei jedem Aufruf mit weichem Uebergang aus.
 */
export function smoothly<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
  return (...args: A) => smooth(() => fn(...args));
}

export function supportsSmooth(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    document.visibilityState === 'visible' &&
    !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Gueltiger `view-transition-name` aus einer ID. Namen muessen auf der Seite
 * eindeutig sein und duerfen nur Buchstaben, Ziffern, "-" und "_" enthalten.
 */
export function transitionName(prefix: string, id: string): string {
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}
