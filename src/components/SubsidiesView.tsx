import React, { useMemo, useState } from 'react';
import { Subsidy, SubsidyPerson, SubsidyStatus, SubsidyPersonType } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  STATUS_LABEL,
  PERSON_TYPE_LABEL,
  PIPELINE_MANAGED_STATUSES,
  budgetOverview,
  isPayable,
} from '../utils/subsidies';
import { CATEGORY_LABEL, SUBSIDY_LIMITS } from '../data/subsidyCatalogue';
import { formatIban } from '../utils/sepa';
import { EmailService } from '../utils/emailService';
import { FilePreviewModal, PreviewableFile } from './FilePreviewModal';
import {
  HandCoins,
  Plus,
  Users,
  Filter,
  ChevronDown,
  Banknote,
  Paperclip,
  Pencil,
  Trash2,
  Download,
  Vote,
  Link as LinkIcon,
  Copy,
  Check,
} from 'lucide-react';

interface Props {
  subsidies: Subsidy[];
  people: SubsidyPerson[];
  year: number;
  onChangeYear: (year: number) => void;
  onOpenNew: () => void;
  onEdit: (subsidy: Subsidy) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: SubsidyStatus) => void;
  onManagePeople: () => void;
  onOpenPayout: () => void;
  onOpenBundle: () => void;
}

const STATUS_STYLE: Record<SubsidyStatus, string> = {
  beantragt: 'bg-slate-100 text-slate-700',
  bestaetigt: 'bg-blue-100 text-[#003594]',
  im_beschluss: 'bg-violet-100 text-violet-800',
  zur_zahlung_freigegeben: 'bg-teal-100 text-teal-800',
  nicht_stattgefunden: 'bg-amber-100 text-amber-800',
  bezahlt: 'bg-emerald-100 text-emerald-800',
  abgelehnt: 'bg-rose-100 text-rose-800',
};

