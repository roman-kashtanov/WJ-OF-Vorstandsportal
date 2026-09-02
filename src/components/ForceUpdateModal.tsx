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

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({ versionConfig }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!versionConfig) return null;

  const latestVersion = versionConfig.latestVersion || CURRENT_APP_VERSION;
  const isOutdated = compareVersions(CURRENT_APP_VERSION, latestVersion) < 0;
  const isForceUpdateRequired = versionConfig.forceUpdateEnabled && isOutdated;

  if (!isForceUpdateRequired) return null;

  const handleUpdateClick = async () => {
    setIsUpdating(true);
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
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          Eine neue Version ist verfügbar. Bitte aktualisieren Sie die Anwendung, um auf dem neuesten Stand zu bleiben.
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
      </div>
    </div>
  );
};

