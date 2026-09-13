import React, { useEffect, useRef, useState } from 'react';

const DURATION_MS = 260;
const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

interface Props {
  open: boolean;
  children: React.ReactNode;
  /** Klassen fuer den Inhalt (Abstaende, Hintergrund, Rahmen) */
  className?: string;
}

/**
 * Weiches Auf- UND Zuklappen.
 *
 * Frueher wurde Inhalt per `{offen && <div className="wj-expand">}`
 * eingeblendet: Beim Oeffnen gab es eine kurze Einblendung, beim Schliessen
 * verschwand er schlagartig und alles darunter sprang nach oben. Hier
 * animiert die Hoehe in beide Richtungen (CSS grid-template-rows 0fr ↔ 1fr,
 * ohne Messen per JavaScript), der Inhalt blendet dazu ein bzw. aus und wird
 * erst nach dem Zuklappen entfernt.
 *
 * Wird `children` beim Schliessen leer (z. B. `{banner && ...}`), zeigt die
 * Komponente waehrend des Zuklappens den zuletzt sichtbaren Inhalt weiter.
 */
export const Collapse: React.FC<Props> = ({ open, children, className }) => {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);
  /** Erst nach dem Aufklappen darf der Inhalt ueberstehen (Schatten, Fokusrahmen). */
  const [settled, setSettled] = useState(open);

  const lastChildren = useRef<React.ReactNode>(children);
  if (open && children) lastChildren.current = children;

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    if (open) {
      setMounted(true);
      setSettled(false);
      // Zwei Bilder warten: erst muss der zugeklappte Zustand gezeichnet sein,
      // sonst startet der Browser die Animation nicht.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setExpanded(true));
      });
      timer = window.setTimeout(() => setSettled(true), DURATION_MS + 30);
    } else {
      setSettled(false);
      setExpanded(false);
      timer = window.setTimeout(() => setMounted(false), DURATION_MS + 30);
    }
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={!open}
      style={{
        display: 'grid',
        gridTemplateRows: expanded ? '1fr' : '0fr',
        opacity: expanded ? 1 : 0,
        transition: `grid-template-rows ${DURATION_MS}ms ${EASING}, opacity ${DURATION_MS}ms ${EASING}`,
      }}
    >
      <div style={{ minHeight: 0, overflow: settled && expanded ? 'visible' : 'hidden' }}>
        <div className={className}>{open ? children : lastChildren.current}</div>
      </div>
    </div>
  );
};
