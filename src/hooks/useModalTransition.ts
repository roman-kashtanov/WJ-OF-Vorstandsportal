import { useEffect, useState } from 'react';

/**
 * Haelt ein Fenster kurz weiter gerendert, nachdem isOpen auf false wechselt,
 * damit eine Schliessen-Animation ablaufen kann, bevor die Komponente aus
 * dem DOM verschwindet. Ohne das gibt es kein "beim Schliessen": React
 * entfernt das Fenster sofort, es ist keine Zeit fuer eine Animation.
 *
 * Nutzung: `const { shouldRender, isClosing } = useModalTransition(isOpen);`
 * dann `if (!shouldRender) return null;` und die Wurzel-Elemente je nach
 * `isClosing` mit "animate-in fade-in ..." bzw. "animate-out fade-out ..."
 * versehen. `durationMs` muss zur tatsaechlichen CSS-Animationsdauer passen
 * (Standard 150ms, siehe .animate-out in index.css).
 */
export function useModalTransition(isOpen: boolean, durationMs = 150) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      return;
    }
    if (!shouldRender) return;
    const timer = setTimeout(() => setShouldRender(false), durationMs);
    return () => clearTimeout(timer);
  }, [isOpen, durationMs, shouldRender]);

  return { shouldRender, isClosing: shouldRender && !isOpen };
}
