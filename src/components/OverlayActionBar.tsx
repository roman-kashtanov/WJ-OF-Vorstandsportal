import React from 'react';

/**
 * Aktionsleiste (Schliessen, ggf. Herunterladen) fuer Vollbild-Overlays, bei
 * denen die Knoepfe frei ueber dem Inhalt schweben - z.B. die Dateivorschau.
 *
 * Warum eine eigene Komponente: `top-4` allein landet auf dem iPhone unter
 * der Statusleiste bzw. der Dynamic Island, das Kreuz sass dadurch "irgendwo"
 * und war teils schwer zu treffen. Hier wird der Geraeterand
 * (`env(safe-area-inset-*)`) beruecksichtigt und die Trefferflaeche auf die
 * empfohlenen 44px gebracht. Modale mit eigener farbiger Kopfzeile brauchen
 * das nicht - dort sitzt das Kreuz bereits sauber in der Kopfzeile.
 */
export const OverlayActionBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="absolute z-10 flex items-center gap-2"
    style={{
      top: 'max(1rem, env(safe-area-inset-top))',
      right: 'max(1rem, env(safe-area-inset-right))',
    }}
  >
    {children}
  </div>
);

const buttonClass =
  'w-11 h-11 flex items-center justify-center bg-white/15 hover:bg-white/25 active:bg-white/30 ' +
  'text-white rounded-full backdrop-blur-sm shadow-lg transition-colors cursor-pointer ' +
  'focus:outline-none focus:ring-2 focus:ring-white/60';

export const OverlayIconButton: React.FC<{
  onClick?: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, title, children }) => (
  <button type="button" onClick={onClick} title={title} aria-label={title} className={buttonClass}>
    {children}
  </button>
);

export const OverlayIconLink: React.FC<{
  href: string;
  download?: string;
  onClick?: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
}> = ({ href, download, onClick, title, children }) => (
  <a
    href={href}
    download={download}
    onClick={onClick}
    title={title}
    aria-label={title}
    className={buttonClass}
  >
    {children}
  </a>
);
