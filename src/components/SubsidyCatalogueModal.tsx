import React, { useEffect, useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { SubsidyCategory } from '../types';
import {
  SubsidyCatalogueEntry,
  SubsidyCatalogueSettings,
  SubsidyLimits,
  CATEGORY_LABEL,
  DEFAULT_SUBSIDY_CATALOGUE_SETTINGS,
} from '../data/subsidyCatalogue';
import { X, Plus, Trash2, Pencil, RotateCcw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: SubsidyCatalogueSettings;
  onSave: (settings: SubsidyCatalogueSettings) => void;
  onResetToDefault: () => void;
}

const CATEGORIES: SubsidyCategory[] = ['academy', 'training', 'konferenz', 'sonstiges'];

function slugifyEventKey(label: string, existing: string[]): string {
  const base =
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'veranstaltung';
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

const emptyEntryDraft = (): SubsidyCatalogueEntry => ({
  key: '',
  label: '',
  category: 'sonstiges',
  amount: 0,
});

export const SubsidyCatalogueModal: React.FC<Props> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onResetToDefault,
}) => {
  const [entryDraft, setEntryDraft] = useState<SubsidyCatalogueEntry | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [limitsDraft, setLimitsDraft] = useState<SubsidyLimits>(settings.limits);
  const [limitsDirty, setLimitsDirty] = useState(false);

  // Diese Modal-Komponente bleibt wie SubsidyPeopleModal permanent gemountet
  // (nur `isOpen` togglet den Inhalt) - der Entwurf muss deshalb beim
  // Oeffnen aktiv aus den aktuellen Settings aufgefrischt werden, statt sich
  // auf einen einmaligen useState-Initializer zu verlassen (der wuerde sonst
  // dauerhaft den Stand vom allerersten Render einfrieren, siehe die
  // EmailVoteModal-Lektion in CLAUDE.md).
  useEffect(() => {
    if (isOpen) {
      setLimitsDraft(settings.limits);
      setLimitsDirty(false);
      setEntryDraft(null);
      setEditingKey(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const startNewEntry = () => {
    setEditingKey(null);
    setEntryDraft(emptyEntryDraft());
  };

  const startEditEntry = (entry: SubsidyCatalogueEntry) => {
    setEditingKey(entry.key);
    setEntryDraft({ ...entry });
  };

  const submitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDraft || !entryDraft.label.trim()) return;

    const key =
      editingKey ||
      slugifyEventKey(
        entryDraft.label,
        settings.entries.map((en) => en.key)
      );
    const cleaned: SubsidyCatalogueEntry = {
      ...entryDraft,
      key,
      label: entryDraft.label.trim(),
      amount: Number(entryDraft.amount) || 0,
      hint: entryDraft.hint?.trim() || undefined,
    };

    const entries = editingKey
      ? settings.entries.map((en) => (en.key === editingKey ? cleaned : en))
      : [...settings.entries, cleaned];

    onSave({ ...settings, entries });
    setEntryDraft(null);
    setEditingKey(null);
  };

  const deleteEntry = (key: string) => {
    if (!confirm('Diese Veranstaltung aus dem Katalog entfernen? Bereits gestellte Anträge sind davon nicht betroffen.')) {
      return;
    }
    onSave({ ...settings, entries: settings.entries.filter((en) => en.key !== key) });
  };

  const saveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...settings, limits: limitsDraft });
    setLimitsDirty(false);
  };

  const resetToDefault = () => {
    if (
      !confirm(
        'Katalog und Obergrenzen auf den Richtlinien-Standard zurücksetzen? Eigene Änderungen gehen dabei verloren.'
      )
    )
      return;
    onResetToDefault();
    setLimitsDraft(DEFAULT_SUBSIDY_CATALOGUE_SETTINGS.limits);
    setLimitsDirty(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              Zuschüsse
            </div>
            <h3 className="text-base font-bold">Katalog & Obergrenzen</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
          {/* Jahres-Obergrenzen */}
          <form onSubmit={saveLimits} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-900 text-sm">Jahres-Obergrenzen</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Gesamtbudget/Jahr (€)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={limitsDraft.totalPerYear}
                  onChange={(e) => {
                    setLimitsDraft({ ...limitsDraft, totalPerYear: Number(e.target.value) || 0 });
                    setLimitsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Grenze pro Person (€)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={limitsDraft.perPersonPerYear}
                  onChange={(e) => {
                    setLimitsDraft({ ...limitsDraft, perPersonPerYear: Number(e.target.value) || 0 });
                    setLimitsDirty(true);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>
            </div>

            <div className="font-semibold text-slate-600">Grenze je Kategorie (€)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => {
                const value = limitsDraft.perCategoryPerYear[cat];
                const unlimited = value === null;
                return (
                  <div key={cat} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-slate-500">{CATEGORY_LABEL[cat]}</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={unlimited}
                      value={unlimited ? '' : value}
                      placeholder={unlimited ? 'kein Limit' : ''}
                      onChange={(e) => {
                        setLimitsDraft({
                          ...limitsDraft,
                          perCategoryPerYear: {
                            ...limitsDraft.perCategoryPerYear,
                            [cat]: Number(e.target.value) || 0,
                          },
                        });
                        setLimitsDirty(true);
                      }}
                      className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594] disabled:opacity-50"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                      <input
                        type="checkbox"
                        checked={unlimited}
                        onChange={(e) => {
                          setLimitsDraft({
                            ...limitsDraft,
                            perCategoryPerYear: {
                              ...limitsDraft.perCategoryPerYear,
                              [cat]: e.target.checked ? null : 0,
                            },
                          });
                          setLimitsDirty(true);
                        }}
                        className="rounded text-[#003594]"
                      />
                      kein Limit
                    </label>
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={!limitsDirty}
              className="px-4 py-1.5 bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 text-white font-bold rounded-lg cursor-pointer"
            >
              Obergrenzen speichern
            </button>
          </form>

          {/* Veranstaltungen */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-slate-900 text-sm">Veranstaltungen</div>
              {!entryDraft && (
                <button
                  type="button"
                  onClick={startNewEntry}
                  className="px-3 py-1.5 rounded-lg bg-[#003594] hover:bg-[#00266B] text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  Neu anlegen
                </button>
              )}
            </div>

            {entryDraft && (
              <form
                onSubmit={submitEntry}
                className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2.5 mb-2.5 animate-in fade-in"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Bezeichnung *</label>
                    <input
                      required
                      value={entryDraft.label}
                      onChange={(e) => setEntryDraft({ ...entryDraft, label: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Kategorie *</label>
                    <select
                      value={entryDraft.category}
                      onChange={(e) =>
                        setEntryDraft({ ...entryDraft, category: e.target.value as SubsidyCategory })
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003594]"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABEL[cat]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Betrag (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={entryDraft.amount}
                    onChange={(e) =>
                      setEntryDraft({ ...entryDraft, amount: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={!!entryDraft.fullCost}
                      onChange={(e) => setEntryDraft({ ...entryDraft, fullCost: e.target.checked })}
                      className="rounded text-[#003594]"
                    />
                    Kosten werden vollständig übernommen
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={!!entryDraft.needsResolution}
                      onChange={(e) =>
                        setEntryDraft({ ...entryDraft, needsResolution: e.target.checked })
                      }
                      className="rounded text-[#003594]"
                    />
                    Nur mit Vorstandsbeschluss
                  </label>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Hinweistext <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    value={entryDraft.hint || ''}
                    onChange={(e) => setEntryDraft({ ...entryDraft, hint: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEntryDraft(null);
                      setEditingKey(null);
                    }}
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
              {settings.entries.map((entry) => (
                <div
                  key={entry.key}
                  className="p-3 rounded-xl border border-slate-200 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{entry.label}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {CATEGORY_LABEL[entry.category]}
                      </span>
                      {entry.fullCost && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          vollständig übernommen
                        </span>
                      )}
                      {entry.needsResolution && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Vorstandsbeschluss nötig
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {entry.amount > 0 ? `${entry.amount} €` : entry.fullCost ? 'voller Betrag' : 'individuell'}
                      {entry.hint ? ` · ${entry.hint}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditEntry(entry)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#003594] hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Bearbeiten"
                    >
                      <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEntry(entry.key)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Entfernen"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={resetToDefault}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
            Auf Richtlinien-Standard zurücksetzen
          </button>
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
};
