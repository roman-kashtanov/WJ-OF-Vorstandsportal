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
 */
let lockCount = 0;
let previousOverflow = '';

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [active]);
}
