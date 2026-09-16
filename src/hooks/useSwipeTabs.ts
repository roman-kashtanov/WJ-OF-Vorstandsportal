import { RefCallback, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reiter per Wischen wechseln (Beschluesse, Zuschuesse, Auslagen, Belege und
 * die Einstellungen).
 *
 * Nach links wischen → naechster Reiter, nach rechts → vorheriger. Erkannt
 * wird nur eine klar waagerechte, zuegige Bewegung, damit normales Scrollen
 * nie versehentlich den Reiter wechselt. Ignoriert werden Gesten, die in
 * Eingabefeldern, in fremden Fenstern oder in waagerecht scrollbaren Leisten
 * (z. B. der Reiterleiste selbst) beginnen.
 *
 * **Wo das Wischen greift** (v4.1.0): Die Gesten haengen bewusst NICHT am
 * `ref`-Element - das ist nur so hoch wie seine Liste, weshalb der leere
 * Bereich darunter frueher nicht reagierte. Stattdessen lauscht der Hook am
 * gesamten Inhaltsbereich der Seite (`<main>`), bei `scope: 'self'` am
 * ref-Element selbst (Einstellungsfenster). `ref` bleibt in beiden Faellen
 * der Bezugspunkt fuer die Ausschluesse.
 *
 * Tippen und Wischen laufen beide ueber `select()`. Daraus ergibt sich die
 * Richtung fuer die Einblendung: `slideClass` an den Inhalt haengen, der
 * `key={active}` traegt - er gleitet dann von rechts bzw. links herein.
 */

const MIN_DISTANCE_PX = 60;
const MAX_DURATION_MS = 700;
/** Die Bewegung muss deutlich waagerechter als senkrecht sein. */
const DIRECTION_RATIO = 1.5;

const IGNORE_SELECTOR = 'input, textarea, select, [contenteditable="true"], [data-no-swipe]';
/** Fenster und schwebende Menues: nur ignorieren, wenn sie NICHT zum Wischbereich gehoeren. */
const OVERLAY_SELECTOR = '.wj-overlay, [data-wj-exit]';

export function useSwipeTabs<K extends string>(options: {
  keys: readonly K[];
  active: K;
  onChange: (key: K) => void;
  /** z. B. aus, solange eine Detailansicht offen ist */
  enabled?: boolean;
  /**
   * 'main' (Standard): der ganze Inhaltsbereich der Seite reagiert, auch der
   * leere Platz unter der Liste. 'self': nur das ref-Element - fuer Fenster,
   * die kein <main> ueber sich haben.
   */
  scope?: 'main' | 'self';
}) {
  const { keys, active, onChange, enabled = true, scope = 'main' } = options;
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  /**
   * Bewusst ein Callback-Ref mit State statt useRef: Fenster wie die
   * Einstellungen bleiben dauerhaft eingebunden und haben beim ersten
   * Durchlauf noch gar keinen Inhalt. Ein useRef waere dann leer, der Effekt
   * liefe nie erneut - die Gesten wuerden nie angemeldet. So laeuft er genau
   * dann, wenn das Element erscheint (und noch einmal, wenn es verschwindet).
   */
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const ref = useCallback<RefCallback<HTMLDivElement>>((el) => setNode(el), []);

  const select = useCallback(
    (key: K) => {
      if (key === active) return;
      setDirection(keys.indexOf(key) > keys.indexOf(active) ? 'next' : 'prev');
      onChange(key);
    },
    [keys, active, onChange]
  );

  // Die Gesten-Handler werden nur einmal angemeldet und lesen immer den
  // aktuellen Stand von hier.
  const latest = useRef({ keys, active, select });
  latest.current = { keys, active, select };

  useEffect(() => {
    if (!node || !enabled) return;

    // Der leere Bereich unter der Liste gehoert zu <main>, nicht mehr zur
    // Liste selbst - deshalb haengen die Handler dort.
    const el = (scope === 'main' ? node.closest('main') : null) || node;

    let start: { x: number; y: number; t: number } | null = null;

    const onStart = (e: TouchEvent) => {
      start = null;
      if (e.touches.length !== 1) return;
      const target = e.target instanceof Element ? e.target : null;
      if (!target || shouldIgnore(target, el)) return;
      const touch = e.touches[0];
      start = { x: touch.clientX, y: touch.clientY, t: Date.now() };
    };

    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const dt = Date.now() - start.t;
      start = null;

      if (dt > MAX_DURATION_MS) return;
      if (Math.abs(dx) < MIN_DISTANCE_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return;

      const { keys: ks, active: current, select: go } = latest.current;
      const index = ks.indexOf(current);
      const target = dx < 0 ? ks[index + 1] : ks[index - 1];
      if (target !== undefined) go(target);
    };

    const onCancel = () => {
      start = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onCancel);
    };
  }, [node, enabled, scope]);

  const slideClass =
    direction === 'next' ? 'wj-slide-from-right' : direction === 'prev' ? 'wj-slide-from-left' : '';

  return { ref, select, slideClass };
}

function shouldIgnore(target: Element, boundary: Element): boolean {
  if (target.closest(IGNORE_SELECTOR)) return true;

  // Ein Fenster ueber der Seite blockiert das Wischen - liegt der Wischbereich
  // aber selbst in diesem Fenster (Einstellungen), ist es das gewollte Ziel.
  const overlay = target.closest(OVERLAY_SELECTOR);
  if (overlay && !overlay.contains(boundary)) return true;

  // Waagerecht scrollbare Leisten sollen scrollen, nicht den Reiter wechseln
  for (let node: Element | null = target; node && node !== boundary; node = node.parentElement) {
    const style = window.getComputedStyle(node);
    const scrollable = style.overflowX === 'auto' || style.overflowX === 'scroll';
    if (scrollable && node.scrollWidth > node.clientWidth + 1) return true;
  }
  return false;
}
