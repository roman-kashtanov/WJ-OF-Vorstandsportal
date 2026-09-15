import React, { useEffect, useMemo, useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { SubsidyPerson, SubsidyPersonType, Subsidy } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  PERSON_TYPE_LABEL,
  STATUS_LABEL,
  personBudget,
  normalizeNameKey,
  joinPersonName,
  splitPersonName,
  subsidyKind,
} from '../utils/subsidies';
import { SubsidyLimits, categoryLabel } from '../data/subsidyCatalogue';
import { isValidIban, formatIban } from '../utils/sepa';
import { X, UserPlus, Trash2, Pencil, Check, Users2, ChevronDown, Search } from 'lucide-react';
import { Collapse } from './Collapse';

/**
 * Personenuebersicht fuer Zuschuesse und Auslagen: je Person der Verbrauch
 * gegen die Jahresgrenze der Zuschuss-Richtlinie (samt Kategorien und
 * Vorgaengen), Bankverbindung, und das manuelle Zuordnen, wenn ein anderer
 * Eintrag dieselbe Person ist (z. B. andere E-Mail-Adresse oder anders
 * geschriebener Name).
 */

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
  /** Aus der Budget-Leiste geoeffnet: diese Person gleich aufklappen. */
  focusPersonId?: string | null;
}

type Draft = SubsidyPerson & { firstName: string; lastName: string };


const emptyDraft = (): Draft => ({
  id: '',
  name: '',
  firstName: '',
  lastName: '',
  type: 'mitglied',
  email: '',
  iban: '',
  bic: '',
  accountHolder: '',
  isActive: true,
  note: '',
  createdAt: '',
});

/** Vor- und Nachname - aeltere Eintraege haben nur `name`. */
const nameParts = (p: SubsidyPerson) => {
  const split = splitPersonName(p.name);
  return {
    firstName: p.firstName ?? split.firstName,
    lastName: p.lastName ?? split.lastName,
  };
};

const barTone = (ratio: number) =>
  ratio > 1 ? 'bg-rose-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500';

