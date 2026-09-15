import React, { useMemo, useRef, useState } from 'react';
import {
  Subsidy,
  SubsidyPerson,
  SubsidyStatus,
  SubsidyPersonType,
  SubsidyKind,
  AuditLogEntry,
  Resolution,
} from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  STATUS_LABEL,
  PERSON_TYPE_LABEL,
  PIPELINE_MANAGED_STATUSES,
  SUBSIDY_STAGES,
  defaultSubsidyStage,
  budgetOverview,
  personBudget,
  isPayable,
  paymentReference,
  ofKind,
  KIND_TEXTS,
} from '../utils/subsidies';
import { CATEGORY_LABEL, SubsidyLimits } from '../data/subsidyCatalogue';
import { formatIban, buildSepaCreditTransfer, downloadSepaFile, isValidIban } from '../utils/sepa';
import { generateGiroCodePaymentsPdf } from '../utils/giroCodePdf';
import { downloadBlob, openDataUrl } from '../utils/fileHelpers';
import { ResolutionPicker } from './ResolutionPicker';
import { EmailService } from '../utils/emailService';
import { resendSubsidyProofLink, getSubsidyProofLink } from '../utils/accountService';
import { copyPendingText, copyText } from '../utils/clipboard';
import { FilePreviewModal, PreviewableFile } from './FilePreviewModal';
import { RevisionHistoryModal } from './RevisionHistoryModal';
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
  Upload,
  Vote,
  Link as LinkIcon,
  Copy,
  Check,
  CalendarClock,
  Send,
  ListTree,
  History as HistoryIcon,
  QrCode,
  Share2,
} from 'lucide-react';
import { Collapse } from './Collapse';
import { StageTabs } from './StageTabs';
import { SubsidyBudgetBar } from './SubsidyBudgetBar';
import { useSwipeTabs } from '../hooks/useSwipeTabs';
import { smooth, transitionName } from '../utils/smooth';

