/**
 * Weiches Ausblenden fuer ALLE Fenster, Dialoge und Aufklapp-Menues - zentral,
 * ohne jedes Fenster einzeln umzubauen.
 *
 * Problem: React entfernt ein Fenster beim Schliessen sofort aus der Seite.
 * Es gab deshalb nur beim Oeffnen eine Animation, beim Schliessen verschwand
 * es schlagartig (rund 25 Fenster, jedes anders aufgerufen).
 *
 * Loesung: Ein MutationObserver bemerkt, wenn ein Element mit der Klasse
 * `wj-overlay` (abgedunkelter Fensterhintergrund) oder dem Attribut
 * `data-wj-exit` (z. B. Menues) entfernt wird. An derselben Stelle wird fuer
 * einen Moment eine nicht bedienbare Kopie eingesetzt, die ausblendet
 * (Klasse `wj-ghost`, siehe index.css) und sich danach selbst entfernt.
 *
 * Bewusst nur fuer Elemente AUSSERHALB des Seitenflusses (fixed/absolute):
 * Sie nehmen keinen Platz ein, die Kopie verschiebt also nichts. Fuer Inhalte
 * im Seitenfluss gibt es <Collapse> bzw. smooth().
 *
 * Neue Fenster brauchen nichts weiter - `wj-overlay` haben sie ohnehin.
 */

const EXIT_MS = 200;
const SELECTOR = '.wj-overlay, [data-wj-exit]';

/** Letzte Scroll-Position je Element - ein entferntes Element meldet 0. */
const scrollMemory = new WeakMap<Element, number>();

let installed = false;

export function installOverlayExitAnimations(): void {
  if (installed || typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  installed = true;

  document.addEventListener(
    'scroll',
    (e) => {
      const el = e.target;
      if (el instanceof Element) scrollMemory.set(el, el.scrollTop);
    },
    true
  );

  const observer = new MutationObserver((mutations) => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    for (const mutation of mutations) {
      mutation.removedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (!node.matches(SELECTOR)) return;
        // Eigene Kopien und Fenster mit eigener Schliess-Animation
        // (useModalTransition) nicht doppelt ausblenden.
        if (node.classList.contains('wj-ghost') || node.classList.contains('animate-out')) return;

        const parent = mutation.target;
        if (!(parent instanceof Node) || !parent.isConnected) return;
        const before =
          mutation.nextSibling && mutation.nextSibling.parentNode === parent
            ? mutation.nextSibling
            : null;

        playExit(node, parent, before);
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function playExit(original: HTMLElement, parent: Node, before: Node | null) {
  const ghost = original.cloneNode(true) as HTMLElement;

  // Einblend-Animationen der Kopie nicht erneut abspielen
  const enterClasses = ['animate-in', 'wj-view-enter', 'wj-expand'];
  [ghost, ...Array.from(ghost.querySelectorAll<HTMLElement>('*'))].forEach((el) =>
    el.classList.remove(...enterClasses)
  );

  ghost.classList.add('wj-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.removeAttribute('id');
  ghost.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));

  parent.insertBefore(ghost, before);

  // Scroll-Position im Fenster uebernehmen, sonst springt der Inhalt nach oben
  const originals = [original, ...Array.from(original.querySelectorAll('*'))];
  const copies = [ghost, ...Array.from(ghost.querySelectorAll('*'))];
  originals.forEach((el, i) => {
    const top = scrollMemory.get(el);
    if (top && copies[i]) copies[i].scrollTop = top;
  });

  window.setTimeout(() => ghost.remove(), EXIT_MS + 40);
}