const inputClass =
  'w-full min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]';

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
  focusPersonId,
}) => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ibanError, setIbanError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mergeChoice, setMergeChoice] = useState('');
  const [search, setSearch] = useState('');

  /**
   * Aus der Budget-Leiste geoeffnet: die angetippte Person aufklappen und im
   * Fenster in den sichtbaren Bereich holen. Bewusst per scrollTop am
   * Fenster-Inhalt statt scrollIntoView - Letzteres wuerde auch die gesperrte
   * Seite dahinter verschieben.
   */
  useEffect(() => {
    if (!isOpen || !focusPersonId) return;
    setSearch('');
    setDraft(null);
    setExpandedId(focusPersonId);
    const timer = window.setTimeout(() => {
      const row = document.querySelector<HTMLElement>(
        `[data-person-row="${CSS.escape(focusPersonId)}"]`
      );
      const scroller = row?.closest<HTMLElement>('.overflow-y-auto');
      if (!row || !scroller) return;
      const offset = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12;
      scroller.scrollTo({ top: scroller.scrollTop + offset, behavior: 'smooth' });
    }, 320);
    return () => clearTimeout(timer);
  }, [isOpen, focusPersonId]);

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

  /** Sortiert nach Nachname, mit Verbrauch und Vorgaengen des Jahres. */
  const rows = useMemo(
    () =>
      people
        .map((p) => ({
          person: p,
          ...nameParts(p),
          budget: personBudget(subsidies, p.id, year, limits),
          own: subsidies
            .filter((s) => s.personId === p.id && s.year === year)
            .sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || '')),
        }))
        .sort(
          (a, b) =>
            a.lastName.localeCompare(b.lastName, 'de') ||
            a.firstName.localeCompare(b.firstName, 'de')
        ),
    [people, subsidies, year, limits]
  );

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const limit = limits.perPersonPerYear;
  const overLimit = rows.filter((r) => r.budget.used > limit).length;
  const nearLimit = rows.filter(
    (r) => r.budget.used > 0 && r.budget.used <= limit && r.budget.used >= limit * 0.8
  ).length;

  const q = search.trim().toLowerCase();
  const visibleRows = q
    ? rows.filter(
        (r) =>
          r.person.name.toLowerCase().includes(q) ||
          (r.person.email || '').toLowerCase().includes(q)
      )
    : rows;

  const startNew = () => {
    setDraft(emptyDraft());
    setIbanError(null);
    setExpandedId(null);
  };

  const startEdit = (p: SubsidyPerson) => {
    setDraft({
      ...p,
      ...nameParts(p),
      email: p.email || '',
      iban: p.iban || '',
      bic: p.bic || '',
      accountHolder: p.accountHolder || '',
    });
    setIbanError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const firstName = draft.firstName.trim();
    const lastName = draft.lastName.trim();
    if (!firstName || !lastName) return;

    const iban = (draft.iban || '').replace(/\s+/g, '').toUpperCase();
    if (iban && !isValidIban(iban)) {
      setIbanError('Diese IBAN ist nicht gültig (Prüfziffer stimmt nicht).');
      return;
    }

    onSave({
      ...draft,
      id: draft.id || `sp_${Date.now()}`,
      name: joinPersonName(firstName, lastName),
      firstName,
      lastName,
      iban,
      bic: (draft.bic || '').replace(/\s+/g, '').toUpperCase(),
      createdAt: draft.createdAt || new Date().toISOString(),
    });
    setDraft(null);
  };

  const renderForm = () =>
    draft && (
      <form
        onSubmit={submit}
        className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3 animate-in fade-in"
      >
        <div className="grid grid-cols-2 gap-2.5">
          <div className="min-w-0">
            <label className="block font-bold text-slate-700 mb-1">Vorname *</label>
            <input
              required
              value={draft.firstName}
              onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="min-w-0">
            <label className="block font-bold text-slate-700 mb-1">Nachname *</label>
            <input
              required
              value={draft.lastName}
              onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Status *</label>
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as SubsidyPersonType })}
              className={inputClass}
            >
              {(Object.keys(PERSON_TYPE_LABEL) as SubsidyPersonType[]).map((t) => (
                <option key={t} value={t}>
                  {PERSON_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">E-Mail</label>
            <input
              type="email"
              value={draft.email || ''}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="pt-1 border-t border-blue-200/60">
          <div className="font-bold text-slate-700 mb-2 mt-2">Bankverbindung für die Auszahlung</div>
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
                className={`${inputClass} font-mono ${
                  ibanError ? 'border-rose-300 focus:ring-rose-400' : ''
                }`}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                BIC <span className="font-normal text-slate-400">(nur falls bekannt)</span>
              </label>
              <input
                value={draft.bic || ''}
                onChange={(e) => setDraft({ ...draft, bic: e.target.value })}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          {ibanError && <p className="mt-1.5 text-[11px] font-semibold text-rose-700">{ibanError}</p>}

          <div className="mt-2.5">
            <label className="block font-semibold text-slate-600 mb-1">
              Kontoinhaber{' '}
              <span className="font-normal text-slate-400">(nur wenn abweichend vom Namen)</span>
            </label>
            <input
              value={draft.accountHolder || ''}
              onChange={(e) => setDraft({ ...draft, accountHolder: e.target.value })}
              className={inputClass}
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
    );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center wj-overlay animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col wj-overlay-panel animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              Zuschüsse & Auslagen
            </div>
            <h3 className="text-base font-bold">Personenübersicht</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Jahresgrenze je Person */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-slate-900">Jahresgrenze je Person {year}</span>
              <span className="font-bold text-[#003594]">{formatCurrency(limit)}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Gezählt werden alle nicht abgelehnten Zuschüsse des Jahres, Auslagen nicht.
              Öffentliche Anträge werden über Vor- und Nachname der Person zugeordnet.
            </p>
            {(overLimit > 0 || nearLimit > 0) && (
              <div className="flex flex-wrap gap-x-3 text-[11px] font-semibold pt-0.5">
                {overLimit > 0 && (
                  <span className="text-rose-700">
                    {overLimit} {overLimit === 1 ? 'Person' : 'Personen'} über der Grenze
                  </span>
                )}
                {nearLimit > 0 && (
                  <span className="text-amber-700">
                    {nearLimit} {nearLimit === 1 ? 'Person' : 'Personen'} ab 80 %
                  </span>
                )}
              </div>
            )}
          </div>

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
                        Gleicher Vor- und Nachname – vermutlich dieselbe Person
                      </p>
                      <p className="text-amber-800 mt-0.5">
                        {group.map((p) => (p.email ? `${p.name} (${p.email})` : p.name)).join(' · ')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !confirm(
                              `Diese Einträge zu "${keep.name}" zusammenführen? Alle Zuschüsse und Auslagen werden übernommen, fehlende Kontaktdaten ergänzt.`
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

          {draft && !draft.id && renderForm()}

          {people.length > 5 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name oder E-Mail suchen…"
                className={`${inputClass} pl-8 bg-slate-50`}
              />
            </div>
          )}

          <div className="space-y-1.5">
            {rows.length === 0 && !draft && (
              <p className="text-center text-slate-400 py-8">Noch keine Personen angelegt.</p>
            )}

            {visibleRows.map(({ person: p, budget, own }) => {
              if (draft?.id === p.id) return <div key={p.id}>{renderForm()}</div>;

              const ratio = limit > 0 ? budget.used / limit : 0;
              const isExpanded = expandedId === p.id;
              const categories = Object.keys(budget.perCategory).filter((c) => budget.perCategory[c].used > 0);
              const mergeCandidates = rows.filter((r) => r.person.id !== p.id);

              return (
                <div
                  key={p.id}
                  data-person-row={p.id}
                  className={`rounded-xl border bg-white ${ratio > 1 ? 'border-rose-200' : 'border-slate-200'}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : p.id);
                      setMergeChoice('');
                    }}
                    className="w-full p-3 text-left cursor-pointer hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {PERSON_TYPE_LABEL[p.type]}
                        </span>
                        {!p.iban && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            keine IBAN
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold shrink-0 whitespace-nowrap ${
                          ratio > 1 ? 'text-rose-700' : 'text-slate-800'
                        }`}
                      >
                        {formatCurrency(budget.used)}
                        <span className="font-normal text-slate-400"> / {formatCurrency(limit)}</span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        strokeWidth={1.75}
                      />
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${barTone(ratio)}`}
                        style={{ width: `${Math.min(100, ratio * 100)}%` }}
                      />
                    </div>
                    {ratio > 1 && (
                      <p className="mt-1 text-[11px] font-semibold text-rose-700">
                        Jahresgrenze um {formatCurrency(budget.used - limit)} überschritten
                      </p>
                    )}
                  </button>

                  <Collapse open={!!(isExpanded)}>{isExpanded && (
                    <div className="px-3 pb-3 space-y-3">
                      {(p.email || p.iban) && (
                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          {p.email && <div>{p.email}</div>}
                          {p.iban && <div className="font-mono text-slate-600">{formatIban(p.iban)}</div>}
                        </div>
                      )}

                      {categories.length > 0 && (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-700">Nach Kategorie</div>
                          {categories.map((c) => {
                            const cat = budget.perCategory[c];
                            const over = cat.limit !== Infinity && cat.used > cat.limit;
                            return (
                              <div key={c} className="flex justify-between gap-2 text-slate-600">
                                <span>{categoryLabel(limits, c)}</span>
                                <span className={over ? 'font-bold text-rose-700' : ''}>
                                  {formatCurrency(cat.used)}
                                  {cat.limit === Infinity ? ' (keine eigene Grenze)' : ` von ${formatCurrency(cat.limit)}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="font-bold text-slate-700">Vorgänge {year}</div>
                        {own.length === 0 ? (
                          <p className="text-slate-400">Keine.</p>
                        ) : (
                          own.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-2 text-slate-600">
                              <span className="truncate">
                                {subsidyKind(s) === 'auslage' ? 'Auslage · ' : ''}
                                {s.eventName}
                              </span>
                              <span className="shrink-0 whitespace-nowrap">
                                {formatCurrency(s.amount)} · {STATUS_LABEL[s.status]}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {mergeCandidates.length > 0 && (
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                          <div className="font-bold text-slate-700">Anderen Eintrag zuordnen</div>
                          <p className="text-[11px] text-slate-500">
                            Ist ein anderer Eintrag dieselbe Person – z. B. mit anderer E-Mail-Adresse
                            oder anders geschriebenem Namen? Seine Vorgänge wandern dann zu {p.name},
                            der doppelte Eintrag wird entfernt.
                          </p>
                          <div className="flex gap-1.5">
                            <select
                              value={mergeChoice}
                              onChange={(e) => setMergeChoice(e.target.value)}
                              className={`${inputClass} flex-1`}
                            >
                              <option value="">Eintrag wählen…</option>
                              {mergeCandidates.map((r) => (
                                <option key={r.person.id} value={r.person.id}>
                                  {r.person.name}
                                  {r.person.email ? ` (${r.person.email})` : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!mergeChoice}
                              onClick={() => {
                                const other = people.find((x) => x.id === mergeChoice);
                                if (!other) return;
                                const count = subsidies.filter((s) => s.personId === other.id).length;
                                if (
                                  !confirm(
                                    `"${other.name}" ist dieselbe Person wie "${p.name}"?\n\n${count} ${
                                      count === 1 ? 'Vorgang wird' : 'Vorgänge werden'
                                    } ${p.name} zugeordnet, der Eintrag "${other.name}" wird entfernt.`
                                  )
                                )
                                  return;
                                onMerge(p.id, other.id);
                                setMergeChoice('');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 text-white font-bold cursor-pointer shrink-0"
                            >
                              Zuordnen
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const ownAll = subsidies.filter((s) => s.personId === p.id);
                            if (ownAll.length > 0) {
                              alert(
                                `${p.name} hat ${ownAll.length} erfasste ${
                                  ownAll.length === 1 ? 'Vorgang' : 'Vorgänge'
                                }. Bitte diese zuerst entfernen oder einer anderen Person zuordnen.`
                              );
                              return;
                            }
                            if (confirm(`${p.name} entfernen?`)) onDelete(p.id);
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                          Entfernen
                        </button>
                      </div>
                    </div>
                  )}</Collapse>
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
