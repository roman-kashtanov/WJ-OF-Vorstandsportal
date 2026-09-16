import React from 'react';
import { CURRENT_APP_VERSION, APP_BUILD_DATE } from '../constants/version';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { ChangelogList } from './ChangelogList';
import { X } from 'lucide-react';

/**
 * Versionsverlauf hinter der Versionsnummer in der Fußzeile - bewusst ohne
 * Code-Abfrage, damit jedes Vorstandsmitglied nachlesen kann, was sich
 * geändert hat (die Einstellungen sind per Admin-Code gesperrt).
 */

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center wj-overlay animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col wj-overlay-panel animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">Vorstandsportal</div>
            <h3 className="text-base font-bold">Was ist neu?</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3">
          <p className="text-[11px] text-slate-500">
            Installiert: <span className="font-bold text-slate-700">v{CURRENT_APP_VERSION}</span>
            {APP_BUILD_DATE ? ` · Stand ${APP_BUILD_DATE}` : ''}
          </p>
          <ChangelogList />
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
