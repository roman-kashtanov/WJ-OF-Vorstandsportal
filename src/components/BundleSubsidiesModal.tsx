import React, { useMemo, useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { BoardMember, Resolution, ResolutionAttachment, Subsidy, SubsidyPerson } from '../types';
import { formatCurrency } from '../utils/formatters';
import { isVotingMember } from '../utils/formatters';
import { getAttachmentType } from '../utils/fileHelpers';
import { X, Landmark, AlertTriangle, Vote } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subsidies: Subsidy[];
  people: SubsidyPerson[];
  year: number;
  currentMember: BoardMember;
  members: BoardMember[];
  existingResolutionCount: number;
  onCreate: (
    subsidyIds: string[],
    resolutionData: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>
  ) => void;
}

export const BundleSubsidiesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  subsidies,
  people,
  year,
  currentMember,
  members,
  existingResolutionCount,
  onCreate,
}) => {
  const personById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])),
    [people]
  );

  const eligible = useMemo(
    () => subsidies.filter((s) => s.year === year && s.status === 'bestaetigt'),
    [subsidies, year]
  );

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const effectiveSelected = useMemo(() => {
    if (Object.keys(selected).length > 0) return selected;
    return Object.fromEntries(eligible.map((s) => [s.id, true]));
  }, [selected, eligible]);

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const chosen = eligible.filter((s) => effectiveSelected[s.id]);
  const sum = chosen.reduce((acc, s) => acc + s.amount, 0);
  const missingProof = chosen.filter((s) => !s.proofFile);

  const eligibleVoterIds = (() => {
    const voting = members.filter(isVotingMember);
    return voting.length > 0 ? voting.map((m) => m.id) : members.map((m) => m.id);
  })();
  const requiredQuorum = Math.max(1, Math.ceil(eligibleVoterIds.length / 2));
  const currentYear = new Date().getFullYear();
  const autoNumber = `VB-${currentYear}-${String(existingResolutionCount + 1).padStart(2, '0')}`;

  const handleCreate = () => {
    if (chosen.length === 0) return;

    const lines = chosen.map((s) => {
      const person = personById[s.personId];
      return `- ${person?.name || s.personName}: ${s.eventName} – ${formatCurrency(s.amount)}`;
    });

    const attachments: ResolutionAttachment[] = chosen
      .filter((s) => !!s.proofFile)
      .map((s) => {
        const f = s.proofFile!;
        return {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: f.name,
          size: f.size,
          type: getAttachmentType(f.name, f.mimeType),
          mimeType: f.mimeType,
          dataUrl: f.dataUrl,
          uploadedAt: f.uploadedAt,
        };
      });

    onCreate(
      chosen.map((s) => s.id),
      {
        number: autoNumber,
        title: `Zuschüsse ${year} – Sammelfreigabe (${chosen.length})`,
        description: '',
        motionText: `Der Vorstand beschließt die Auszahlung folgender geprüfter Zuschüsse:\n\n${lines.join(
          '\n'
        )}\n\nGesamtsumme: ${formatCurrency(sum)}`,
        category: 'Finanzen & Budget',
        applicant: {
          id: currentMember.id,
          name: currentMember.name,
          role: currentMember.role,
        },
        requestedBudget: sum,
        status: 'in_abstimmung',
        eligibleVoterIds,
        requiredQuorum,
        attachments: attachments.length > 0 ? attachments : undefined,
      }
    );

    setSelected({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              Zuschüsse {year}
            </div>
            <h3 className="text-base font-bold">Zu Beschluss bündeln</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-3 text-xs">
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
            <Landmark className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#00A3E0]" strokeWidth={2} />
            <span>
              Aus den ausgewählten, bereits geprüften Zuschüssen wird ein neuer Beschluss
              erstellt. Erst wenn der Vorstand ihn annimmt, werden diese Zuschüsse zur Zahlung
              freigegeben.
            </span>
          </div>

          {eligible.length === 0 ? (
            <p className="text-slate-400 py-6 text-center">
              Keine geprüften Zuschüsse für {year} zum Bündeln.
            </p>
          ) : (
            <div className="space-y-1.5">
              {eligible.map((s) => {
                const person = personById[s.personId];
                const isChecked = !!effectiveSelected[s.id];
                return (
                  <label
                    key={s.id}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-blue-50/60 border-blue-200'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setSelected({ ...effectiveSelected, [s.id]: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 accent-[#003594] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-slate-900 truncate">
                          {person?.name || s.personName}
                        </span>
                        <span className="font-bold text-slate-900 shrink-0">
                          {formatCurrency(s.amount)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{s.eventName}</div>
                      {!s.proofFile && (
                        <div className="text-[11px] font-semibold text-amber-800 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                          Noch kein Nachweis hinterlegt
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {missingProof.length > 0 && chosen.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
              {missingProof.length} von {chosen.length} ausgewählten Zuschüssen haben noch keinen
              Nachweis. Sie können trotzdem gebündelt werden, der Nachweis lässt sich später
              nachreichen.
            </div>
          )}
        </div>

        {eligible.length > 0 && (
          <div className="p-3.5 sm:px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="text-xs">
              <span className="text-slate-500">Summe </span>
              <span className="font-bold text-slate-900">{formatCurrency(sum)}</span>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={chosen.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 font-bold text-white text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Vote className="w-4 h-4" strokeWidth={2} />
              Beschluss erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
