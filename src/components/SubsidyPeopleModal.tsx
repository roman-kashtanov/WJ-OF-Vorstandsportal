import React, { useMemo, useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { SubsidyPerson, SubsidyPersonType, Subsidy } from '../types';
import { formatCurrency } from '../utils/formatters';
import { PERSON_TYPE_LABEL, personBudget, normalizeNameKey } from '../utils/subsidies';
import { SubsidyLimits } from '../data/subsidyCatalogue';
import { isValidIban, formatIban } from '../utils/sepa';
import { X, UserPlus, Trash2, Pencil, Check, Users2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  people: SubsidyPerson[];
  subsidies: Subsidy[];
  year: number;
  limits: SubsidyLimits;
  onSave: (person: SubsidyPerson) => void;
  onDelete: (personId: string) => void;
  onMerge: (keepId: string, mergeId: string) => void;
}

const emptyDraft = (): SubsidyPerson => ({
  id: '',
  name: '',
  type: 'mitglied',
  email: '',
  iban: '',
  bic: '',
  accountHolder: '',
  isActive: true,
  note: '',
  createdAt: '',
});

export const SubsidyPeopleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  people,
  subsidies,
  year,
  limits,
  onSave,
  onDelete,
  onMerge,
}) => {
  const [draft, setDraft] = useState<SubsidyPerson | null>(null);
  const [ibanError, setIbanError] = useState<string | null>(null);

  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, SubsidyPerson[]>();
    for (const p of people) {
      const key = normalizeNameKey(p.name);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    return [...groups.values()]
      .filter((g) => g.length > 1)
      .map((g) => [...g].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }, [people]);

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const startNew = () => {
    setDraft(emptyDraft());
    setIbanError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !draft.name.trim()) return;

    const iban = (draft.iban || '').replace(/\s+/g, '').toUpperCase();
    if (iban && !isValidIban(iban)) {
      setIbanError('Diese IBAN ist nicht gültig (Prüfziffer stimmt nicht).');
      return;
    }

    onSave({
      ...draft,
      id: draft.id || `sp_${Date.now()}`,
      name: draft.name.trim(),
      iban,
      bic: (draft.bic || '').replace(/\s+/g, '').toUpperCase(),
      createdAt: draft.createdAt || new Date().toISOString(),
    });
    setDraft(null);
  };

  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              Zuschüsse
            </div>
            <h3 className="text-base font-bold">Personen & Bankverbindung</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {duplicateGroups.length > 0 && (
            <div className="space-y-1.5">
              {duplicateGroups.map((group) => {
                const [keep, ...rest] = group;
                return (
                  <div
                    key={keep.id}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-2.5"
                  >
                    <Users2 className="w-4 h-4 mt-0.5 text-amber-700 shrink-0" strokeWidth={1.75} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-amber-900">
                        Diese Einträge könnten dieselbe Person sein
                      </p>
                      <p className="text-amber-800 mt-0.5">
                        {group.map((p) => p.name).join(' · ')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !confirm(
                              `${rest.map((p) => p.name).join(', ')} in "${keep.name}" zusammenführen? Alle zugehörigen Zuschüsse werden übernommen.`
                            )
                          )
                            return;
                          rest.forEach((p) => onMerge(keep.id, p.id));
                        }}
                        className="mt-1.5 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Zusammenführen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!draft && (
            <button
              type="button"
              onClick={startNew}
              className="w-full py-2.5 rounded-xl bg-[#003594] hover:bg-[#00266B] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.75} />
              <span>Person anlegen</span>
            </button>
          )}

          {draft && (
            <form onSubmit={submit} className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Name *</label>
                  <input
                    required
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Vor- und Nachname"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status *</label>
                  <select
                    value={draft.type}
                    onChange={(e) =>
                      setDraft({ ...draft, type: e.target.value as SubsidyPersonType })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  >
                    {(Object.keys(PERSON_TYPE_LABEL) as SubsidyPersonType[]).map((t) => (
                      <option key={t} value={t}>
                        {PERSON_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-Mail</label>
                <input
                  type="email"
                  value={draft.email || ''}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>

              <div className="pt-1 border-t border-blue-200/60">
                <div className="font-bold text-slate-700 mb-2 mt-2">
                  Bankverbindung für die Auszahlung
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-600 mb-1">IBAN</label>
                    <input
                      value={draft.iban || ''}
                      onChange={(e) => {
                        setDraft({ ...draft, iban: e.target.value });
                        setIbanError(null);
                      }}
                      placeholder="DE.. .... .... .... .... .."
                      className={`w-full px-3 py-2 bg-white border rounded-lg font-mono text-base sm:text-xs focus:outline-none focus:ring-2 ${
                        ibanError
                          ? 'border-rose-300 focus:ring-rose-400'
                          : 'border-slate-200 focus:ring-[#003594]'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      BIC <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      value={draft.bic || ''}
                      onChange={(e) => setDraft({ ...draft, bic: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                    />
                  </div>
                </div>

                {ibanError && (
                  <p className="mt-1.5 text-[11px] font-semibold text-rose-700">{ibanError}</p>
                )}

                <div className="mt-2.5">
                  <label className="block font-semibold text-slate-600 mb-1">
                    Kontoinhaber{' '}
                    <span className="font-normal text-slate-400">
                      (nur wenn abweichend vom Namen)
                    </span>
                  </label>
                  <input
                    value={draft.accountHolder || ''}
                    onChange={(e) => setDraft({ ...draft, accountHolder: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#003594] text-white font-bold rounded-lg cursor-pointer"
                >
                  Speichern
                </button>
              </div>
            </form>
          )}

          <div className="space-y-1.5">
            {sorted.length === 0 && !draft && (
              <p className="text-center text-slate-400 py-8">
                Noch keine Personen angelegt.
              </p>
            )}

            {sorted.map((p) => {
              const pb = personBudget(subsidies, p.id, year, limits);
              const hasBank = !!p.iban;
              return (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border border-slate-200 flex items-start justify-between gap-3 wj-view-enter"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{p.name}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {PERSON_TYPE_LABEL[p.type]}
                      </span>
                      {!hasBank && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          keine IBAN
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500 space-y-0.5">
                      {hasBank && (
                        <div className="font-mono text-slate-600">{formatIban(p.iban!)}</div>
                      )}
                      <div>
                        {year}: {formatCurrency(pb.used)} von{' '}
                        {formatCurrency(limits.perPersonPerYear)} verbraucht
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(p);
                        setIbanError(null);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#003594] hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const own = subsidies.filter((s) => s.personId === p.id);
                        if (own.length > 0) {
                          alert(
                            `${p.name} hat ${own.length} erfasste Zuschüsse. Bitte diese zuerst entfernen.`
                          );
                          return;
                        }
                        if (confirm(`${p.name} entfernen?`)) onDelete(p.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Entfernen"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 inline mr-1" strokeWidth={2} />
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
