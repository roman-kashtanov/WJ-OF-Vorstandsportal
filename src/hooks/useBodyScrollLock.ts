import { useEffect } from 'react';

/**
 * Sperrt das Scrollen der Seite dahinter, solange ein Fenster offen ist.
 *
 * Ohne das: Der Hintergrund-Container (App.tsx) blieb scrollbar, obwohl ein
 * Fenster als "fixed inset-0" darueberliegt. Ein Mausrad-/Wisch-Ereignis,
 * das der innere Scroll-Bereich des Fensters nicht mehr aufnehmen konnte
 * (z. B. am oberen/unteren Rand), wanderte weiter zum naechsten scrollbaren
 * Vorfahren - und das war body/html, sichtbar als "der Hintergrund scrollt
 * mit". Mehrere Aufrufer koennen das gleichzeitig setzen (z. B. ein Fenster
 * oeffnet ein weiteres); erst wenn der letzte schliesst, wird entsperrt.
 *
 * Warum `position: fixed` statt nur `overflow: hidden`:
 * Auf iPhone/iPad ignoriert Safari `overflow: hidden` am body fuer
 * Touch-Gesten - der Hintergrund liess sich weiterhin wegwischen. Zuverlaessig
 * ist nur, den body waehrenddessen aus dem Fluss zu nehmen und die
 * Scrollposition beim Entsperren exakt wiederherzustellen (sonst springt die
 * Seite nach oben). `overflow: hidden` bleibt zusaetzlich fuer Desktop, wo es
 * die Scrollleiste sauber unterdrueckt.
 */
let lockCount = 0;
let restore: {
  htmlOverflow: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  scrollY: number;
} | null = null;

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      const scrollY = window.scrollY;
      restore = {
        htmlOverflow: document.documentElement.style.overflow,
        bodyOverflow: document.body.style.overflow,
        bodyPosition: document.body.style.position,
        bodyTop: document.body.style.top,
        bodyLeft: document.body.style.left,
        bodyRight: document.body.style.right,
        bodyWidth: document.body.style.width,
        scrollY,
      };

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0 && restore) {
        const saved = restore;
        restore = null;
        document.documentElement.style.overflow = saved.htmlOverflow;
        document.body.style.overflow = saved.bodyOverflow;
        document.body.style.position = saved.bodyPosition;
        document.body.style.top = saved.bodyTop;
        document.body.style.left = saved.bodyLeft;
        document.body.style.right = saved.bodyRight;
        document.body.style.width = saved.bodyWidth;
        // Ohne das springt die Seite nach dem Schliessen an den Anfang.
        window.scrollTo(0, saved.scrollY);
      }
    };
  }, [active]);
}