export const SubsidiesView: React.FC<Props> = ({
  subsidies,
  people,
  year,
  onChangeYear,
  onOpenNew,
  onEdit,
  onDelete,
  onUpdateStatus,
  onManagePeople,
  onOpenPayout,
  onOpenBundle,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterType, setFilterType] = useState<'all' | SubsidyPersonType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | SubsidyStatus>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewableFile | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const antragUrl = `${window.location.origin}/antrag`;
  const handleCopyAntragUrl = async () => {
    const ok = await EmailService.copyToClipboard(antragUrl);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  const years = useMemo(() => {
    const set = new Set<number>(subsidies.map((s) => s.year));
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [subsidies]);

  const personById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])),
    [people]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return subsidies
      .filter((s) => s.year === year)
      .filter((s) => filterPerson === 'all' || s.personId === filterPerson)
      .filter(
        (s) => filterType === 'all' || personById[s.personId]?.type === filterType
      )
      .filter((s) => filterStatus === 'all' || s.status === filterStatus)
      .filter(
        (s) =>
          !q ||
          s.personName.toLowerCase().includes(q) ||
          s.eventName.toLowerCase().includes(q) ||
          (s.note || '').toLowerCase().includes(q)
      )
      .sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''));
  }, [subsidies, year, filterPerson, filterType, filterStatus, search, personById]);

  const overview = budgetOverview(subsidies, year);
  const payable = subsidies.filter((s) => s.year === year && isPayable(s));
  const bundlable = subsidies.filter((s) => s.year === year && s.status === 'bestaetigt');
  const filteredSum = filtered.reduce((sum, s) => sum + s.amount, 0);

  const hasActiveFilters =
    filterPerson !== 'all' || filterType !== 'all' || filterStatus !== 'all' || !!search.trim();

  const usedPercent = Math.min(100, (overview.used / overview.total) * 100);
  const paidPercent = Math.min(100, (overview.paid / overview.total) * 100);

  const exportCsv = () => {
    const head = ['Wer', 'Typ', 'Wann', 'Wofür', 'Kategorie', 'Zuschuss', 'Kosten', 'Stand', 'Nachweis'];
    const rows = filtered.map((s) => [
      s.personName,
      PERSON_TYPE_LABEL[personById[s.personId]?.type || 'mitglied'],
      s.eventDate ? formatDate(s.eventDate) : '',
      s.eventName,
      CATEGORY_LABEL[s.category],
      s.amount.toFixed(2),
      s.actualCost?.toFixed(2) || '',
      STATUS_LABEL[s.status],
      s.proofState === 'hochgeladen'
        ? 'hier abgelegt'
        : s.proofState === 'anderweitig'
        ? s.proofNote || 'anderweitig'
        : 'offen',
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${c}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `WJOF_Zuschuesse_${year}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Kopf */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-[#003594]" strokeWidth={1.75} />
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Zuschüsse
          </h2>
          <select
            value={year}
            onChange={(e) => onChangeYear(Number(e.target.value))}
            className="ml-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003594]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onManagePeople}
            className="p-2 sm:px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Personen & Bankverbindungen"
          >
            <Users className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Personen</span>
          </button>
          <button
            type="button"
            onClick={onOpenNew}
            className="px-3 sm:px-4 py-2 rounded-xl bg-[#003594] hover:bg-[#00266B] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Erfassen</span>
          </button>
        </div>
      </div>

      {/* Öffentlicher Antragslink - zum Weitergeben, z. B. als Antwort auf
          eine E-Mail-Anfrage: "Bitte die Daten über diesen Link erfassen." */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#003594] flex items-center justify-center shrink-0">
          <LinkIcon className="w-4 h-4" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-slate-700">Öffentlicher Antragslink</div>
          <div className="text-[11px] text-slate-400 truncate font-mono">{antragUrl}</div>
        </div>
        <button
          type="button"
          onClick={handleCopyAntragUrl}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0"
        >
          {linkCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
              <span>Kopiert</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Kopieren</span>
            </>
          )}
        </button>
      </div>

      {/* Budget */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Budget {year}
          </span>
          <span className="text-xs text-slate-500">
            <strong className="text-slate-900">{formatCurrency(overview.used)}</strong> von{' '}
            {formatCurrency(overview.total)}
          </span>
        </div>

        <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${paidPercent}%` }}
            title={`Bezahlt: ${formatCurrency(overview.paid)}`}
          />
          <div
            className="bg-[#003594] h-full transition-all duration-300"
            style={{ width: `${usedPercent - paidPercent}%` }}
            title={`Zugesagt: ${formatCurrency(overview.committed)}`}
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Bezahlt {formatCurrency(overview.paid)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#003594]" />
            Zugesagt {formatCurrency(overview.committed)}
          </span>
          <span className="ml-auto font-semibold text-slate-700">
            {formatCurrency(overview.remaining)} frei
          </span>
        </div>

        {overview.isExhausted && (
          <div className="mt-2.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
            Das Jahresbudget ist ausgeschöpft. Nach § 8 der Richtlinie ist das den
            Mitgliedern unverzüglich mitzuteilen.
          </div>
        )}
      </div>

      {/* Buendeln zu Beschluss */}
      {bundlable.length > 0 && (
        <button
          type="button"
          onClick={onOpenBundle}
          className="w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between gap-3 hover:border-[#003594]/40 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
              <Vote className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm">
                {bundlable.length} {bundlable.length === 1 ? 'Zuschuss' : 'Zuschüsse'} geprüft
              </div>
              <div className="text-[11px] text-slate-500">
                {formatCurrency(bundlable.reduce((s, x) => s + x.amount, 0))} · zu Beschluss
                bündeln, um Zahlung freizugeben
              </div>
            </div>
          </div>
          <span className="text-[#003594] font-bold text-xs shrink-0">Öffnen →</span>
        </button>
      )}

      {/* Auszahlung */}
      {payable.length > 0 && (
        <button
          type="button"
          onClick={onOpenPayout}
          className="w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between gap-3 hover:border-[#003594]/40 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#003594] flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm">
                {payable.length} {payable.length === 1 ? 'Auszahlung' : 'Auszahlungen'} offen
              </div>
              <div className="text-[11px] text-slate-500">
                {formatCurrency(payable.reduce((s, x) => s + x.amount, 0))} · Überweisungsdatei
                erzeugen
              </div>
            </div>
          </div>
          <span className="text-[#003594] font-bold text-xs shrink-0">Öffnen →</span>
        </button>
      )}

      {/* Filter */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={exportCsv}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">CSV</span>
        </button>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
            hasActiveFilters
              ? 'bg-blue-50 border-blue-200 text-[#003594]'
              : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <Filter className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>Filter{hasActiveFilters ? ' (aktiv)' : ''}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {showFilters && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5 text-xs wj-expand">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, Veranstaltung oder Notiz suchen…"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={filterPerson}
              onChange={(e) => setFilterPerson(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003594]"
            >
              <option value="all">Alle Personen</option>
              {[...people]
                .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003594]"
            >
              <option value="all">Alle Typen</option>
              {(Object.keys(PERSON_TYPE_LABEL) as SubsidyPersonType[]).map((t) => (
                <option key={t} value={t}>
                  {PERSON_TYPE_LABEL[t]}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003594]"
            >
              <option value="all">Alle Stände</option>
              {(Object.keys(STATUS_LABEL) as SubsidyStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setFilterPerson('all');
                setFilterType('all');
                setFilterStatus('all');
                setSearch('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Liste */}
      <div className="flex items-baseline justify-between px-1 text-[11px] text-slate-500">
        <span className="uppercase font-bold tracking-wider text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'Eintrag' : 'Einträge'}
        </span>
        <span className="font-bold text-slate-900 text-sm">{formatCurrency(filteredSum)}</span>
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 && (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
            Keine Zuschüsse für diese Auswahl.
          </div>
        )}

        {filtered.map((s) => {
          const person = personById[s.personId];
          const isExpanded = expandedId === s.id;

          return (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-slate-200 wj-view-enter"
            >
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {s.personName}
                    </span>
                    <span className="font-bold text-[#003594] text-sm shrink-0">
                      {formatCurrency(s.amount)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                    {s.eventName}
                    {s.eventDate ? ` · ${formatDate(s.eventDate)}` : ''}
                  </div>
                </button>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    STATUS_STYLE[s.status]
                  }`}
                >
                  {STATUS_LABEL[s.status]}
                </span>

                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    strokeWidth={1.75}
                  />
                </button>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2.5 text-[11px] wj-expand">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                    <span>{CATEGORY_LABEL[s.category]}</span>
                    {person && (
                      <>
                        <span>·</span>
                        <span>{PERSON_TYPE_LABEL[person.type]}</span>
                      </>
                    )}
                    {s.actualCost !== undefined && (
                      <>
                        <span>·</span>
                        <span>Kosten {formatCurrency(s.actualCost)}</span>
                      </>
                    )}
                  </div>

                  <div className="text-slate-600">
                    Nachweis:{' '}
                    {s.proofState === 'hochgeladen' && s.proofFile ? (
                      <button
                        type="button"
                        onClick={() => {
                          const file = s.proofFile!;
                          const isImage = file.mimeType?.startsWith('image/');
                          if (!file.dataUrl || isImage) {
                            setPreviewFile(file);
                          } else {
                            window.open(file.dataUrl, '_blank');
                          }
                        }}
                        className="text-[#003594] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Paperclip className="w-3 h-3" strokeWidth={1.75} />
                        {s.proofFile.name}
                      </button>
                    ) : s.proofState === 'anderweitig' ? (
                      <span className="text-slate-700">{s.proofNote}</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">offen</span>
                    )}
                  </div>

                  {person &&
                    !person.iban &&
                    (s.status === 'bestaetigt' ||
                      s.status === 'im_beschluss' ||
                      s.status === 'zur_zahlung_freigegeben') && (
                    <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 font-semibold">
                      Für {person.name} ist keine IBAN hinterlegt – die Auszahlung kann nicht
                      erzeugt werden.
                    </div>
                  )}

                  {person?.iban && (
                    <div className="font-mono text-slate-500">{formatIban(person.iban)}</div>
                  )}

                  {s.note && <div className="text-slate-600">{s.note}</div>}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <select
                      value={s.status}
                      onChange={(e) => onUpdateStatus(s.id, e.target.value as SubsidyStatus)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003594]"
                    >
                      {(Object.keys(STATUS_LABEL) as SubsidyStatus[])
                        .filter((st) => !PIPELINE_MANAGED_STATUSES.includes(st) || st === s.status)
                        .map((st) => (
                          <option key={st} value={st}>
                            {STATUS_LABEL[st]}
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" strokeWidth={1.75} />
                      Bearbeiten
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Zuschuss für ${s.personName} entfernen?`)) onDelete(s.id);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                      Entfernen
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
};
