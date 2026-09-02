import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
