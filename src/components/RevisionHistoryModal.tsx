import React from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { AuditLogEntry } from '../types';
import { RevisionHistory } from './RevisionHistory';
import { X, History as HistoryIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entries: AuditLogEntry[];
}

/**
 * Historie auf Wunsch abrufbar statt dauerhaft eingeblendet - sonst wird
 * die Beschluss-/Rechnungs-/Zuschuss-Ansicht schnell unübersichtlich.
 * Kapselt RevisionHistory.tsx in einem eigenen Fenster, das per Button
 * geöffnet wird (siehe ResolutionsView.tsx/SubsidiesView.tsx/
 * InvoiceDetailModal.tsx).
 */
export const RevisionHistoryModal: React.FC<Props> = ({ isOpen, onClose, title, entries }) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <HistoryIcon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                Historie
              </div>
              <h3 className="text-sm font-bold truncate">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 text-xs">
          <RevisionHistory entries={entries} />
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
