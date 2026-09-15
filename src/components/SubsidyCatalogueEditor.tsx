import React, { useEffect, useMemo, useState } from 'react';
import { Subsidy, SubsidyCategory } from '../types';
import {
  SubsidyCatalogueEntry,
  SubsidyCatalogueSettings,
  SubsidyCategoryDef,
  SubsidyLimits,
  DEFAULT_SUBSIDY_CATALOGUE_SETTINGS,
  categoryLabel,
  normalizeSubsidyLimits,
  subsidyCategoriesOf,
} from '../data/subsidyCatalogue';
import { formatCurrency } from '../utils/formatters';
import { Plus, Trash2, Pencil, RotateCcw, CornerDownRight, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * Einstellungen → Zuschüsse: Kategorien mit Jahresgrenzen (frei anlegbar,
 * umbenennbar, sortierbar, entfernbar - v3.30.0), Gesamtbudget, Grenze je
 * Person und der Veranstaltungskatalog (settings/subsidyCatalogue).
 * Zusaetzlich "Aus bisherigen Antraegen": Veranstaltungen, die in
 * Zuschuessen vorkommen, aber nicht im Katalog stehen.
 *
 * Wird erst beim Oeffnen des Reiters eingebaut, der Entwurf der Grenzen
 * startet deshalb mit dem aktuellen Stand und folgt Aenderungen anderer
 * Geraete, solange hier nichts ungespeichert geaendert ist.
 */

interface Props {
  settings: SubsidyCatalogueSettings;
  subsidies: Subsidy[];
  onSave: (settings: SubsidyCatalogueSettings) => void;
  onResetToDefault: () => void;
}

interface LimitsDraft {
  totalPerYear: number;
  perPersonPerYear: number;
  categories: SubsidyCategoryDef[];
}

/** Noch nicht gespeicherte Kategorien bekommen ihren Schluessel erst beim Speichern. */
const NEW_PREFIX = '__neu_';

const fieldClass =
  'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]';

const iconButton =
  'p-1.5 rounded-lg text-slate-400 hover:text-[#003594] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-slate-400';

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

function slugifyKey(label: string, existing: string[], fallback: string): string {
  const base =
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || fallback;
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

const draftOf = (limits: SubsidyLimits): LimitsDraft => ({
  totalPerYear: limits.totalPerYear,
  perPersonPerYear: limits.perPersonPerYear,
  categories: subsidyCategoriesOf(limits).map((c) => ({ ...c })),
});

export const SubsidyCatalogueEditor: React.FC<Props> = ({ settings, subsidies, onSave, onResetToDefault }) => {
  const savedCategories = useMemo(() => subsidyCategoriesOf(settings.limits), [settings.limits]);
  const defaultCategoryKey =
    savedCategories.find((c) => c.key === 'sonstiges')?.key || savedCategories[savedCategories.length - 1]?.key || '';

  const [entryDraft, setEntryDraft] = useState<SubsidyCatalogueEntry | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [limitsDraft, setLimitsDraft] = useState<LimitsDraft>(() => draftOf(settings.limits));
  const [limitsDirty, setLimitsDirty] = useState(false);
  const [limitsSaved, setLimitsSaved] = useState(false);
  const [limitsError, setLimitsError] = useState('');

  useEffect(() => {
    if (!limitsDirty) setLimitsDraft(draftOf(settings.limits));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.limits]);

  /** Wie oft eine Kategorie im Katalog und in Zuschuessen vorkommt. */
  const usage = useMemo(() => {
    const count = (list: { category: string }[], key: string) => list.filter((x) => x.category === key).length;
    const zuschuesse = subsidies.filter((s) => (s.kind || 'zuschuss') === 'zuschuss');
    return (key: string) => ({ entries: count(settings.entries, key), subsidies: count(zuschuesse, key) });
  }, [settings.entries, subsidies]);

  /**
   * Veranstaltungen aus Zuschuss-Antraegen, die nicht im Katalog stehen.
   * Als bekannt gilt: gleiche Bezeichnung oder ein Katalogschluessel ausser
   * "Sonstiges" (dort steht der eigentliche Name frei im Antrag).
   */
  const unlisted = useMemo(() => {
    const labels = new Set(settings.entries.map((e) => normalize(e.label)));
    const keys = new Set(settings.entries.filter((e) => e.key !== 'sonstiges').map((e) => e.key));
    const byName = new Map<
      string,
      { name: string; category: SubsidyCategory; amount: number; count: number; lastDate: string }
    >();
    for (const s of subsidies) {
      if ((s.kind || 'zuschuss') !== 'zuschuss') continue;
      const name = (s.eventName || '').trim();
      if (!name) continue;
      if ((s.eventKey && keys.has(s.eventKey)) || labels.has(normalize(name))) continue;
      const key = normalize(name);
      const date = s.appliedAt || '';
      const prev = byName.get(key);
      if (!prev) {
        byName.set(key, { name, category: s.category, amount: s.amount || 0, count: 1, lastDate: date });
      } else {
        prev.count += 1;
        if (date > prev.lastDate) {
          Object.assign(prev, { name, category: s.category, amount: s.amount || 0, lastDate: date });
        }
      }
    }
    return [...byName.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'de'));
  }, [subsidies, settings.entries]);

  // --- Kategorien & Grenzen -------------------------------------------------

  const updateDraft = (next: LimitsDraft) => {
    setLimitsDraft(next);
    setLimitsDirty(true);
    setLimitsSaved(false);
    setLimitsError('');
  };

  const updateCategory = (index: number, patch: Partial<SubsidyCategoryDef>) =>
    updateDraft({
      ...limitsDraft,
      categories: limitsDraft.categories.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });

  const moveCategory = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= limitsDraft.categories.length) return;
    const categories = [...limitsDraft.categories];
    [categories[index], categories[target]] = [categories[target], categories[index]];
    updateDraft({ ...limitsDraft, categories });
  };

  const addCategory = () =>
    updateDraft({
      ...limitsDraft,
      categories: [...limitsDraft.categories, { key: `${NEW_PREFIX}${Date.now()}`, label: '', limit: null }],
    });

  const removeCategory = (index: number) => {
    const cat = limitsDraft.categories[index];
    if (!cat.key.startsWith(NEW_PREFIX)) {
      const used = usage(cat.key);
      if (used.entries > 0) {
        alert(
          `„${cat.label}" wird von ${used.entries} ${used.entries === 1 ? 'Veranstaltung' : 'Veranstaltungen'} im Katalog verwendet. Bitte diese zuerst einer anderen Kategorie zuordnen oder entfernen.`
        );
        return;
      }
      if (
        used.subsidies > 0 &&
        !confirm(
          `${used.subsidies} ${used.subsidies === 1 ? 'Zuschuss ist' : 'Zuschüsse sind'} „${cat.label}" zugeordnet. Sie behalten die Kategorie, zählen dann aber gegen keine Kategoriegrenze mehr. Trotzdem entfernen?`
        )
      ) {
        return;
      }
    }
    updateDraft({ ...limitsDraft, categories: limitsDraft.categories.filter((_, i) => i !== index) });
  };

  const saveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    const labels = limitsDraft.categories.map((c) => c.label.trim());
    if (labels.some((l) => !l)) {
      setLimitsError('Bitte jeder Kategorie einen Namen geben.');
      return;
    }
    if (new Set(labels.map(normalize)).size !== labels.length) {
      setLimitsError('Zwei Kategorien haben denselben Namen.');
      return;
    }

    const taken = limitsDraft.categories.filter((c) => !c.key.startsWith(NEW_PREFIX)).map((c) => c.key);
    const categories: SubsidyCategoryDef[] = limitsDraft.categories.map((c) => {
      let key = c.key;
      if (key.startsWith(NEW_PREFIX)) {
        key = slugifyKey(c.label, taken, 'kategorie');
        taken.push(key);
      }
      return {
        key,
        label: c.label.trim(),
        limit: c.limit === null ? null : Math.max(0, Number(c.limit) || 0),
        ...(c.oncePerMembership ? { oncePerMembership: true } : {}),
      };
    });

    onSave({
      ...settings,
      limits: normalizeSubsidyLimits({
        totalPerYear: Math.max(0, Number(limitsDraft.totalPerYear) || 0),
        perPersonPerYear: Math.max(0, Number(limitsDraft.perPersonPerYear) || 0),
        categories,
      }),
    });
    setLimitsDraft({ ...limitsDraft, categories });
    setLimitsDirty(false);
    setLimitsSaved(true);
    window.setTimeout(() => setLimitsSaved(false), 2500);
  };

  // --- Veranstaltungen ------------------------------------------------------

  const startNewEntry = (prefill?: Partial<SubsidyCatalogueEntry>) => {
    setEditingKey(null);
    setEntryDraft({ key: '', label: '', category: defaultCategoryKey, amount: 0, ...prefill });
  };

  const startEditEntry = (entry: SubsidyCatalogueEntry) => {
    setEditingKey(entry.key);
    setEntryDraft({ ...entry });
  };

  const cancelEntry = () => {
    setEntryDraft(null);
    setEditingKey(null);
  };

  const submitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDraft || !entryDraft.label.trim()) return;

    const key =
      editingKey ||
      slugifyKey(
        entryDraft.label,
        settings.entries.map((en) => en.key),
        'veranstaltung'
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
    cancelEntry();
  };

  const deleteEntry = (key: string) => {
    if (!confirm('Diese Veranstaltung aus dem Katalog entfernen? Bereits gestellte Anträge sind davon nicht betroffen.')) {
      return;
    }
    onSave({ ...settings, entries: settings.entries.filter((en) => en.key !== key) });
  };

  const resetToDefault = () => {
    if (
      !confirm(
        'Kategorien, Grenzen und Veranstaltungen auf den Richtlinien-Standard zurücksetzen? Eigene Änderungen gehen dabei verloren.'
      )
    )
      return;
    onResetToDefault();
    setLimitsDraft(draftOf(DEFAULT_SUBSIDY_CATALOGUE_SETTINGS.limits));
    setLimitsDirty(false);
    setLimitsError('');
    cancelEntry();
  };

  const renderEntryForm = () =>
    entryDraft && (
      <form
        onSubmit={submitEntry}
        className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2.5 animate-in fade-in"
      >
        <div className="font-bold text-slate-900">
          {editingKey ? 'Veranstaltung bearbeiten' : 'Neue Veranstaltung'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Bezeichnung *</label>
            <input
              required
              value={entryDraft.label}
              onChange={(e) => setEntryDraft({ ...entryDraft, label: e.target.value })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Kategorie *</label>
            <select
              value={entryDraft.category}
              onChange={(e) => setEntryDraft({ ...entryDraft, category: e.target.value })}
              className={`${fieldClass} cursor-pointer`}
            >
              {savedCategories.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
              {!savedCategories.some((c) => c.key === entryDraft.category) && (
                <option value={entryDraft.category}>{categoryLabel(settings.limits, entryDraft.category)}</option>
              )}
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
            onChange={(e) => setEntryDraft({ ...entryDraft, amount: Number(e.target.value) || 0 })}
            className={fieldClass}
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
              onChange={(e) => setEntryDraft({ ...entryDraft, needsResolution: e.target.checked })}
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
            className={fieldClass}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={cancelEntry}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
          >
            Abbrechen
          </button>
          <button type="submit" className="px-4 py-1.5 bg-[#003594] text-white font-bold rounded-lg cursor-pointer">
            Speichern
          </button>
        </div>
      </form>
    );

  const renderEntry = (entry: SubsidyCatalogueEntry) =>
    editingKey === entry.key ? (
      <React.Fragment key={entry.key}>{renderEntryForm()}</React.Fragment>
    ) : (
      <div key={entry.key} className="p-3 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900">{entry.label}</span>
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
            {entry.amount > 0 ? formatCurrency(entry.amount) : entry.fullCost ? 'voller Betrag' : 'individuell'}
            {entry.hint ? ` · ${entry.hint}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => startEditEntry(entry)} className={iconButton} title="Bearbeiten">
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
    );

  const orphanEntries = settings.entries.filter((en) => !savedCategories.some((c) => c.key === en.category));

  return (
    <div className="space-y-5 text-xs">
      <p className="text-slate-500 leading-relaxed">
        Kategorien, Grenzen und Veranstaltungen gelten für neue Anträge. Bereits gestellte Anträge behalten ihre
        Beträge.
      </p>

      {/* Grenzen und Kategorien */}
      <form onSubmit={saveLimits} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <div className="font-bold text-slate-900 text-sm">Grenzen je Kalenderjahr</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Gesamtbudget (€)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={limitsDraft.totalPerYear}
              onChange={(e) => updateDraft({ ...limitsDraft, totalPerYear: Number(e.target.value) || 0 })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Je Person (€)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={limitsDraft.perPersonPerYear}
              onChange={(e) => updateDraft({ ...limitsDraft, perPersonPerYear: Number(e.target.value) || 0 })}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="pt-1 flex items-baseline justify-between gap-2">
          <div className="font-bold text-slate-900">Kategorien</div>
          <div className="text-[11px] text-slate-400">Grenze gilt je Person und Jahr</div>
        </div>

        <div className="space-y-2">
          {limitsDraft.categories.map((cat, index) => {
            const isNew = cat.key.startsWith(NEW_PREFIX);
            const used = isNew ? null : usage(cat.key);
            const unlimited = cat.limit === null;
            return (
              <div key={cat.key} className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-1">
                  <input
                    value={cat.label}
                    onChange={(e) => updateCategory(index, { label: e.target.value })}
                    placeholder="Name der Kategorie *"
                    autoFocus={isNew && !cat.label}
                    className={`${fieldClass} flex-1 min-w-0 font-semibold`}
                  />
                  <button
                    type="button"
                    onClick={() => moveCategory(index, -1)}
                    disabled={index === 0}
                    className={iconButton}
                    title="Nach oben"
                  >
                    <ArrowUp className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCategory(index, 1)}
                    disabled={index === limitsDraft.categories.length - 1}
                    className={iconButton}
                    title="Nach unten"
                  >
                    <ArrowDown className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCategory(index)}
                    disabled={limitsDraft.categories.length <= 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
                    title="Kategorie entfernen"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Grenze (€)</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={unlimited}
                      value={unlimited ? '' : cat.limit ?? ''}
                      placeholder={unlimited ? 'kein Limit' : ''}
                      onChange={(e) => updateCategory(index, { limit: Number(e.target.value) || 0 })}
                      className={`${fieldClass} w-24 disabled:opacity-50`}
                    />
                    <label className="flex items-center gap-1 text-[11px] text-slate-500">
                      <input
                        type="checkbox"
                        checked={unlimited}
                        onChange={(e) => updateCategory(index, { limit: e.target.checked ? null : 0 })}
                        className="rounded text-[#003594]"
                      />
                      kein Limit
                    </label>
                  </div>
                  <label className="flex items-center gap-1 text-[11px] text-slate-500">
                    <input
                      type="checkbox"
                      checked={!!cat.oncePerMembership}
                      onChange={(e) => updateCategory(index, { oncePerMembership: e.target.checked })}
                      className="rounded text-[#003594]"
                    />
                    Veranstaltung nur einmal je Person
                  </label>
                </div>

                <div className="text-[11px] text-slate-400">
                  {isNew
                    ? 'Neu – steht nach dem Speichern bei den Veranstaltungen zur Auswahl'
                    : `${used!.entries} ${used!.entries === 1 ? 'Veranstaltung' : 'Veranstaltungen'} · ${used!.subsidies} ${
                        used!.subsidies === 1 ? 'Zuschuss' : 'Zuschüsse'
                      }`}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addCategory}
          className="w-full p-2.5 rounded-lg border border-dashed border-slate-300 text-slate-600 hover:bg-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Kategorie hinzufügen
        </button>

        {limitsError && <div className="text-[11px] font-semibold text-rose-700">{limitsError}</div>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!limitsDirty}
            className="px-4 py-1.5 bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 text-white font-bold rounded-lg cursor-pointer"
          >
            Grenzen & Kategorien speichern
          </button>
          {limitsSaved && <span className="text-[11px] font-semibold text-emerald-700">Gespeichert</span>}
          {limitsDirty && !limitsSaved && <span className="text-[11px] text-amber-700">Nicht gespeichert</span>}
        </div>
      </form>

      {/* Veranstaltungen */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-bold text-slate-900 text-sm">
            Veranstaltungen <span className="font-semibold text-slate-400">({settings.entries.length})</span>
          </div>
          {!(entryDraft && !editingKey) && (
            <button
              type="button"
              onClick={() => startNewEntry()}
              className="px-3 py-1.5 rounded-lg bg-[#003594] hover:bg-[#00266B] text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              Eigene erfassen
            </button>
          )}
        </div>

        {!editingKey && renderEntryForm()}

        {savedCategories.map((cat) => {
          const entries = settings.entries.filter((en) => en.category === cat.key);
          if (entries.length === 0) return null;
          return (
            <div key={cat.key} className="space-y-1.5">
              <div className="pt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{cat.label}</div>
              {entries.map(renderEntry)}
            </div>
          );
        })}

        {orphanEntries.length > 0 && (
          <div className="space-y-1.5">
            <div className="pt-1 text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Ohne gültige Kategorie – bitte zuordnen
            </div>
            {orphanEntries.map(renderEntry)}
          </div>
        )}
      </div>

      {/* Aus bisherigen Antraegen */}
      {unlisted.length > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2">
          <div className="font-bold text-slate-900 text-sm">Aus bisherigen Anträgen</div>
          <p className="text-slate-500">
            Diese Veranstaltungen kommen in Zuschüssen vor, stehen aber nicht im Katalog. Ein Tipp auf „Übernehmen"
            legt sie vorbelegt an – vor dem Speichern lässt sich alles anpassen.
          </p>
          {unlisted.map((u) => (
            <div key={u.name} className="flex items-center gap-2 p-2.5 rounded-lg bg-white border border-amber-100">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 truncate">{u.name}</div>
                <div className="text-[11px] text-slate-500">
                  {categoryLabel(settings.limits, u.category)} · zuletzt {formatCurrency(u.amount)} · {u.count}{' '}
                  {u.count === 1 ? 'Antrag' : 'Anträge'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => startNewEntry({ label: u.name, category: u.category, amount: u.amount })}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[#003594] font-bold text-[11px] flex items-center gap-1 hover:bg-slate-50 cursor-pointer shrink-0"
              >
                <CornerDownRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                Übernehmen
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={resetToDefault}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
        Auf Richtlinien-Standard zurücksetzen
      </button>
    </div>
  );
};
