import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Reiter per Wischen wechseln (Beschluesse, Zuschuesse, Auslagen, Belege).
 *
 * Nach links wischen → naechster Reiter, nach rechts → vorheriger. Erkannt
 * wird nur eine klar waagerechte, zuegige Bewegung, damit normales Scrollen
 * nie versehentlich den Reiter wechselt. Ignoriert werden Gesten, die in
 * Eingabefeldern, in Fenstern oder in waagerecht scrollbaren Leisten (z. B.
 * der Reiterleiste selbst) beginnen.
 *
 * Tippen und Wischen laufen beide ueber `select()`. Daraus ergibt sich die
 * Richtung fuer die Einblendung: `slideClass` an den Inhalt haengen, der
 * `key={active}` traegt - er gleitet dann von rechts bzw. links herein.
 */

const MIN_DISTANCE_PX = 60;
const MAX_DURATION_MS = 700;
/** Die Bewegung muss deutlich waagerechter als senkrecht sein. */
const DIRECTION_RATIO = 1.5;

const IGNORE_SELECTOR =
  'input, textarea, select, [contenteditable="true"], .wj-overlay, [data-wj-exit], [data-no-swipe]';

export function useSwipeTabs<K extends string>(options: {
  keys: readonly K[];
  active: K;
  onChange: (key: K) => void;
  /** z. B. aus, solange eine Detailansicht offen ist */
  enabled?: boolean;
}) {
  const { keys, active, onChange, enabled = true } = options;
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

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
    const el = ref.current;
    if (!el || !enabled) return;

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
  }, [enabled]);

  const slideClass =
    direction === 'next' ? 'wj-slide-from-right' : direction === 'prev' ? 'wj-slide-from-left' : '';

  return { ref, select, slideClass };
}

function shouldIgnore(target: Element, boundary: Element): boolean {
  if (target.closest(IGNORE_SELECTOR)) return true;
  // Waagerecht scrollbare Leisten sollen scrollen, nicht den Reiter wechseln
  for (let node: Element | null = target; node && node !== boundary; node = node.parentElement) {
    const style = window.getComputedStyle(node);
    const scrollable = style.overflowX === 'auto' || style.overflowX === 'scroll';
    if (scrollable && node.scrollWidth > node.clientWidth + 1) return true;
  }
  return false;
}
