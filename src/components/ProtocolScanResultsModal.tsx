import React, { useEffect, useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { BoardMember, Resolution, ResolutionCategory } from '../types';
import {
  ScannedResolutionCandidate,
  RESOLUTION_CATEGORIES,
} from '../utils/protocolResolutionParser';
import { isVotingMember } from '../utils/formatters';
import { Sparkles, X, Vote } from 'lucide-react';

interface DraftCandidate {
  checked: boolean;
  title: string;
  motionText: string;
  requestedBudget: string;
  category: ResolutionCategory | '';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidates: ScannedResolutionCandidate[];
  meetingLabel: string;
  currentMember: BoardMember;
  members: BoardMember[];
  existingResolutionCount: number;
  onCreateResolution: (
    data: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>
  ) => void;
}

/**
 * Zeigt die per Text-Muster erkannten Beschluss-Vorschlaege aus einem
 * eingefuegten Sitzungsprotokoll-Text (src/utils/protocolResolutionParser.ts,
 * rein clientseitig, kein KI-Aufruf). Legt NIE selbst etwas an - jeder
 * Kandidat wird einzeln bestaetigt/bearbeitet/abgehakt, erst der Button
 * unten ruft fuer die angehakten Eintraege die ganz normale
 * handleCreateResolution() auf (Notification/Revisionshistorie/
 * Abstimmungs-Mail laufen dadurch automatisch mit, wie bei jedem von
 * Hand angelegten Beschluss).
 */
export const ProtocolScanResultsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  candidates,
  meetingLabel,
  currentMember,
  members,
  existingResolutionCount,
  onCreateResolution,
}) => {
  const [drafts, setDrafts] = useState<DraftCandidate[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDrafts(
        candidates.map((c) => ({
          checked: true,
          title: c.title,
          motionText: c.motionText,
          requestedBudget: c.requestedBudget != null ? String(c.requestedBudget) : '',
          category: RESOLUTION_CATEGORIES.includes(c.category as ResolutionCategory)
            ? (c.category as ResolutionCategory)
            : '',
        }))
      );
    }
  }, [isOpen, candidates]);

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const eligibleVoterIds = (() => {
    const voting = members.filter(isVotingMember);
    return voting.length > 0 ? voting.map((m) => m.id) : members.map((m) => m.id);
  })();

  const updateDraft = (index: number, patch: Partial<DraftCandidate>) => {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const checkedCount = drafts.filter((d) => d.checked && d.title.trim() && d.motionText.trim()).length;
  const currentYear = new Date().getFullYear();

  const handleCreateAll = () => {
    const requiredQuorum = Math.max(1, Math.ceil(eligibleVoterIds.length / 2));
    let nextNumber = existingResolutionCount;

    drafts.forEach((d) => {
      if (!d.checked || !d.title.trim() || !d.motionText.trim()) return;
      nextNumber += 1;
      onCreateResolution({
        number: `VB-${currentYear}-${String(nextNumber).padStart(2, '0')}`,
        title: d.title.trim(),
        description: '',
        motionText: d.motionText.trim(),
        category: d.category || undefined,
        applicant: {
          id: currentMember.id,
          name: currentMember.name,
          role: currentMember.role,
        },
        requestedBudget: d.requestedBudget ? parseFloat(d.requestedBudget) : undefined,
        status: 'in_abstimmung',
        eligibleVoterIds,
        requiredQuorum,
      });
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[92dvh]">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#00A3E0]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">Erkannte Beschlüsse</h3>
              <p className="text-xs text-blue-100">Aus dem Protokoll von „{meetingLabel}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto text-xs">
          {drafts.length === 0 ? (
            <p className="text-slate-500 text-center py-6">
              Im Protokoll wurden keine Beschlüsse erkannt.
            </p>
          ) : (
            <>
              <p className="text-slate-500">
                Bitte jeden Vorschlag prüfen und bei Bedarf korrigieren. Nur angehakte Einträge
                werden als Beschluss angelegt und in die Abstimmung gegeben.
              </p>
              {drafts.map((d, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3.5 space-y-2.5 transition-colors ${
                    d.checked ? 'bg-blue-50/40 border-[#003594]/40' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={d.checked}
                      onChange={(e) => updateDraft(i, { checked: e.target.checked })}
                      className="mt-0.5 w-4 h-4 accent-[#003594] cursor-pointer"
                    />
                    <input
                      value={d.title}
                      onChange={(e) => updateDraft(i, { title: e.target.value })}
                      placeholder="Titel des Beschlusses"
                      className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                    />
                  </label>

                  <textarea
                    value={d.motionText}
                    onChange={(e) => updateDraft(i, { motionText: e.target.value })}
                    rows={3}
                    placeholder="Beschlusswortlaut"
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003594] resize-none"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-500 text-[10px] uppercase mb-1">
                        Betrag (optional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={d.requestedBudget}
                        onChange={(e) => updateDraft(i, { requestedBudget: e.target.value })}
                        placeholder="€"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-500 text-[10px] uppercase mb-1">
                        Kategorie
                      </label>
                      <select
                        value={d.category}
                        onChange={(e) =>
                          updateDraft(i, { category: e.target.value as ResolutionCategory | '' })
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003594]"
                      >
                        <option value="">— Keine —</option>
                        {RESOLUTION_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold text-xs cursor-pointer"
          >
            Abbrechen
          </button>
          {drafts.length > 0 && (
            <button
              type="button"
              onClick={handleCreateAll}
              disabled={checkedCount === 0}
              className="px-4 py-2 rounded-xl bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 font-bold text-white text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Vote className="w-3.5 h-3.5" strokeWidth={1.75} />
              {checkedCount} Beschluss{checkedCount === 1 ? '' : 'e'} anlegen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
