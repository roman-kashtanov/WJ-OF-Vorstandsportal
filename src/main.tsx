import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

/**
 * Pinch-Zoom auf iOS unterbinden, damit sich die installierte App wie eine
 * native App anfuehlt. Der frueher zusaetzlich vorhandene "Doppeltipp"-Blocker
 * wurde entfernt: er hat auch normale, schnell aufeinanderfolgende Tipps
 * verschluckt. Gegen Doppeltipp-Zoom genuegt `touch-action: manipulation`.
 */
if (typeof window !== 'undefined') {
  const block = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', block, { passive: false });
  document.addEventListener('gesturechange', block, { passive: false });
  document.addEventListener('gestureend', block, { passive: false });
}

/**
 * Pfad-Weiche fuer die zwei oeffentlichen, unauthentifizierten Seiten
 * (/antrag, /nachweis). Bewusst per dynamischem import() statt eines
 * statischen "import App", damit das komplette authentifizierte App-Bundle
 * (Firebase, Vorstands-State) gar nicht erst im Netzwerkpfad anonymer
 * Besucher landet - eine statische Import-Anweisung wuerde trotz der
 * Pfadpruefung immer mitgebuendelt und geladen.
 */
const root = createRoot(document.getElementById('root')!);
const path = window.location.pathname;

if (path === '/antrag') {
  import('./public/SubsidyApplicationPage').then(({ SubsidyApplicationPage }) => {
    root.render(
      <StrictMode>
        <SubsidyApplicationPage />
      </StrictMode>
    );
  });
} else if (path === '/nachweis') {
  import('./public/SubsidyProofUploadPage').then(({ SubsidyProofUploadPage }) => {
    root.render(
      <StrictMode>
        <SubsidyProofUploadPage />
      </StrictMode>
    );
  });
} else {
  import('./App').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
}