interface Props {
  subsidies: Subsidy[];
  /** Welcher Reiter: Zuschuesse oder Auslagenerstattungen. */
  kind: SubsidyKind;
  people: SubsidyPerson[];
  year: number;
  limits: SubsidyLimits;
  auditLog: AuditLogEntry[];
  /** Fuer die Absicherung der manuellen Status-Aenderung: ist der verknuepfte Beschluss angenommen? */
  resolutions: Resolution[];
  /** Fuer den erneuten Download der Zahlungsdatei im Reiter "Erledigt". */
  clubAccount: { name: string; iban: string; bic?: string };
  onLogPaymentFileRegenerated: (id: string, format: 'sepa-xml' | 'girocode-pdf') => void;
  onChangeYear: (year: number) => void;
  onOpenNew: () => void;
  onEdit: (subsidy: Subsidy) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: SubsidyStatus) => void;
  onReassignResolution: (id: string, resolutionId: string | null) => void;
  onManagePeople: () => void;
  /** Personenuebersicht direkt bei einer Person oeffnen (aus der Budget-Leiste) */
  onOpenPerson: (personId: string) => void;
  onManageCatalogue: () => void;
  onOpenPayout: () => void;
  onOpenBundle: () => void;
  onImportCsv: (text: string) => { ok: true } | { ok: false; error: string };
  /** Vorausgewaehlte Phase beim Sprung aus der Uebersicht. */
  initialStage?: string;
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
  kind,
  people,
  year,
  limits,
  auditLog,
  resolutions,
  clubAccount,
  onLogPaymentFileRegenerated,
  onChangeYear,
  onOpenNew,
  onEdit,
  onDelete,
  onUpdateStatus,
  onReassignResolution,
  onManagePeople,
  onOpenPerson,
  onManageCatalogue,
  onOpenPayout,
  onOpenBundle,
  onImportCsv,
  initialStage,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filterPerson, setFilterPerson] = useState('all');
  const [filterType, setFilterType] = useState<'all' | SubsidyPersonType>('all');
  const [activeStage, setActiveStage] = useState<string>(
    () => initialStage || defaultSubsidyStage(ofKind(subsidies, kind), year)
  );
  /** Reiter-Reihenfolge fuers Wischen: die Phasen, dann "Alle". */
  const stageKeys = useMemo(() => [...SUBSIDY_STAGES.map((s) => s.key), 'all'], []);
  const stageSwipe = useSwipeTabs({ keys: stageKeys, active: activeStage, onChange: setActiveStage });
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [manualOverrideId, setManualOverrideId] = useState<string | null>(null);
  const [reassignId, setReassignId] = useState<string | null>(null);
  const [reassignChoice, setReassignChoice] = useState<string>('');
  const resolutionById = useMemo(
    () => Object.fromEntries(resolutions.map((r) => [r.id, r])),
    [resolutions]
  );
  const texts = KIND_TEXTS[kind];
  /** Nur die Vorgaenge dieses Reiters - Zuschuesse und Auslagen sind getrennt. */
  const scoped = useMemo(() => ofKind(subsidies, kind), [subsidies, kind]);
  const [previewFile, setPreviewFile] = useState<PreviewableFile | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [resendState, setResendState] = useState<Record<string, 'busy' | 'done' | 'error'>>({});
  /** "Link kopieren" je Vorgang; `manual` = Kopieren klappte nicht, Link wird angezeigt. */
  const [copyState, setCopyState] = useState<
    Record<string, { status: 'busy' | 'done' | 'manual' | 'error'; url?: string }>
  >({});
  const [regeneratingQrId, setRegeneratingQrId] = useState<string | null>(null);
  const [historySubsidyId, setHistorySubsidyId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const handleResendProofLink = async (s: Subsidy, email: string) => {
    setResendState((prev) => ({ ...prev, [s.id]: 'busy' }));
    const result = await resendSubsidyProofLink({
      subsidyId: s.id,
      email,
      personName: s.personName,
      eventName: s.eventName,
    });
    setResendState((prev) => ({ ...prev, [s.id]: result.ok ? 'done' : 'error' }));
    if (result.ok === false) alert(result.error);
  };

  /**
   * "Link kopieren": holt denselben Nachweis-Link wie die E-Mail und legt ihn
   * in die Zwischenablage - zum Weiterleiten per WhatsApp, auch fuer Personen
   * ohne E-Mail-Adresse. Klappt das Kopieren nicht, wird der Link zum
   * Markieren und Teilen angezeigt.
   */
  const handleCopyProofLink = async (s: Subsidy) => {
    setCopyState((prev) => ({ ...prev, [s.id]: { status: 'busy' } }));
    const link = getSubsidyProofLink(s.id).then((r) => {
      if (r.ok === false) throw new Error(r.error);
      return r.url;
    });
    const copied = await copyPendingText(link);

    let url: string;
    try {
      url = await link;
    } catch (err: any) {
      setCopyState((prev) => ({ ...prev, [s.id]: { status: 'error' } }));
      alert(err?.message || 'Der Nachweis-Link konnte nicht erzeugt werden.');
      return;
    }

    setCopyState((prev) => ({ ...prev, [s.id]: { status: copied ? 'done' : 'manual', url } }));
    if (copied) {
      window.setTimeout(
        () =>
          setCopyState((prev) => {
            if (prev[s.id]?.status !== 'done') return prev;
            // Knopf wieder auf "Link kopieren" zuruecksetzen
            const next = { ...prev };
            delete next[s.id];
            return next;
          }),
        3000
      );
    }
  };

  /**
   * Zahlungsdatei fuer einen bereits bezahlten Zuschuss erneut erzeugen -
   * deterministisch aus den aktuellen Daten (IBAN/Betrag/Verwendungszweck
   * aendern sich im Nachhinein nicht), es wird also nichts gespeichert und
   * neu heruntergeladen statt eine alte Datei irgendwo vorzuhalten.
   */
  const handleRegenerateSepa = (s: Subsidy, person: SubsidyPerson) => {
    const result = buildSepaCreditTransfer(
      clubAccount,
      [
        {
          name: person.accountHolder?.trim() || person.name,
          iban: person.iban!,
          bic: person.bic || undefined,
          amount: s.amount,
          reference: paymentReference([s]),
          endToEndId: `WJOF-${s.year}-${s.id.slice(-8)}`,
        },
      ],
      s.paidAt?.slice(0, 10)
    );
    downloadSepaFile(result);
    onLogPaymentFileRegenerated(s.id, 'sepa-xml');
  };

  const handleRegenerateGiroCode = async (s: Subsidy, person: SubsidyPerson) => {
    setRegeneratingQrId(s.id);
    try {
      const { blob, fileName } = await generateGiroCodePaymentsPdf(clubAccount, [
        {
          name: person.accountHolder?.trim() || person.name,
          iban: person.iban!,
          bic: person.bic || undefined,
          amount: s.amount,
          reference: paymentReference([s]),
          endToEndId: `WJOF-${s.year}-${s.id.slice(-8)}`,
        },
      ]);
      downloadBlob(blob, fileName);
      onLogPaymentFileRegenerated(s.id, 'girocode-pdf');
    } finally {
      setRegeneratingQrId(null);
    }
  };

  const handleImportFile = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const result = onImportCsv(text);
      setImportMessage(
        result.ok === false
          ? { ok: false, text: result.error }
          : { ok: true, text: 'Antrag aus der Sicherungsdatei übernommen.' }
      );
      setTimeout(() => setImportMessage(null), 5000);
    };
    reader.readAsText(file);
  };

  // Jede Vorgangsart hat ihren eigenen oeffentlichen Link zum Weitergeben
  // (z.B. in der WhatsApp-Gruppe): /antrag fuer Zuschuesse, /auslage fuer
  // Erstattungen.
  const antragUrl = `${window.location.origin}${kind === 'auslage' ? '/auslage' : '/antrag'}`;
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

  const stageOf = useMemo(() => {
    const map = new Map<SubsidyStatus, string>();
    SUBSIDY_STAGES.forEach((stage) => stage.statuses.forEach((st) => map.set(st, stage.key)));
    return map;
  }, []);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    scoped
      .filter((s) => s.year === year)
      .forEach((s) => {
        const key = stageOf.get(s.status);
        if (key) counts[key] = (counts[key] || 0) + 1;
      });
    return counts;
  }, [scoped, year, stageOf]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return scoped
      .filter((s) => s.year === year)
      .filter((s) => filterPerson === 'all' || s.personId === filterPerson)
      .filter(
        (s) => filterType === 'all' || personById[s.personId]?.type === filterType
      )
      .filter((s) => activeStage === 'all' || stageOf.get(s.status) === activeStage)
      .filter(
        (s) =>
          !q ||
          s.personName.toLowerCase().includes(q) ||
          s.eventName.toLowerCase().includes(q) ||
          (s.note || '').toLowerCase().includes(q)
      )
      .sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''));
  }, [scoped, year, filterPerson, filterType, activeStage, stageOf, search, personById]);

  const overview = budgetOverview(subsidies, year, limits);
  /** Fuer den Hinweis an der Personenuebersicht: wer liegt ueber der Jahresgrenze? */
  const peopleOverLimit =
    kind === 'zuschuss'
      ? people.filter(
          (p) => personBudget(subsidies, p.id, year, limits).used > limits.perPersonPerYear
        ).length
      : 0;
  const payable = scoped.filter((s) => s.year === year && isPayable(s));
  const bundlable = scoped.filter((s) => s.year === year && s.status === 'bestaetigt');
  const notYetHappened = scoped.filter(
    (s) => s.year === year && s.status === 'nicht_stattgefunden'
  );
  const filteredSum = filtered.reduce((sum, s) => sum + s.amount, 0);

  const hasActiveFilters = filterPerson !== 'all' || filterType !== 'all' || !!search.trim();

  const usedPercent = Math.min(100, (overview.used / overview.total) * 100);
  const paidPercent = Math.min(100, (overview.paid / overview.total) * 100);

  const exportCsv = () => {
    const head = [
      'Wer',
      'Typ',
      'Wann',
      'Wofür',
      'Kategorie',
      'Zuschuss',
      'Kosten',
      'Stand',
      'Teilnahmenachweis',
      'Kostennachweis',
    ];
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
      s.costProofState === 'hochgeladen'
        ? 'hier abgelegt'
        : s.costProofState === 'anderweitig'
        ? s.costProofNote || 'anderweitig'
        : 'offen',
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${c}"`).join(';')).join('\n');
    downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `WJOF_${texts.fileLabel}_${year}.csv`);
  };

  return (
    <div ref={stageSwipe.ref} className="space-y-4 max-w-5xl mx-auto">
      {/* Kopf */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HandCoins className="w-5 h-5 text-[#003594]" strokeWidth={1.75} />
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {texts.tabLabel}
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
          {kind === 'zuschuss' && (
            <button
              type="button"
              onClick={onManageCatalogue}
              className="p-2 sm:px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Veranstaltungen, Beträge und Obergrenzen verwalten"
            >
              <ListTree className="w-4 h-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Katalog</span>
            </button>
          )}
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

      {/* Öffentlicher Link zum Weiterleiten (z. B. per WhatsApp) - nur ein
          kleiner Kopier-Knopf, die Adresse selbst braucht niemand zu sehen. */}
      <div className="-mt-1">
        <button
          type="button"
          onClick={handleCopyAntragUrl}
          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors duration-200 cursor-pointer ${
            linkCopied
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {linkCopied ? (
            <Check className="w-3.5 h-3.5" strokeWidth={2} />
          ) : (
            <LinkIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
          )}
          {linkCopied
            ? 'Link kopiert'
            : kind === 'auslage'
            ? 'Auslagen-Link kopieren'
            : 'Antragslink kopieren'}
        </button>
      </div>

      {/* Budget als schlanke Leiste - nur bei Zuschuessen: Auslagenerstattungen
          zaehlen nicht gegen das Jahresbudget der Zuschuss-Richtlinie. */}
      {kind === 'zuschuss' && (
        <SubsidyBudgetBar
          subsidies={subsidies}
          people={people}
          year={year}
          limits={limits}
          onOpenPerson={onOpenPerson}
          onOpenPeople={onManagePeople}
        />
      )}

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
                {bundlable.length} {bundlable.length === 1 ? texts.singular : texts.plural} geprüft
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

      {/* Noch nicht stattgefundene Veranstaltungen - rein informativ, siehe
          die automatische Kaskade in useSubsidies.ts, die sie nach dem
          Veranstaltungsdatum selbst in die Prüfung rutschen laesst. */}
      {notYetHappened.length > 0 && (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-sm">
              {notYetHappened.length}{' '}
              {notYetHappened.length === 1 ? 'Veranstaltung' : 'Veranstaltungen'} noch nicht
              stattgefunden
            </div>
            <div className="text-[11px] text-slate-500">
              {formatCurrency(notYetHappened.reduce((s, x) => s + x.amount, 0))} · rutscht am
              Veranstaltungsdatum automatisch in die Prüfung
            </div>
          </div>
        </div>
      )}

      {importMessage && (
        <div
          className={`text-xs font-semibold rounded-xl border p-3 ${
            importMessage.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {importMessage.text}
        </div>
      )}

      {/* Laufbahn-Reiter: Offen -> Geprüft -> Im Beschluss -> Zur Zahlung
          freigegeben -> Erledigt. Der Übergang zwischen den Phasen passiert
          bis auf "Geprüft setzen" automatisch (siehe useSubsidies.ts) - die
          Reiter dienen nur der Übersicht, nicht der manuellen Steuerung.
          "Alle" steht auf Wunsch des Vorstands ganz am Ende, hinter "Erledigt".
          Wechsel per Tippen oder Wischen (useSwipeTabs). */}
      <StageTabs
        tabs={[
          ...SUBSIDY_STAGES.map((stage) => ({
            key: stage.key,
            label: stage.label,
            count: stageCounts[stage.key] || 0,
          })),
          { key: 'all', label: 'Alle', count: scoped.filter((s) => s.year === year).length },
        ]}
        active={activeStage}
        onSelect={stageSwipe.select}
      />

      {/* Filter */}
      <div className="flex justify-end gap-2">
        <input
          ref={importInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            handleImportFile(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Sicherungsdatei eines Antragstellers einspielen"
        >
          <Upload className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">CSV importieren</span>
        </button>
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

      <Collapse open={!!(showFilters)}>{showFilters && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, Veranstaltung oder Notiz suchen…"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setFilterPerson('all');
                setFilterType('all');
                setSearch('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}</Collapse>

      {/* Liste */}
      <div className="flex items-baseline justify-between px-1 text-[11px] text-slate-500">
        <span className="uppercase font-bold tracking-wider text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'Eintrag' : 'Einträge'}
        </span>
        <span className="font-bold text-slate-900 text-sm">{formatCurrency(filteredSum)}</span>
      </div>

      <div key={activeStage} className={`space-y-1.5 ${stageSwipe.slideClass}`}>
        {filtered.length === 0 && (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
            Keine {texts.plural} für diese Auswahl.
          </div>
        )}

        {filtered.map((s) => {
          const person = personById[s.personId];
          const isExpanded = expandedId === s.id;

          return (
            <div
              key={s.id}
              // Eigener Uebergangs-Name: die Karte gleitet bei smooth() an ihren neuen Platz
              style={{ viewTransitionName: transitionName('sub', s.id) }}
              className="bg-white rounded-xl border border-slate-200 wj-view-enter"
            >
              {/* Die GANZE Kopfzeile klappt auf - nicht nur der kleine Pfeil,
                  der bleibt nur als Hinweis auf den Zustand. */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : s.id);
                  }
                }}
                className="flex items-center gap-2 p-3 cursor-pointer rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0 text-left">
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
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    STATUS_STYLE[s.status]
                  }`}
                >
                  {STATUS_LABEL[s.status]}
                </span>

                <ChevronDown
                  aria-hidden="true"
                  className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  strokeWidth={1.75}
                />
              </div>

              <Collapse open={!!(isExpanded)}>{isExpanded && (
                <div className="px-3 pb-3 space-y-2.5 text-[11px]">
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

                  {/* Bei einer Auslage gibt es keinen separaten
                      Teilnahmenachweis - die hochgeladene Rechnung ist der
                      Beleg, mehr braucht es nicht. */}
                  {kind !== 'auslage' && (
                  <div className="text-slate-600">
                    Teilnahmenachweis:{' '}
                    {s.proofState === 'hochgeladen' && s.proofFile ? (
                      <button
                        type="button"
                        onClick={() => {
                          const file = s.proofFile!;
                          const isImage = file.mimeType?.startsWith('image/');
                          if (!file.dataUrl || isImage) {
                            setPreviewFile(file);
                          } else {
                            openDataUrl(file.dataUrl, file.name);
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
                  )}

                  <div className="text-slate-600">
                    {texts.proofLabel}:{' '}
                    {s.costProofState === 'hochgeladen' && s.costProofFile ? (
                      <button
                        type="button"
                        onClick={() => {
                          const file = s.costProofFile!;
                          const isImage = file.mimeType?.startsWith('image/');
                          if (!file.dataUrl || isImage) {
                            setPreviewFile(file);
                          } else {
                            openDataUrl(file.dataUrl, file.name);
                          }
                        }}
                        className="text-[#003594] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Paperclip className="w-3 h-3" strokeWidth={1.75} />
                        {s.costProofFile.name}
                      </button>
                    ) : s.costProofState === 'anderweitig' ? (
                      <span className="text-slate-700">{s.costProofNote}</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">offen</span>
                    )}
                  </div>

                  {(kind === 'auslage'
                    ? s.costProofState !== 'hochgeladen'
                    : s.proofState !== 'hochgeladen' || s.costProofState !== 'hochgeladen') && (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        {person?.email && (
                          <button
                            type="button"
                            onClick={() => handleResendProofLink(s, person.email!)}
                            disabled={resendState[s.id] === 'busy'}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3 h-3" strokeWidth={1.75} />
                            {resendState[s.id] === 'busy'
                              ? 'Wird gesendet…'
                              : resendState[s.id] === 'done'
                              ? 'Link erneut gesendet'
                              : resendState[s.id] === 'error'
                              ? 'Fehlgeschlagen – erneut versuchen'
                              : 'Nachweis-Link senden'}
                          </button>
                        )}

                        {/* Link fuer WhatsApp & Co. - ohne E-Mail */}
                        <button
                          type="button"
                          onClick={() => handleCopyProofLink(s)}
                          disabled={copyState[s.id]?.status === 'busy'}
                          className={`px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-colors duration-200 cursor-pointer disabled:opacity-50 ${
                            copyState[s.id]?.status === 'done'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {copyState[s.id]?.status === 'done' ? (
                            <Check className="w-3 h-3" strokeWidth={2} />
                          ) : (
                            <Copy className="w-3 h-3" strokeWidth={1.75} />
                          )}
                          {copyState[s.id]?.status === 'busy'
                            ? 'Link wird erstellt…'
                            : copyState[s.id]?.status === 'done'
                            ? 'Link kopiert'
                            : 'Link kopieren'}
                        </button>
                      </div>

                      {/* Rueckfall, wenn der Browser das Kopieren verweigert */}
                      <Collapse open={copyState[s.id]?.status === 'manual'}>
                        {copyState[s.id]?.status === 'manual' && copyState[s.id]?.url && (
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-1.5">
                            <p className="font-semibold text-amber-900">
                              Automatisch kopieren hat nicht geklappt. Den Link hier markieren
                              oder direkt teilen:
                            </p>
                            <input
                              readOnly
                              value={copyState[s.id]!.url}
                              onFocus={(e) => e.currentTarget.select()}
                              className="w-full min-w-0 px-2 py-1.5 bg-white border border-amber-200 rounded-md font-mono text-base sm:text-[11px] text-slate-700"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  const url = copyState[s.id]?.url;
                                  if (url && (await copyText(url))) {
                                    setCopyState((prev) => ({ ...prev, [s.id]: { status: 'done', url } }));
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-900 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" strokeWidth={1.75} />
                                Kopieren
                              </button>
                              {typeof navigator !== 'undefined' && 'share' in navigator && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const url = copyState[s.id]?.url;
                                    if (url) navigator.share({ url }).catch(() => {});
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-900 font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <Share2 className="w-3 h-3" strokeWidth={1.75} />
                                  Teilen
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </Collapse>
                    </div>
                  )}

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

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHistorySubsidyId(s.id);
                    }}
                    className="text-[11px] font-bold text-[#003594] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <HistoryIcon className="w-3 h-3" strokeWidth={1.75} />
                    Historie anzeigen
                  </button>

                  {s.status === 'beantragt' && (
                    <button
                      type="button"
                      onClick={() => {
                        const missing: string[] = [];
                        if (kind !== 'auslage' && s.proofState === 'offen') {
                          missing.push('Teilnahmenachweis');
                        }
                        if (s.costProofState === 'offen') missing.push(texts.proofLabel);
                        if (
                          missing.length === 0 ||
                          confirm(
                            `${missing.join(' und ')} ${missing.length === 1 ? 'ist' : 'sind'} noch nicht hinterlegt. Trotzdem als geprüft markieren?`
                          )
                        ) {
                          onUpdateStatus(s.id, 'bestaetigt');
                        }
                      }}
                      className="w-full py-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#003594] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={2} />
                      Als geprüft markieren
                    </button>
                  )}

                  {/* Geprüft, aber noch an keinem Beschluss: entweder über
                      "Beschluss erstellen" bündeln (mehrere auf einmal) oder
                      hier einzeln einem bereits vorhandenen Beschluss
                      zuordnen - z.B. wenn die Ausgabe längst beschlossen war. */}
                  {s.status === 'bestaetigt' && !s.resolutionId && (
                    <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-2 space-y-1.5">
                      {reassignId === s.id ? (
                        <div className="space-y-1.5 wj-expand">
                          <ResolutionPicker
                            resolutions={resolutions}
                            value={reassignChoice}
                            onChange={setReassignChoice}
                            statuses={['in_abstimmung', 'angenommen']}
                          />
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setReassignId(null)}
                              className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                              Abbrechen
                            </button>
                            <button
                              type="button"
                              disabled={!reassignChoice}
                              onClick={() => {
                                onReassignResolution(s.id, reassignChoice);
                                setReassignId(null);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Zuordnen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReassignChoice('');
                            setReassignId(s.id);
                          }}
                          className="w-full py-1.5 rounded-lg bg-white border border-blue-200 text-[#003594] font-bold flex items-center justify-center gap-1.5 transition-colors hover:bg-blue-50 cursor-pointer"
                        >
                          <Vote className="w-3.5 h-3.5" strokeWidth={2} />
                          Bestehendem Beschluss zuordnen
                        </button>
                      )}
                    </div>
                  )}

                  {s.status === 'bezahlt' && person?.iban && isValidIban(person.iban) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-600">
                        Überweisungsdatei erneut abrufen
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRegenerateSepa(s, person)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" strokeWidth={1.75} />
                          SEPA-XML
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRegenerateGiroCode(s, person)}
                          disabled={regeneratingQrId === s.id}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3 h-3" strokeWidth={1.75} />
                          {regeneratingQrId === s.id ? 'Wird erzeugt…' : 'QR-Code-PDF'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
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
                        if (confirm(`${texts.singular} für ${s.personName} entfernen?`)) onDelete(s.id);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-3 h-3" strokeWidth={1.75} />
                      Entfernen
                    </button>
                  </div>

                  {/* Der Stand laeuft normalerweise vollautomatisch durch die
                      Pipeline (siehe useSubsidies.ts) - manuelles Setzen ist
                      bewusst als Ausnahme versteckt, nicht gleichrangig neben
                      Bearbeiten/Entfernen. */}
                  <div className="pt-1">
                    {manualOverrideId === s.id ? (
                      (() => {
                        const linkedResolution = s.resolutionId ? resolutionById[s.resolutionId] : undefined;
                        const isAccepted = linkedResolution?.status === 'angenommen';
                        // Kein Beschluss dahinter -> zur Zahlung freigeben waere unbelegt.
                        const isLocked = !!s.resolutionId && !isAccepted;
                        // Beschluss bereits angenommen -> nicht mehr "zurueckdrehen" auf einen
                        // Stand vor der Zahlungsfreigabe, sonst passt der Beschluss nicht
                        // mehr zum tatsaechlichen Zuschuss-Stand.
                        const isLockedDown = !!s.resolutionId && isAccepted;
                        // Noch gar kein Beschluss zugeordnet -> "Im Beschluss"/"Zur Zahlung
                        // freigegeben"/"Bezahlt" waeren nicht berechtigt, das passiert erst
                        // automatisch, sobald tatsaechlich gebuendelt wird ("Beschluss
                        // erstellen" aus dem Geprueft-Reiter). "Abgelehnt" bleibt erlaubt,
                        // da das die einzige Moeglichkeit ist, einen Antrag direkt
                        // abzulehnen, ohne ihn erst in einen Beschluss zu buendeln.
                        const isNoResolutionYet = !s.resolutionId;
                        const lockedStatuses: SubsidyStatus[] = isLocked
                          ? ['zur_zahlung_freigegeben', 'bezahlt']
                          : isLockedDown
                          ? ['beantragt', 'bestaetigt', 'im_beschluss', 'nicht_stattgefunden', 'abgelehnt']
                          : isNoResolutionYet
                          ? ['im_beschluss', 'zur_zahlung_freigegeben', 'bezahlt']
                          : [];
                        return (
                          <div className="space-y-1.5 wj-expand">
                            <div className="flex items-center gap-2">
                              <select
                                value={s.status}
                                onChange={(e) => onUpdateStatus(s.id, e.target.value as SubsidyStatus)}
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003594]"
                              >
                                {/* Hier bewusst KEIN pauschaler Filter auf
                                    PIPELINE_MANAGED_STATUSES: das ist der
                                    Ausnahme-Pfad fuer Korrekturen/Altfaelle.
                                    Gesperrt wird gezielt nur, wenn ein
                                    verknuepfter Beschluss existiert, der noch
                                    nicht angenommen ist - sonst koennte man
                                    eine Auszahlung ohne echten Beschluss
                                    dahinter freigeben. */}
                                {(Object.keys(STATUS_LABEL) as SubsidyStatus[]).map((st) => (
                                  <option key={st} value={st} disabled={lockedStatuses.includes(st)}>
                                    {STATUS_LABEL[st]}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => setManualOverrideId(null)}
                                className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                Fertig
                              </button>
                            </div>

                            {isLockedDown && (
                              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                Beschluss {linkedResolution?.number} ist bereits angenommen - der
                                Stand kann nur noch zwischen „Zur Zahlung freigegeben" und
                                „Bezahlt" wechseln, nicht mehr darunter (kein Zurückdrehen auf
                                „Offen"/„Geprüft"/„Im Beschluss").
                              </p>
                            )}

                            {isNoResolutionYet && (
                              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                „Im Beschluss", „Zur Zahlung freigegeben" und „Bezahlt" sind
                                gesperrt: Dieser Zuschuss hängt noch an keinem Beschluss. Das
                                passiert automatisch, sobald er über „Beschluss erstellen" im
                                Reiter „Geprüft" gebündelt wird.
                              </p>
                            )}

                            {isLocked && (
                              <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-1.5">
                                <p>
                                  „Zur Zahlung freigegeben" und „Bezahlt" sind gesperrt: Beschluss{' '}
                                  {linkedResolution?.number || '?'} ist noch nicht angenommen (Status:{' '}
                                  {linkedResolution?.status === 'in_abstimmung'
                                    ? 'in Abstimmung'
                                    : linkedResolution?.status === 'abgelehnt'
                                    ? 'abgelehnt'
                                    : linkedResolution?.status || 'unbekannt'}
                                  ). Ohne angenommenen Beschluss darf nicht zur Zahlung freigegeben werden.
                                </p>
                                {reassignId === s.id ? (
                                  <div className="space-y-1.5 pt-0.5 wj-expand">
                                    <ResolutionPicker
                                      resolutions={resolutions}
                                      value={reassignChoice}
                                      onChange={setReassignChoice}
                                      statuses={['angenommen']}
                                      noneLabel="Keine Zuordnung"
                                    />
                                    <div className="flex items-center justify-end gap-3">
                                      <button
                                        type="button"
                                        onClick={() => setReassignId(null)}
                                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
                                      >
                                        Abbrechen
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onReassignResolution(s.id, reassignChoice || null);
                                          setReassignId(null);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-[#003594] hover:bg-[#00266B] text-white text-[11px] font-bold cursor-pointer"
                                      >
                                        Übernehmen
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReassignChoice('');
                                      setReassignId(s.id);
                                    }}
                                    className="font-bold underline decoration-dotted cursor-pointer"
                                  >
                                    Anderem (angenommenem) Beschluss zuordnen
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <button
                        type="button"
                        onClick={() => setManualOverrideId(s.id)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 underline decoration-dotted cursor-pointer"
                      >
                        Status manuell ändern (Ausnahme)
                      </button>
                    )}
                  </div>
                </div>
              )}</Collapse>
            </div>
          );
        })}
      </div>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      <RevisionHistoryModal
        isOpen={!!historySubsidyId}
        onClose={() => setHistorySubsidyId(null)}
        title={(() => {
          const s = subsidies.find((x) => x.id === historySubsidyId);
          return s ? `${s.personName} – ${s.eventName}` : 'Historie';
        })()}
        entries={auditLog.filter((a) => a.entityType === 'subsidy' && a.entityId === historySubsidyId)}
      />
    </div>
  );
};
