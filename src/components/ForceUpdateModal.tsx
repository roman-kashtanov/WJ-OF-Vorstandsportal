import React, { useState } from 'react';
import { RefreshCw, ArrowUpCircle } from 'lucide-react';
import { AppVersionConfig } from '../types';
import { 
  CURRENT_APP_VERSION, 
  forceAppReload, 
  compareVersions 
} from '../constants/version';

interface ForceUpdateModalProps {
  versionConfig: AppVersionConfig | null;
}

/**
 * Merkt sich pro Browser-Sitzung, wie oft hier schon ein Reload versucht
 * wurde. Bleibt der Dialog danach weiter offen, ist die geforderte Version
 * mit ziemlicher Sicherheit noch nicht wirklich ausgeliefert (oder ein
 * Netzwerk-/Cache-Problem verhindert das Laden des neuen Bundles) - dann
 * hilft ein weiterer Klick auf denselben Knopf nicht, und genau das sollte
 * sichtbar werden, statt endlos denselben Knopf anzubieten.
 */
const RELOAD_ATTEMPTS_KEY = 'wjof_force_update_attempts';

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({ versionConfig }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!versionConfig) return null;

  // Massgeblich ist minRequiredVersion ("das muss mindestens erreicht sein"),
  // nicht latestVersion (das waere eher eine unverbindliche Empfehlung).
  const requiredVersion = versionConfig.minRequiredVersion || CURRENT_APP_VERSION;
  const isOutdated = compareVersions(CURRENT_APP_VERSION, requiredVersion) < 0;
  const isForceUpdateRequired = versionConfig.forceUpdateEnabled && isOutdated;

  if (!isForceUpdateRequired) {
    // Erfolgreich auf der geforderten Version angekommen - Zaehler zuruecksetzen.
    try {
      sessionStorage.removeItem(RELOAD_ATTEMPTS_KEY);
    } catch {}
    return null;
  }

  let attempts = 0;
  try {
    attempts = Number(sessionStorage.getItem(RELOAD_ATTEMPTS_KEY) || '0');
  } catch {}

  const handleUpdateClick = async () => {
    setIsUpdating(true);
    try {
      sessionStorage.setItem(RELOAD_ATTEMPTS_KEY, String(attempts + 1));
    } catch {}
    await forceAppReload();
  };

  return (
    <div
      id="force-update-modal"
      className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-900 shadow-xl border border-slate-200 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center mx-auto mb-4">
          <ArrowUpCircle className="w-6 h-6 text-[#003594]" strokeWidth={1.75} />
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-2">
          Bitte aktualisieren Sie die Anwendung
        </h2>
        <p className="text-xs text-slate-600 mb-3 leading-relaxed">
          Eine neue Version ist verfügbar. Bitte aktualisieren Sie die Anwendung, um auf dem neuesten Stand zu bleiben.
        </p>

        {/* Immer sichtbar, nicht erst nach mehreren Versuchen: Wer beide
            Versionsnummern sieht, erkennt sofort, ob ueberhaupt eine
            tatsaechlich ausgelieferte Version verlangt wird. */}
        <p className="text-[11px] text-slate-400 mb-5 font-mono">
          Installiert: v{CURRENT_APP_VERSION} · Benötigt: v{requiredVersion}
        </p>

        <button
          type="button"
          onClick={handleUpdateClick}
          disabled={isUpdating}
          className="w-full py-3 px-4 rounded-xl bg-[#003594] hover:bg-[#00266B] active:scale-98 text-white font-semibold text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          <span>{isUpdating ? 'Wird aktualisiert...' : 'Anwendung aktualisieren'}</span>
        </button>

        {attempts >= 2 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-[11px] text-amber-900 leading-relaxed">
            <strong className="block mb-1">Das hat schon {attempts}× nicht geholfen.</strong>
            Die verlangte Version v{requiredVersion} wurde vermutlich noch nicht
            wirklich veröffentlicht. Bitte einen Administrator bitten, unter
            Einstellungen → System die erzwungene Aktualisierung zu prüfen
            oder zu deaktivieren.
          </div>
        )}
      </div>
    </div>
  );
};

