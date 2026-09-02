import React, { useState, useMemo } from 'react';
import { 
  BoardMember, 
  Invoice, 
  Resolution, 
  InvoiceCategory, 
  InvoiceStatus,
  BookkeepingStatus,
  InvoiceFolder
} from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime 
} from '../utils/formatters';
import { 
  Receipt, 
  Plus, 
  Search, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock, 
  MinusCircle,
  Layers, 
  Calendar, 
  Eye, 
  Folder, 
  FolderPlus, 
  Trash2, 
  Filter, 
  X,
  FileCheck,
  ChevronRight,
  ChevronDown,
  Sparkles
} from 'lucide-react';

interface InvoicesViewProps {
  currentMember: BoardMember;
  members: BoardMember[];
  invoices: Invoice[];
  resolutions: Resolution[];
  folders?: InvoiceFolder[];
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

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  currentMember,
  members,
  invoices,
  resolutions,
  folders = [],
  onOpenNewInvoice,
  onSelectInvoice,
  onUpdateInvoiceStatus,
  onToggleBookkeepingRecorded,
  onUpdateInvoiceBookkeepingStatus,
  onCreateFolder,
  onDeleteFolder,
  onUpdateInvoiceFolder,
  onOpenInvoiceRequestModal,
}) => {
  // Main view scope: 'without_res' (default focus), 'all', or 'with_res'
  const [scopeTab, setScopeTab] = useState<'without_res' | 'all' | 'with_res'>('without_res');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all'); // 'all', 'none', or folder.id
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterBookkeeping, setFilterBookkeeping] = useState<'all' | BookkeepingStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const hasActiveFilters =
    filterYear !== 'all' ||
    filterMonth !== 'all' ||
    filterBookkeeping !== 'all' ||
    searchQuery.trim() !== '';

  // Folder creation modal/popover
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Extract unique years from invoices
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.date) {
        const y = inv.date.split('-')[0];
        if (y) years.add(y);
      }
    });
    return Array.from(years).sort().reverse();
  }, [invoices]);

  const months = [
    { value: '01', label: 'Jan' },
    { value: '02', label: 'Feb' },
    { value: '03', label: 'Mär' },
    { value: '04', label: 'Apr' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
    { value: '08', label: 'Aug' },
    { value: '09', label: 'Sep' },
    { value: '10', label: 'Okt' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dez' },
  ];

  const handleCreateNewFolder = () => {
    if (!newFolderName.trim() || !onCreateFolder) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Scope filter
      if (scopeTab === 'without_res' && inv.hasResolution) return false;
      if (scopeTab === 'with_res' && !inv.hasResolution) return false;

      // Folder filter
      if (selectedFolderId !== 'all') {
        if (selectedFolderId === 'none' && inv.folderId) return false;
        if (selectedFolderId !== 'none' && inv.folderId !== selectedFolderId) return false;
      }

      // Year filter
      if (filterYear !== 'all' && inv.date) {
        if (!inv.date.startsWith(filterYear)) return false;
      }

      // Month filter
      if (filterMonth !== 'all' && inv.date) {
        const parts = inv.date.split('-');
        if (parts[1] !== filterMonth) return false;
      }

      // Bookkeeping filter (3 options: bearbeitet, nicht_bearbeitet, nicht_notwendig)
      if (filterBookkeeping !== 'all') {
        const status = inv.bookkeepingStatus || (inv.isBookkeepingRecorded ? 'bearbeitet' : 'nicht_bearbeitet');
        if (status !== filterBookkeeping) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVendor = inv.vendor?.toLowerCase().includes(q);
        const matchTitle = inv.title?.toLowerCase().includes(q);
        const matchNumber = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchSubmitter = inv.submittedBy?.name.toLowerCase().includes(q);
        return matchVendor || matchTitle || matchNumber || matchSubmitter;
      }

      return true;
    });
  }, [invoices, scopeTab, selectedFolderId, filterYear, filterMonth, filterBookkeeping, searchQuery]);

  const totalSum = useMemo(() => {
    return filteredInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [filteredInvoices]);

  const withoutResCount = useMemo(() => invoices.filter((i) => !i.hasResolution).length, [invoices]);
  const withResCount = useMemo(() => invoices.filter((i) => i.hasResolution).length, [invoices]);

  const exportCSV = () => {
    const headers = ['Belegnummer', 'Lieferant / Empfänger', 'Beschreibung', 'Betrag (EUR)', 'Belegdatum', 'Ordner', 'Buchhaltungs-Status', 'Typ'];
    const rows = filteredInvoices.map((inv) => {
      const folderName = inv.folderId ? folders.find((f) => f.id === inv.folderId)?.name || 'Ordner' : 'Ohne Ordner';
      const bkStatus = inv.bookkeepingStatus || (inv.isBookkeepingRecorded ? 'bearbeitet' : 'nicht_bearbeitet');
      return [
        `"${inv.invoiceNumber}"`,
        `"${inv.vendor}"`,
        `"${inv.title}"`,
        inv.amount.toFixed(2),
        `"${inv.date}"`,
        `"${folderName}"`,
        `"${bkStatus}"`,
        inv.hasResolution ? '"Mit Beschluss"' : '"Ohne Beschluss"',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `WJ_Belege_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Receipt className="w-5 h-5 text-[#003594]" />
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Belege
          </h2>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <button
            onClick={exportCSV}
            className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
            title="CSV Exportieren"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={onOpenNewInvoice}
            id="invoices-new-btn"
            className="flex items-center space-x-1 bg-[#003594] hover:bg-[#00266B] text-white font-bold px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Rechnung hochladen</span>
          </button>
        </div>
      </div>

      {/* Primary Scope Tabs */}
      <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
        <button
          onClick={() => setScopeTab('without_res')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5 ${
            scopeTab === 'without_res'
              ? 'bg-white text-[#003594] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-amber-500" />
          <span>Ohne Beschluss</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${scopeTab === 'without_res' ? 'bg-blue-100 text-[#003594]' : 'bg-slate-200 text-slate-600'}`}>
            {withoutResCount}
          </span>
        </button>

        <button
          onClick={() => setScopeTab('all')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5 ${
            scopeTab === 'all'
              ? 'bg-white text-[#003594] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-slate-500" />
          <span>Alle</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${scopeTab === 'all' ? 'bg-blue-100 text-[#003594]' : 'bg-slate-200 text-slate-600'}`}>
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setScopeTab('with_res')}
          className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5 ${
            scopeTab === 'with_res'
              ? 'bg-white text-[#003594] shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          <span>Mit Beschluss</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${scopeTab === 'with_res' ? 'bg-blue-100 text-[#003594]' : 'bg-slate-200 text-slate-600'}`}>
            {withResCount}
          </span>
        </button>
      </div>

      {/* Folders Bar (Quick navigation chips like Ionos, Hosting, IHK, etc.) */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            <span>Ordner</span>
          </span>

          {onCreateFolder && (
            <button
              onClick={() => setIsAddingFolder(!isAddingFolder)}
              className="text-xs font-bold text-[#003594] hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{isAddingFolder ? 'Abbrechen' : '+ Neuer Ordner'}</span>
            </button>
          )}
        </div>

        {/* Add Folder Inline Input */}
        {isAddingFolder && (
          <div className="flex items-center space-x-2 pt-1 pb-1 animate-in fade-in">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNewFolder()}
              placeholder="Ordnername (z.B. Ionos, Zoom, Hosting...)"
              className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594]"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreateNewFolder}
              disabled={!newFolderName.trim()}
              className="px-3 py-1.5 bg-[#003594] hover:bg-[#00266B] text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
            >
              Erstellen
            </button>
          </div>
        )}

        {/* Folder Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedFolderId('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedFolderId === 'all'
                ? 'bg-[#003594] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Alle Ordner
          </button>

          {folders.map((f) => {
            const countInFolder = invoices.filter((i) => i.folderId === f.id).length;
            const isSelected = selectedFolderId === f.id;
            return (
              <div key={f.id} className="relative group shrink-0">
                <button
                  onClick={() => setSelectedFolderId(f.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-900'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>{f.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-amber-800 text-amber-100' : 'bg-slate-200 text-slate-600'}`}>
                    {countInFolder}
                  </span>
                </button>

                {onDeleteFolder && isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Ordner "${f.name}" löschen?`)) {
                        onDeleteFolder(f.id);
                        setSelectedFolderId('all');
                      }
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white p-0.5 rounded-full hover:bg-rose-700 transition-colors shadow-2xs"
                    title="Ordner löschen"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => setSelectedFolderId('none')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedFolderId === 'none'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Ohne Ordner
          </button>
        </div>
      </div>

      {/* Filter & Suche - eingeklappt, damit auf dem Smartphone die Belege
          sofort sichtbar sind statt einer Filterwand. */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors ${
            hasActiveFilters
              ? 'bg-blue-50 border-blue-200 text-[#003594]'
              : 'bg-white border-slate-200 text-slate-600'
          }`}
        >
          <Filter className="w-3.5 h-3.5" strokeWidth={1.75} />
          <span>Filter & Suche{hasActiveFilters ? ' (aktiv)' : ''}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 text-xs">
        
        {/* Row 1: Search & Buchhaltung 3-Status Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Lieferant, Betrag oder Beleg suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
            />
          </div>

          {/* 3-State Buchhaltung Filter Switcher */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setFilterBookkeeping('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterBookkeeping === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Buchhaltung: Alle
            </button>
            <button
              onClick={() => setFilterBookkeeping('bearbeitet')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                filterBookkeeping === 'bearbeitet'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Bearbeitet</span>
            </button>
            <button
              onClick={() => setFilterBookkeeping('nicht_bearbeitet')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                filterBookkeeping === 'nicht_bearbeitet'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Offen</span>
            </button>
            <button
              onClick={() => setFilterBookkeeping('nicht_notwendig')}
              className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                filterBookkeeping === 'nicht_notwendig'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MinusCircle className="w-3 h-3" />
              <span>Nicht nötig</span>
            </button>
          </div>
        </div>

        {/* Row 2: Year & Month Filter */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
          <div className="flex items-center space-x-1 font-bold text-slate-600 shrink-0 mr-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Jahr:</span>
          </div>

          <button
            onClick={() => setFilterYear('all')}
            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
              filterYear === 'all' ? 'bg-[#003594] text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Alle
          </button>

          {availableYears.map((yr) => (
            <button
              key={yr}
              onClick={() => setFilterYear(yr)}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                filterYear === yr ? 'bg-[#003594] text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {yr}
            </button>
          ))}

          <span className="text-slate-300 mx-1">|</span>

          <div className="flex items-center space-x-1 font-bold text-slate-600 shrink-0">
            <span>Monat:</span>
          </div>

          <button
            onClick={() => setFilterMonth('all')}
            className={`px-2 py-0.5 rounded-md font-bold text-[11px] cursor-pointer ${
              filterMonth === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Alle
          </button>

          {months.map((m) => (
            <button
              key={m.value}
              onClick={() => setFilterMonth(m.value)}
              className={`px-1.5 py-0.5 rounded-md font-bold text-[11px] cursor-pointer ${
                filterMonth === m.value ? 'bg-[#003594] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {m.label}
            </button>
          ))}

          {(filterYear !== 'all' || filterMonth !== 'all' || filterBookkeeping !== 'all' || searchQuery.trim() || selectedFolderId !== 'all') && (
            <button
              onClick={() => {
                setFilterYear('all');
                setFilterMonth('all');
                setFilterBookkeeping('all');
                setSelectedFolderId('all');
                setSearchQuery('');
              }}
              className="ml-auto text-rose-600 hover:text-rose-800 font-bold text-[11px] flex items-center space-x-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Filter zurücksetzen</span>
            </button>
          )}
        </div>
      </div>
      )}

      {/* Summary Header */}
      <div className="flex items-center justify-between px-1 text-xs text-slate-600">
        <span className="font-semibold">
          {filteredInvoices.length} Belege gefunden
        </span>
        <span className="font-black text-slate-900 text-sm">
          Summe: {formatCurrency(totalSum)}
        </span>
      </div>

      {/* Invoices List / Cards View */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
          <Receipt className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="font-bold text-slate-700 text-xs">
            Keine Belege für die gewählten Filter vorhanden
          </p>
          <p className="text-[11px] text-slate-400">
            Lade eine neue Rechnung hoch oder passe die Filter an.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredInvoices.map((inv) => {
            const folder = inv.folderId ? folders.find((f) => f.id === inv.folderId) : undefined;
            const currentBk = inv.bookkeepingStatus || (inv.isBookkeepingRecorded ? 'bearbeitet' : 'nicht_bearbeitet');
            const linkedRes = inv.resolutionId ? resolutions.find((r) => r.id === inv.resolutionId) : undefined;

            return (
              <div
                key={inv.id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs hover:border-[#003594]/40 hover:shadow-sm transition-all duration-200 flex flex-col justify-between gap-3 wj-view-enter"
              >
                {/* Kopf: Lieferant und Betrag - das Wichtigste zuerst */}
                <button
                  type="button"
                  onClick={() => onSelectInvoice(inv.id)}
                  className="text-left cursor-pointer space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {inv.vendor}
                    </span>
                    <span className="font-bold text-[#003594] text-sm shrink-0">
                      {formatCurrency(inv.amount)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="text-slate-500 truncate">{inv.title}</span>
                    <span className="text-slate-400 shrink-0">{formatDate(inv.date)}</span>
                  </div>

                  {/* Zuordnung nur zeigen, wenn es eine gibt */}
                  {(folder || linkedRes) && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {folder && (
                        <span className="text-[10px] text-amber-700 font-semibold">
                          {folder.name}
                        </span>
                      )}
                      {folder && linkedRes && <span className="text-[10px] text-slate-300">·</span>}
                      {linkedRes && (
                        <span className="text-[10px] text-indigo-700 font-semibold font-mono">
                          {linkedRes.number}
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {/* Fuss: Buchhaltung als ein Auswahlmenue statt dreier Knoepfe */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={currentBk}
                    onChange={(e) =>
                      onUpdateInvoiceBookkeepingStatus?.(inv.id, e.target.value as BookkeepingStatus)
                    }
                    className={`flex-1 min-w-0 text-[11px] font-semibold rounded-lg px-2 py-1.5 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#003594] ${
                      currentBk === 'bearbeitet'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : currentBk === 'nicht_notwendig'
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    <option value="nicht_bearbeitet">Buchhaltung offen</option>
                    <option value="bearbeitet">Buchhaltung erledigt</option>
                    <option value="nicht_notwendig">Nicht nötig</option>
                  </select>

                  {onUpdateInvoiceFolder && !inv.hasResolution && (
                    <select
                      value={inv.folderId || ''}
                      onChange={(e) => onUpdateInvoiceFolder(inv.id, e.target.value || undefined)}
                      className="flex-1 min-w-0 text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#003594] cursor-pointer"
                    >
                      <option value="">Kein Ordner</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
