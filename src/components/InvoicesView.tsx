import React, { useMemo, useState } from 'react';
import {
  BoardMember,
  Invoice,
  Resolution,
  InvoiceStatus,
  BookkeepingStatus,
  InvoiceFolder,
  Subsidy
} from '../types';
import { FilePreviewModal, PreviewableFile } from './FilePreviewModal';
import { downloadBlob, openDataUrl } from '../utils/fileHelpers';
import { formatCurrency, formatDate } from '../utils/formatters';
import { transitionName } from '../utils/smooth';
import {
  Receipt,
  Plus,
  Search,
  Download,
  Folder,
  FolderPlus,
  Trash2,
  Filter,
  ChevronDown,
  Wallet,
  Paperclip,
  CheckCircle2,
  MinusCircle,
  RotateCcw,
  Eye
} from 'lucide-react';
import { Collapse } from './Collapse';
import { StageTabs } from './StageTabs';
import { useSwipeTabs } from '../hooks/useSwipeTabs';

interface InvoicesViewProps {
  currentMember: BoardMember;
  members: BoardMember[];
  invoices: Invoice[];
  resolutions: Resolution[];
  folders?: InvoiceFolder[];
  /** Auslagenerstattungen - deren Belege sollen hier auffindbar sein. */
  expenses?: Subsidy[];
  onNavigateToExpenses?: () => void;
  onOpenNewInvoice: () => void;
  onSelectInvoice: (invoiceId: string) => void;
  onUpdateInvoiceStatus: (invoiceId: string, newStatus: InvoiceStatus) => void;
  onToggleBookkeepingRecorded?: (invoiceId: string, isRecorded: boolean) => void;
  onUpdateInvoiceBookkeepingStatus?: (invoiceId: string, status: BookkeepingStatus) => void;
  onCreateFolder?: (name: string, color?: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onUpdateInvoiceFolder?: (invoiceId: string, folderId: string | undefined) => void;
  onOpenInvoiceRequestModal?: () => void;
}

/**
 * Belege - aufgebaut wie Zuschuesse und Beschluesse (v3.26.0):
 * Reiter "Buchhaltung offen" / "Erledigt" / "Aus Auslagen" (per Tippen oder
 * Wischen), schlichte Karten, Aktionen erst beim Aufklappen. Beschluss,
 * Ordner, Jahr und Monat sind Filter statt eigener Leisten. Alles Weitere
 * (Beleg ansehen, Status, Historie) steht im Detailfenster.
 */

type Section = 'offen' | 'erledigt' | 'auslagen';

/** Buchhaltungsstand eines Belegs - aeltere Belege kennen nur das Haekchen. */
const bookkeepingOf = (inv: Invoice): BookkeepingStatus =>
  inv.bookkeepingStatus || (inv.isBookkeepingRecorded ? 'bearbeitet' : 'nicht_bearbeitet');

const MONTHS = [
  { value: '01', label: 'Januar' },
  { value: '02', label: 'Februar' },
  { value: '03', label: 'März' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Dezember' },
];

const selectClass =
  'w-full min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003594]';

const smallButton =
  'px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors duration-200 cursor-pointer';

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  resolutions,
  expenses = [],
  onNavigateToExpenses,
  folders = [],
  onOpenNewInvoice,
  onSelectInvoice,
  onUpdateInvoiceBookkeepingStatus,
  onCreateFolder,
  onDeleteFolder,
  onUpdateInvoiceFolder,
}) => {
  const openCount = invoices.filter((i) => bookkeepingOf(i) === 'nicht_bearbeitet').length;
  const hasExpenses = expenses.length > 0;

  const sectionKeys = useMemo<Section[]>(
    () => (hasExpenses ? ['offen', 'erledigt', 'auslagen'] : ['offen', 'erledigt']),
    [hasExpenses]
  );
  const [section, setSection] = useState<Section>(() =>
    openCount > 0 || invoices.length === 0 ? 'offen' : 'erledigt'
  );
  // Verschwinden die Auslagen, faellt ein gewaehlter "Auslagen"-Reiter zurueck
  const activeSection: Section = sectionKeys.includes(section) ? section : 'offen';
  const swipe = useSwipeTabs<Section>({ keys: sectionKeys, active: activeSection, onChange: setSection });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expensePreview, setExpensePreview] = useState<PreviewableFile | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResolution, setFilterResolution] = useState<'all' | 'with' | 'without'>('all');
  const [filterFolder, setFilterFolder] = useState<string>('all'); // all | none | Ordner-ID
  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [showFolderAdmin, setShowFolderAdmin] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const hasActiveFilters =
    !!searchQuery.trim() ||
    filterResolution !== 'all' ||
    filterFolder !== 'all' ||
    filterYear !== 'all' ||
    filterMonth !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setFilterResolution('all');
    setFilterFolder('all');
    setFilterYear('all');
    setFilterMonth('all');
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    invoices.forEach((inv) => {
      const y = inv.date?.split('-')[0];
      if (y) years.add(y);
    });
    return [...years].sort().reverse();
  }, [invoices]);

  const matchesFilters = (inv: Invoice) => {
    if (filterResolution === 'with' && !inv.hasResolution) return false;
    if (filterResolution === 'without' && inv.hasResolution) return false;
    if (filterFolder === 'none' && inv.folderId) return false;
    if (filterFolder !== 'all' && filterFolder !== 'none' && inv.folderId !== filterFolder) return false;
    if (filterYear !== 'all' && !inv.date?.startsWith(filterYear)) return false;
    if (filterMonth !== 'all' && inv.date?.split('-')[1] !== filterMonth) return false;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const haystack = [inv.vendor, inv.title, inv.invoiceNumber, inv.submittedBy?.name]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  };

  const filteredInvoices = invoices
    .filter((inv) => {
      const isOpen = bookkeepingOf(inv) === 'nicht_bearbeitet';
      if (activeSection === 'offen' && !isOpen) return false;
      if (activeSection === 'erledigt' && isOpen) return false;
      return matchesFilters(inv);
    })
    .sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));

  const listCount = activeSection === 'auslagen' ? expenses.length : filteredInvoices.length;
  const listSum =
    activeSection === 'auslagen'
      ? expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      : filteredInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

  const exportCSV = () => {
    const headers = ['Belegnummer', 'Lieferant / Empfänger', 'Beschreibung', 'Betrag (EUR)', 'Belegdatum', 'Ordner', 'Buchhaltungs-Status', 'Typ'];
    const rows = filteredInvoices.map((inv) => {
      const folderName = inv.folderId ? folders.find((f) => f.id === inv.folderId)?.name || 'Ordner' : 'Ohne Ordner';
      return [
        `"${inv.invoiceNumber}"`,
        `"${inv.vendor}"`,
        `"${inv.title}"`,
        inv.amount.toFixed(2),
        `"${inv.date}"`,
        `"${folderName}"`,
        `"${bookkeepingOf(inv)}"`,
        inv.hasResolution ? '"Mit Beschluss"' : '"Ohne Beschluss"',
      ];
    });
    const csvContent = [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    // BOM vorneweg, damit Excel die Umlaute richtig erkennt.
    downloadBlob(
      new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8' }),
      `WJ_Belege_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim() || !onCreateFolder) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName('');
  };

  const renderInvoice = (inv: Invoice) => {
    const folder = inv.folderId ? folders.find((f) => f.id === inv.folderId) : undefined;
    const linkedRes = inv.resolutionId ? resolutions.find((r) => r.id === inv.resolutionId) : undefined;
    const bk = bookkeepingOf(inv);
    const isExpanded = expandedId === inv.id;
    const toggle = () => setExpandedId(isExpanded ? null : inv.id);

    return (
      <div
        key={inv.id}
        // Eigener Uebergangs-Name: die Karte gleitet bei smooth() an ihren neuen Platz
        style={{ viewTransitionName: transitionName('inv', inv.id) }}
        className="bg-white rounded-xl border border-slate-200 wj-view-enter"
      >
        <div
          role="button"
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggle();
            }
          }}
          className="flex items-center gap-2 p-3 cursor-pointer rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold text-slate-900 text-sm truncate">{inv.vendor || inv.title}</span>
              <span className="font-bold text-[#003594] text-sm shrink-0">{formatCurrency(inv.amount)}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500 truncate">
              {inv.title}
              {inv.date ? ` · ${formatDate(inv.date)}` : ''}
            </div>
            {(inv.fileUrl || linkedRes || folder || bk === 'nicht_notwendig') && (
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {inv.fileUrl && (
                  <span className="text-slate-400" title="Beleg hinterlegt">
                    <Paperclip className="w-3 h-3" strokeWidth={2} />
                  </span>
                )}
                {linkedRes && (
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700">
                    {linkedRes.number}
                  </span>
                )}
                {folder && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-800 inline-flex items-center gap-0.5">
                    <Folder className="w-2.5 h-2.5" strokeWidth={2} />
                    {folder.name}
                  </span>
                )}
                {bk === 'nicht_notwendig' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    Nicht nötig
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            strokeWidth={1.75}
          />
        </div>

        <Collapse open={isExpanded}>
          <div className="px-3 pb-3 space-y-2.5 text-[11px]">
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-500">
              {inv.invoiceNumber && <span>Nr. {inv.invoiceNumber}</span>}
              {inv.category && <span>{inv.category}</span>}
              {inv.submittedBy?.name && <span>Eingereicht von {inv.submittedBy.name}</span>}
            </div>

            {linkedRes && (
              <div className="text-slate-600 truncate">
                Beschluss <span className="font-mono font-bold text-indigo-700">{linkedRes.number}</span> ·{' '}
                {linkedRes.title}
              </div>
            )}

            {onUpdateInvoiceFolder && !inv.hasResolution && (
              <label className="flex items-center gap-2">
                <span className="text-slate-500 shrink-0">Ordner</span>
                <select
                  value={inv.folderId || ''}
                  onChange={(e) => onUpdateInvoiceFolder(inv.id, e.target.value || undefined)}
                  className="flex-1 min-w-0 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-base sm:text-[11px] font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#003594]"
                >
                  <option value="">Kein Ordner</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => onSelectInvoice(inv.id)}
                className={`${smallButton} border border-slate-200 text-slate-700 hover:bg-slate-50`}
              >
                <Eye className="w-3 h-3" strokeWidth={1.75} />
                Details & Beleg
              </button>

              {onUpdateInvoiceBookkeepingStatus &&
                (bk === 'nicht_bearbeitet' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onUpdateInvoiceBookkeepingStatus(inv.id, 'bearbeitet')}
                      className={`${smallButton} bg-emerald-600 hover:bg-emerald-700 text-white`}
                    >
                      <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                      In Buchhaltung erledigt
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateInvoiceBookkeepingStatus(inv.id, 'nicht_notwendig')}
                      className={`${smallButton} border border-slate-200 text-slate-600 hover:bg-slate-50`}
                    >
                      <MinusCircle className="w-3 h-3" strokeWidth={1.75} />
                      Nicht nötig
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpdateInvoiceBookkeepingStatus(inv.id, 'nicht_bearbeitet')}
                    className={`${smallButton} border border-slate-200 text-slate-600 hover:bg-slate-50`}
                  >
                    <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
                    Wieder offen
                  </button>
                ))}
            </div>
          </div>
        </Collapse>
      </div>
    );
  };

  const renderExpense = (e: Subsidy) => {
    const file = e.costProofFile || e.proofFile;
    return (
      <button
        key={e.id}
        type="button"
        disabled={!file}
        onClick={() => {
          if (!file) return;
          const isImage = file.mimeType?.startsWith('image/');
          if (!file.dataUrl || isImage) setExpensePreview(file);
          else openDataUrl(file.dataUrl, file.name);
        }}
        className="w-full bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-2 text-left transition-colors enabled:hover:bg-slate-50 enabled:cursor-pointer disabled:opacity-70 wj-view-enter"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold text-slate-900 text-sm truncate">{e.eventName}</span>
            <span className="font-bold text-[#003594] text-sm shrink-0">{formatCurrency(e.amount)}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 truncate">
            {e.personName}
            {e.eventDate ? ` · ${formatDate(e.eventDate)}` : ''}
          </div>
        </div>
        {file ? (
          <Paperclip className="w-4 h-4 text-[#003594] shrink-0" strokeWidth={1.75} />
        ) : (
          <span className="text-[10px] text-slate-400 shrink-0">kein Beleg</span>
        )}
      </button>
    );
  };

  const emptyText =
    activeSection === 'auslagen'
      ? 'Keine Belege aus Auslagen.'
      : hasActiveFilters
      ? 'Keine Belege für diese Auswahl.'
      : activeSection === 'offen'
      ? 'Alle Belege sind in der Buchhaltung erledigt.'
      : 'Noch keine erledigten Belege.';

  return (
    <div ref={swipe.ref} className="space-y-4 max-w-5xl mx-auto">
      {/* Kopf */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-[#003594]" strokeWidth={1.75} />
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Belege</h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={exportCSV}
            className="p-2 sm:px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Aktuelle Liste als CSV exportieren"
          >
            <Download className="w-4 h-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewInvoice}
            id="invoices-new-btn"
            className="px-3 sm:px-4 py-2 rounded-xl bg-[#003594] hover:bg-[#00266B] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span>Hochladen</span>
          </button>
        </div>
      </div>

      {/* Reiter - per Tippen oder Wischen */}
      <StageTabs
        tabs={[
          { key: 'offen' as Section, label: 'Buchhaltung offen', count: openCount },
          { key: 'erledigt' as Section, label: 'Erledigt', count: invoices.length - openCount },
          ...(hasExpenses
            ? [
                {
                  key: 'auslagen' as Section,
                  label: 'Aus Auslagen',
                  count: expenses.length,
                  icon: <Wallet className="w-3.5 h-3.5" strokeWidth={1.75} />,
                },
              ]
            : []),
        ]}
        active={activeSection}
        onSelect={swipe.select}
      />

      {/* Filter - Beschluss, Ordner, Jahr, Monat und Ordner verwalten */}
      {activeSection !== 'auslagen' ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              hasActiveFilters ? 'bg-blue-50 border-blue-200 text-[#003594]' : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <Filter className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Filter{hasActiveFilters ? ' (aktiv)' : ''}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 px-1">
          <span>Nur zum Nachschlagen – bearbeitet werden Auslagen im Bereich Auslagen.</span>
          {onNavigateToExpenses && (
            <button
              type="button"
              onClick={onNavigateToExpenses}
              className="font-bold text-[#003594] hover:underline cursor-pointer shrink-0"
            >
              Zu den Auslagen
            </button>
          )}
        </div>
      )}

      <Collapse open={showFilters && activeSection !== 'auslagen'}>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Lieferant, Beschreibung, Nummer oder Name …"
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={filterResolution}
              onChange={(e) => setFilterResolution(e.target.value as 'all' | 'with' | 'without')}
              className={selectClass}
            >
              <option value="all">Mit & ohne Beschluss</option>
              <option value="with">Mit Beschluss</option>
              <option value="without">Ohne Beschluss</option>
            </select>
            <select value={filterFolder} onChange={(e) => setFilterFolder(e.target.value)} className={selectClass}>
              <option value="all">Alle Ordner</option>
              <option value="none">Ohne Ordner</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={selectClass}>
              <option value="all">Alle Jahre</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className={selectClass}>
              <option value="all">Alle Monate</option>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Filter zurücksetzen
              </button>
            ) : (
              <span />
            )}
            {(onCreateFolder || onDeleteFolder) && (
              <button
                type="button"
                onClick={() => setShowFolderAdmin((v) => !v)}
                className="text-[11px] font-bold text-[#003594] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Folder className="w-3.5 h-3.5" strokeWidth={1.75} />
                Ordner verwalten
              </button>
            )}
          </div>

          <Collapse open={showFolderAdmin}>
            <div className="pt-2.5 border-t border-slate-100 space-y-1.5">
              {folders.length === 0 && <p className="text-[11px] text-slate-400">Noch keine Ordner angelegt.</p>}
              {folders.map((f) => {
                const count = invoices.filter((i) => i.folderId === f.id).length;
                return (
                  <div key={f.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100">
                    <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={1.75} />
                    <span className="flex-1 min-w-0 truncate font-semibold text-slate-700">{f.name}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {count} {count === 1 ? 'Beleg' : 'Belege'}
                    </span>
                    {onDeleteFolder && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm(`Ordner „${f.name}" löschen? Die Belege darin bleiben erhalten, nur ohne Ordner.`)) return;
                          onDeleteFolder(f.id);
                          if (filterFolder === f.id) setFilterFolder('all');
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Ordner löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                );
              })}
              {onCreateFolder && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    placeholder="Neuer Ordner, z. B. IONOS oder IHK"
                    className="flex-1 min-w-0 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                  <button
                    type="button"
                    onClick={handleCreateFolder}
                    disabled={!newFolderName.trim()}
                    className={`${smallButton} bg-[#003594] hover:bg-[#00266B] text-white disabled:opacity-40`}
                  >
                    <FolderPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Anlegen
                  </button>
                </div>
              )}
            </div>
          </Collapse>
        </div>
      </Collapse>

      {/* Liste */}
      <div className="flex items-baseline justify-between px-1 text-[11px] text-slate-500">
        <span className="uppercase font-bold tracking-wider text-slate-400">
          {listCount} {listCount === 1 ? 'Beleg' : 'Belege'}
        </span>
        <span className="font-bold text-slate-900 text-sm">{formatCurrency(listSum)}</span>
      </div>

      <div key={activeSection} className={`space-y-1.5 ${swipe.slideClass}`}>
        {listCount === 0 && (
          <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs">
            {emptyText}
          </div>
        )}
        {activeSection === 'auslagen' ? expenses.map(renderExpense) : filteredInvoices.map(renderInvoice)}
      </div>

      <FilePreviewModal file={expensePreview} onClose={() => setExpensePreview(null)} />
    </div>
  );
};
