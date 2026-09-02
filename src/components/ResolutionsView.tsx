import React, { useState, useRef, useMemo } from 'react';
import { 
  BoardMember, 
  Resolution, 
  VoteType, 
  Invoice, 
  ResolutionStatus,
  ResolutionAttachment,
  BookkeepingStatus,
  SecuritySettings
} from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime, 
  formatExactTimestamp,
  getGermanMonthName,
  calculateVoteStats 
} from '../utils/formatters';
import { 
  Vote as VoteIcon, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  MessageSquare, 
  Send, 
  Receipt, 
  FileText, 
  Calendar, 
  User, 
  Search, 
  X,
  Clock, 
  Printer, 
  Check, 
  Sparkles,
  Mail,
  Paperclip,
  Download,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  AlertCircle,
  RefreshCw,
  FolderCheck,
  CheckCheck,
  ExternalLink,
  Eye,
  Filter,
  Archive,
  ArchiveRestore,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FirebaseSync } from '../utils/firebaseSync';
import { verifyDeleteCode } from '../utils/security';
import { downloadAttachment, getAttachmentType, formatFileSize } from '../utils/fileHelpers';

interface ResolutionsViewProps {
  currentMember: BoardMember;
  members: BoardMember[];
  resolutions: Resolution[];
  invoices: Invoice[];
  onVote: (resolutionId: string, vote: VoteType, note?: string) => void;
  onAddComment: (resolutionId: string, content: string) => void;
  onOpenNewResolution: () => void;
  selectedResolutionId?: string | null;
  onSelectResolution: (id: string | null) => void;
  onSelectInvoice: (id: string) => void;
  onOpenEmailVoteModal?: (resolution: Resolution) => void;
  onAddAttachment?: (resolutionId: string, attachment: ResolutionAttachment) => void;
  onUpdateResolutionBookkeepingStatus?: (resolutionId: string, status: BookkeepingStatus) => void;
  onUpdateInvoiceBookkeepingStatus?: (invoiceId: string, status: BookkeepingStatus) => void;
  onOpenNewInvoiceWithResolution?: (resolutionId: string) => void;
  onArchiveResolution?: (resolutionId: string, archive: boolean) => void;
  onDeleteResolution?: (resolutionId: string) => void;
  securitySettings?: SecuritySettings;
}

const MONTH_OPTIONS = [
  { value: 'all', label: 'Alle Monate' },
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

export const ResolutionsView: React.FC<ResolutionsViewProps> = ({
  currentMember,
  members,
  resolutions,
  invoices,
  onVote,
  onAddComment,
  onOpenNewResolution,
  selectedResolutionId,
  onSelectResolution,
  onSelectInvoice,
  onOpenEmailVoteModal,
  onAddAttachment,
  onUpdateResolutionBookkeepingStatus,
  onUpdateInvoiceBookkeepingStatus,
  onOpenNewInvoiceWithResolution,
  onArchiveResolution,
  onDeleteResolution,
  securitySettings,
}) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterBookkeeping, setFilterBookkeeping] = useState<string>('all'); // all, bearbeitet, nicht_bearbeitet, nicht_notwendig
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [commentInput, setCommentInput] = useState<string>('');
  const [voteNoteInput, setVoteNoteInput] = useState<string>('');
  const [showVoteNoteField, setShowVoteNoteField] = useState<boolean>(false);
  const detailFileInputRef = useRef<HTMLInputElement>(null);

  // Archiv: standardmaessig ausgeblendet, damit die laufende Liste kurz bleibt
  const [showArchived, setShowArchived] = useState<boolean>(false);

  /** Welcher Listeneintrag zeigt gerade seine Kurzinfo? */
  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  // Loeschen: erst nach Eingabe des Admin-Codes
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTargetId || !securitySettings) return;
    setIsDeleting(true);
    setDeleteError(null);
    const ok = await verifyDeleteCode(deleteCode, securitySettings);
    setIsDeleting(false);

    if (!ok) {
      setDeleteError('Code ungültig.');
      setDeleteCode('');
      return;
    }

    onDeleteResolution?.(deleteTargetId);
    setDeleteTargetId(null);
    setDeleteCode('');
  };

  const query = searchQuery.toLowerCase().trim();

  // Dynamically compute available years (e.g. 2026, 2025, 2024...)
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentY = new Date().getFullYear().toString();
    const prevY = (new Date().getFullYear() - 1).toString();
    yearsSet.add(currentY);
    yearsSet.add(prevY);

    resolutions.forEach((res) => {
      if (res.createdAt) {
        const d = new Date(res.createdAt);
        if (!isNaN(d.getFullYear())) {
          yearsSet.add(d.getFullYear().toString());
        }
      }
      const match = res.number.match(/20\d{2}/);
      if (match) {
        yearsSet.add(match[0]);
      }
    });

    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [resolutions]);

  const hasActiveFilters = filterStatus !== 'all' || filterYear !== 'all' || filterMonth !== 'all' || filterBookkeeping !== 'all' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setFilterStatus('all');
    setFilterYear('all');
    setFilterMonth('all');
    setFilterBookkeeping('all');
    setSearchQuery('');
  };

  // Comprehensive Full-Text Search across all resolution attributes, text, comments, attachments, votes, dates & years
  const filteredResolutions = useMemo(() => {
    return resolutions.filter((res) => {
      // 0. Archiv: nur zeigen, wenn ausdruecklich gewuenscht
      if (!!res.isArchived !== showArchived) return false;

      // 1. Status Filter
      if (filterStatus !== 'all' && res.status !== filterStatus) return false;

      // 2. Year Filter (e.g. 2025, 2026)
      if (filterYear !== 'all') {
        let matchYear = false;
        if (res.createdAt) {
          const d = new Date(res.createdAt);
          if (!isNaN(d.getFullYear()) && d.getFullYear().toString() === filterYear) {
            matchYear = true;
          }
        }
        if (res.number.includes(filterYear) || (filterYear.length === 4 && res.number.includes(`-${filterYear.slice(-2)}-`))) {
          matchYear = true;
        }
        if (!matchYear) return false;
      }

      // 3. Month Filter (01 = Jan, ..., 12 = Dez)
      if (filterMonth !== 'all') {
        if (!res.createdAt) return false;
        const d = new Date(res.createdAt);
        if (isNaN(d.getTime())) return false;
        const mStr = String(d.getMonth() + 1).padStart(2, '0');
        if (mStr !== filterMonth) return false;
      }

      // 4. Bookkeeping Status Filter
      if (filterBookkeeping !== 'all') {
        const bk = res.bookkeepingStatus || 'nicht_bearbeitet';
        if (bk !== filterBookkeeping) return false;
      }

      // 5. Query Search
      if (!query) return true;

      // Number & Title
      if (res.number.toLowerCase().includes(query)) return true;
      if (res.title.toLowerCase().includes(query)) return true;
      
      // Official motion text & description / reasoning
      if (res.motionText.toLowerCase().includes(query)) return true;
      if (res.description.toLowerCase().includes(query)) return true;

      // Applicant Name & Role
      if (res.applicant.name.toLowerCase().includes(query)) return true;
      if (res.applicant.role.toLowerCase().includes(query)) return true;

      // Budget
      if (res.requestedBudget && (String(res.requestedBudget).includes(query) || `${res.requestedBudget} €`.includes(query))) {
        return true;
      }

      // Date / Timestamp / Year / Month full-text match
      if (res.createdAt) {
        const d = new Date(res.createdAt);
        if (!isNaN(d.getTime())) {
          const formattedDate = formatDate(res.createdAt).toLowerCase();
          const formattedDateTime = formatDateTime(res.createdAt).toLowerCase();
          const exactTimestamp = formatExactTimestamp(res.createdAt).toLowerCase();
          const fullYear = d.getFullYear().toString();
          const shortYear = fullYear.slice(-2);
          const monthIdx = d.getMonth();
          const monthName = getGermanMonthName(monthIdx).toLowerCase();
          const monthNum = String(monthIdx + 1).padStart(2, '0');

          if (formattedDate.includes(query) || formattedDateTime.includes(query) || exactTimestamp.includes(query)) {
            return true;
          }
          if (monthName.includes(query)) return true;
          if (query === fullYear || query === shortYear || query === `jahr ${fullYear}` || query === `jahr ${shortYear}`) {
            return true;
          }
          if (query === `${monthNum}.${fullYear}` || query === `${monthNum}.${shortYear}` || query === `${fullYear}-${monthNum}`) {
            return true;
          }
        }
      }

      // Passed At match
      if (res.passedAt) {
        const pd = new Date(res.passedAt);
        if (!isNaN(pd.getTime())) {
          const fpd = formatDate(res.passedAt).toLowerCase();
          const fpdt = formatDateTime(res.passedAt).toLowerCase();
          if (fpd.includes(query) || fpdt.includes(query)) return true;
        }
      }

      // Comments (content & author name)
      const matchesComment = res.comments?.some(
        (c) => c.content.toLowerCase().includes(query) || c.authorName.toLowerCase().includes(query)
      );
      if (matchesComment) return true;

      // Votes & protocol notes
      const matchesVote = Object.entries(res.votes || {}).some(([memberId, voteEntry]) => {
        const v = voteEntry as { memberId: string; vote: VoteType; timestamp: string; note?: string };
        if (v?.note && v.note.toLowerCase().includes(query)) return true;
        const voter = members.find((m) => m.id === memberId);
        if (voter && voter.name.toLowerCase().includes(query)) return true;
        return false;
      });
      if (matchesVote) return true;

      // Attached files (file name & extension)
      if (res.attachments && res.attachments.some((a) => a.name.toLowerCase().includes(query))) {
        return true;
      }

      // Linked invoices
      const linked = invoices.filter((inv) => inv.resolutionId === res.id);
      const matchesInvoice = linked.some(
        (inv) =>
          inv.title.toLowerCase().includes(query) ||
          inv.vendor.toLowerCase().includes(query) ||
          inv.invoiceNumber.toLowerCase().includes(query)
      );
      if (matchesInvoice) return true;

      return false;
    });
  }, [resolutions, filterStatus, filterYear, filterMonth, filterBookkeeping, query, members, invoices, showArchived]);

  // Selected resolution (defaults to first if selectedResolutionId is set, or active one)
  /**
   * Wurde ein Beschluss bewusst angetippt? Nur dann wechselt das Smartphone in
   * die Detailansicht. Die Ersatzauswahl unten ist rein fuer breite Bildschirme
   * gedacht, damit die rechte Spalte nicht leer bleibt - sie darf auf dem Handy
   * nicht dazu fuehren, dass man nie zur Liste zurueckkommt.
   */
  const hasExplicitSelection = !!resolutions.find((r) => r.id === selectedResolutionId);

  const activeResolution =
    resolutions.find((r) => r.id === selectedResolutionId) ||
    (filteredResolutions.length > 0 ? filteredResolutions[0] : null);

  const handleVoteClick = (voteType: VoteType) => {
    if (!activeResolution) return;
    onVote(activeResolution.id, voteType, voteNoteInput.trim() || undefined);
    setVoteNoteInput('');
    setShowVoteNoteField(false);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResolution || !commentInput.trim()) return;
    onAddComment(activeResolution.id, commentInput.trim());
    setCommentInput('');
  };

  const handleDetailFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0 || !activeResolution || !onAddAttachment) return;
    Array.from(files).forEach((file) => {
      const type = getAttachmentType(file.name, file.type);
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAtt: ResolutionAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          size: formatFileSize(file.size),
          type,
          mimeType: file.type,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };
        onAddAttachment(activeResolution.id, newAtt);
      };
      reader.readAsDataURL(file);
    });
  };

  const currentMemberVote = activeResolution?.votes[currentMember.id]?.vote;
  const activeStats = activeResolution ? calculateVoteStats(activeResolution, members.length) : null;
  const linkedInvoices = activeResolution 
    ? invoices.filter((i) => i.resolutionId === activeResolution.id)
    : [];
  const linkedInvoicesTotal = linkedInvoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center space-x-2">
            <VoteIcon className="w-5 h-5 text-[#003594]" />
            <span>Beschlüsse</span>
          </h2>
        </div>

        <button
          onClick={onOpenNewResolution}
          id="resolutions-new-btn"
          className="flex items-center justify-center space-x-2 bg-[#003594] hover:bg-[#00266B] text-white font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs active:scale-98 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Beschluss fassen</span>
        </button>
      </div>

      {/* Archiv-Umschalter + Filter */}
      <div className="flex justify-end items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setShowArchived(!showArchived);
            onSelectResolution(null);
          }}
          className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            showArchived
              ? 'bg-slate-800 text-white border border-slate-800'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Archive className="w-4 h-4" strokeWidth={1.75} />
          <span>{showArchived ? 'Archiv' : 'Archiv'}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
            isFiltersExpanded || hasActiveFilters
              ? 'bg-[#003594] text-white border border-[#003594]'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filter & Suche {hasActiveFilters && '(Aktiv)'}</span>
          {isFiltersExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
        </button>
      </div>

      {/* Filter & Full-Text Search Bar with Year, Month, Status & Search */}
      {isFiltersExpanded && (
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 animate-in fade-in zoom-in-95 duration-200">
        {/* Row 1: Status Filters + Search Box */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Filters */}
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
            {[
              { id: 'all', label: 'Alle Beschlüsse' },
              { id: 'in_abstimmung', label: 'In Abstimmung' },
              { id: 'angenommen', label: 'Angenommen' },
              { id: 'abgelehnt', label: 'Abgelehnt' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  filterStatus === f.id
                    ? 'bg-[#003594] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Volltext-Suche */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#003594] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Suche: Jahr (2025, 2026), Monat, Datum, Text, Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-base sm:text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] focus:bg-white transition-all font-medium placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/80 transition-colors cursor-pointer"
                title="Suche zurücksetzen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Year Filter Buttons & Month Filter Dropdown */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Year selector */}
            <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-[#003594]" />
                <span>Jahr:</span>
              </span>
              <button
                type="button"
                onClick={() => setFilterYear('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterYear === 'all'
                    ? 'bg-white text-[#003594] shadow-2xs font-bold border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alle
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setFilterYear(yr)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterYear === yr
                      ? 'bg-[#003594] text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Month selector */}
            <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-[#003594]" />
              <label htmlFor="month-select" className="text-[11px] font-bold text-slate-500">
                Monat:
              </label>
              <select
                id="month-select"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-white border border-slate-200 text-slate-800 text-base sm:text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-[#003594] cursor-pointer"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Buchhaltung Status selector */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center space-x-1 shrink-0">
                <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Buchhaltung:</span>
              </span>
              <button
                type="button"
                onClick={() => setFilterBookkeeping('all')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filterBookkeeping === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alle
              </button>
              <button
                type="button"
                onClick={() => setFilterBookkeeping('bearbeitet')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  filterBookkeeping === 'bearbeitet'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
                title="In Buchhaltung verarbeitet"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Bearbeitet</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterBookkeeping('nicht_bearbeitet')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  filterBookkeeping === 'nicht_bearbeitet'
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50'
                }`}
                title="Noch nicht in Buchhaltung erfasst"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Offen</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterBookkeeping('nicht_notwendig')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                  filterBookkeeping === 'nicht_notwendig'
                    ? 'bg-slate-700 text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
                title="Nicht buchhaltungsrelevant"
              >
                <span>Nicht nötig</span>
              </button>
            </div>
          </div>

          {/* Active Filter summary and Reset button */}
          {hasActiveFilters && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-500 font-medium">
                Gefiltert: <strong className="text-slate-900">{filteredResolutions.length}</strong> von {resolutions.length}
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center space-x-1 text-xs font-bold text-[#003594] hover:text-[#00266B] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-blue-100"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Filter zurücksetzen</span>
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Main Split Layout: List on Left (1 Col), Selected Details on Right (2 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Linke Spalte: Liste. Auf dem Smartphone wird sie ausgeblendet,
            sobald ein Beschluss geoeffnet ist - sonst stuenden Liste und
            Detailansicht untereinander. */}
        <div className={`lg:col-span-5 space-y-3 ${hasExplicitSelection ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
              Beschlüsse ({filteredResolutions.length})
            </p>
            {searchQuery && (
              <span className="text-[11px] font-semibold text-[#003594] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Volltextfilter aktiv
              </span>
            )}
          </div>

          {filteredResolutions.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
              <p>Keine Beschlüsse für die Suchkriterien gefunden.</p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer text-[11px]"
                >
                  Suche zurücksetzen
                </button>
              )}
            </div>
          ) : (
            filteredResolutions.map((res) => {
              const isSelected = activeResolution?.id === res.id;
              const isExpanded = expandedListId === res.id;
              const stats = calculateVoteStats(res, members.length);
              const hasVoted = !!res.votes[currentMember.id];
              const myVote = res.votes[currentMember.id]?.vote;
              const isEligible =
                !res.eligibleVoterIds ||
                res.eligibleVoterIds.length === 0 ||
                res.eligibleVoterIds.includes(currentMember.id);
              const needsMyVote = res.status === 'in_abstimmung' && !hasVoted && isEligible;

              return (
                <div
                  key={res.id}
                  className={`rounded-xl border transition-all duration-200 wj-view-enter ${
                    isSelected
                      ? 'bg-blue-50/40 border-[#003594] ring-1 ring-[#003594]/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Kopfzeile: bewusst knapp - Nummer, Name, Status */}
                  <div className="flex items-center gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => onSelectResolution(res.id)}
                      className="flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-[#003594] shrink-0">
                          {res.number}
                        </span>
                        {needsMyVote && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 wj-pulse-soft" title="Deine Stimme fehlt" />
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
                        {res.title}
                      </div>
                    </button>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        res.status === 'angenommen'
                          ? 'bg-emerald-100 text-emerald-800'
                          : res.status === 'in_abstimmung'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {res.status === 'angenommen'
                        ? 'Angenommen'
                        : res.status === 'in_abstimmung'
                        ? 'Offen'
                        : 'Abgelehnt'}
                    </span>

                    <button
                      type="button"
                      onClick={() => setExpandedListId(isExpanded ? null : res.id)}
                      className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                      title={isExpanded ? 'Zuklappen' : 'Kurzinfo anzeigen'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        strokeWidth={1.75}
                      />
                    </button>
                  </div>

                  {/* Kurzinfo - nur auf Wunsch */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 space-y-2.5 text-[11px] wj-expand">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                        <span>{formatDate(res.createdAt)}</span>
                        <span>·</span>
                        <span>{res.applicant.name}</span>
                        {res.requestedBudget ? (
                          <>
                            <span>·</span>
                            <span className="font-semibold text-slate-700">
                              {formatCurrency(res.requestedBudget)}
                            </span>
                          </>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <span>
                          {stats.yesCount} Ja · {stats.noCount} Nein · {stats.abstainCount} Enth.
                        </span>
                        {hasVoted && (
                          <span className="text-emerald-700 font-semibold">
                            (du: {myVote === 'yes' ? 'Ja' : myVote === 'no' ? 'Nein' : 'Enthaltung'})
                          </span>
                        )}
                      </div>

                      {res.bookkeepingStatus === 'bearbeitet' && (
                        <div className="text-emerald-700 font-semibold">✓ Buchhaltung erledigt</div>
                      )}

                      {(() => {
                        const resInvs = invoices.filter((i) => i.resolutionId === res.id);
                        if (resInvs.length === 0) return null;
                        const sum = resInvs.reduce((acc, i) => acc + i.amount, 0);
                        return (
                          <div className="text-slate-600">
                            {resInvs.length} {resInvs.length === 1 ? 'Beleg' : 'Belege'} ·{' '}
                            {formatCurrency(sum)}
                          </div>
                        );
                      })()}

                      {/* Direkt abstimmen, ohne den Beschluss zu oeffnen */}
                      {needsMyVote && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => onVote(res.id, 'yes')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                          >
                            Ja
                          </button>
                          <button
                            type="button"
                            onClick={() => onVote(res.id, 'no')}
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                          >
                            Nein
                          </button>
                          <button
                            type="button"
                            onClick={() => onVote(res.id, 'abstain')}
                            className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                          >
                            Enthaltung
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectResolution(res.id)}
                        className="text-[#003594] font-semibold hover:underline cursor-pointer"
                      >
                        Beschluss öffnen →
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Rechte Spalte: Detailansicht des gewaehlten Beschlusses */}
        <div className={`lg:col-span-7 ${hasExplicitSelection ? '' : 'hidden lg:block'}`}>
          {activeResolution && activeStats ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-6">
              {/* Header Details: Nur Name und Nr oben */}
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-sm font-mono font-black text-[#003594] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md">
                    {activeResolution.number}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectResolution(null)}
                    className="lg:hidden px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    ← Zurück zur Liste
                  </button>
                </div>
                {/* Der Titel ist die erste Zeile des Beschlusstextes. Steht er
                    ohnehin gleich darunter im Wortlaut, waere eine Ueberschrift
                    nur eine gekuerzte Wiederholung. */}
                {!activeResolution.motionText
                  .trim()
                  .startsWith(activeResolution.title.replace(/\.\.\.$/, '').trim()) && (
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    {activeResolution.title}
                  </h2>
                )}
              </div>

              {/* Text, Wortlaut & Budget */}
              <div className="space-y-4 pt-2">
                {/* Zusatzbegruendung nur zeigen, wenn sie sich vom Wortlaut
                    unterscheidet - sonst stuende derselbe Text zweimal da. */}
                {activeResolution.description &&
                  activeResolution.description.trim() !== activeResolution.motionText.trim() && (
                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {activeResolution.description}
                    </p>
                  )}

                <div className="bg-slate-50 border-l-4 border-slate-300 p-3 rounded-r-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Antragswortlaut</span>
                  <p className="text-sm font-semibold text-slate-900 italic leading-relaxed whitespace-pre-wrap">
                    {activeResolution.motionText}
                  </p>
                </div>

                {activeResolution.requestedBudget && (
                  <div className="flex items-center justify-between text-sm py-2 border-y border-slate-100">
                    <span className="text-slate-600">Beantragtes Gesamtbudget:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(activeResolution.requestedBudget)}
                    </span>
                  </div>
                )}
              </div>

              {/* Auswahlmöglichkeiten unten: Meta, Status, Buchhaltung */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 space-y-4 mt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div className="flex flex-col space-y-1 text-xs text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Von <strong>{activeResolution.applicant.name}</strong></span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Erstellt: {new Date(activeResolution.createdAt || "").toLocaleDateString('de-DE')}</span>
                      {activeResolution.passedAt && (
                         <span className="text-emerald-700 ml-2 font-semibold flex items-center space-x-1">
                           <CheckCircle2 className="w-3 h-3" />
                           <span>Beschlossen: {new Date(activeResolution.passedAt).toLocaleDateString('de-DE')}</span>
                         </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {onOpenEmailVoteModal && (
                      <button
                        type="button"
                        onClick={() => onOpenEmailVoteModal(activeResolution)}
                        className="p-1.5 rounded-lg bg-blue-50 text-[#003594] hover:bg-blue-100 transition-colors cursor-pointer"
                        title="Per E-Mail einladen"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => window.print()}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Beschluss drucken"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                      activeResolution.status === 'angenommen'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeResolution.status === 'in_abstimmung'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {activeResolution.status === 'angenommen' ? 'Angenommen' : activeResolution.status === 'in_abstimmung' ? 'In Abstimmung' : 'Abgelehnt'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Buchhaltung & Kassenprüfung:</span>
                  <select
                    value={activeResolution.bookkeepingStatus || 'nicht_bearbeitet'}
                    onChange={(e) => onUpdateResolutionBookkeepingStatus?.(activeResolution.id, e.target.value as any)}
                    className={`text-xs font-bold py-1.5 pl-3 pr-7 rounded-lg border border-slate-200 shadow-sm cursor-pointer appearance-none bg-no-repeat focus:ring-2 focus:ring-offset-1 transition-colors ${
                      (activeResolution.bookkeepingStatus || 'nicht_bearbeitet') === 'bearbeitet'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : activeResolution.bookkeepingStatus === 'nicht_notwendig'
                        ? 'bg-slate-100 text-slate-700 border-slate-300'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='currentColor' class='w-4 h-4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9' /%3E%3C/svg%3E")`,
                      backgroundPosition: 'right 6px center',
                      backgroundSize: '14px'
                    }}
                  >
                    <option value="nicht_bearbeitet">Offen (Nicht bearbeitet)</option>
                    <option value="bearbeitet">✓ Bearbeitet</option>
                    <option value="nicht_notwendig">Nicht notwendig</option>
                  </select>
                </div>
              </div>

              {/* ANHÄNGE & DOKUMENTE (PDF, EXCEL, WORD, POWERPOINT ETC.) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-[#003594]" />
                    <h4 className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                      Anhänge & Dokumente ({activeResolution.attachments?.length || 0})
                    </h4>
                  </div>
                  
                  {/* Quick Upload Button */}
                  {onAddAttachment && (
                    <div>
                      <input
                        ref={detailFileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,.png,.jpg,.jpeg,.txt,.zip"
                        onChange={(e) => handleDetailFileUpload(e.target.files)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => detailFileInputRef.current?.click()}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#003594]" />
                        <span>Datei anhängen (Excel, Word, PDF)</span>
                      </button>
                    </div>
                  )}
                </div>

                {(!activeResolution.attachments || activeResolution.attachments.length === 0) ? (
                  <p className="text-xs text-slate-400 italic py-1">
                    Keine Dateianhänge für diesen Beschluss hinterlegt.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeResolution.attachments.map((att) => {
                      const isExcel = att.type === 'excel';
                      const isWord = att.type === 'word';
                      const isPdf = att.type === 'pdf';
                      const isImage = att.type === 'image';

                      return (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 rounded-xl transition-all group"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isExcel
                                ? 'bg-emerald-100 text-emerald-800'
                                : isWord
                                ? 'bg-blue-100 text-blue-800'
                                : isPdf
                                ? 'bg-rose-100 text-rose-800'
                                : isImage
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {isExcel ? (
                                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                              ) : isWord ? (
                                <File className="w-4 h-4 text-blue-700" />
                              ) : isPdf ? (
                                <FileText className="w-4 h-4 text-rose-700" />
                              ) : isImage ? (
                                <ImageIcon className="w-4 h-4 text-purple-700" />
                              ) : (
                                <File className="w-4 h-4 text-slate-700" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate text-xs group-hover:text-[#003594]">
                                {att.name}
                              </p>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                                <span>{att.size}</span>
                                <span>•</span>
                                <span className={`font-semibold ${
                                  isExcel ? 'text-emerald-700' : isWord ? 'text-blue-700' : isPdf ? 'text-rose-700' : 'text-slate-500'
                                }`}>
                                  {isExcel ? 'Excel' : isWord ? 'Word' : isPdf ? 'PDF' : isImage ? 'Bild' : 'Dokument'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => downloadAttachment(att)}
                            className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-[#003594] hover:border-blue-300 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                            title={`${att.name} herunterladen`}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Voting Action Section for Current Member */}
              {(() => {
                const isEligibleToVote = !activeResolution.eligibleVoterIds || activeResolution.eligibleVoterIds.length === 0 || activeResolution.eligibleVoterIds.includes(currentMember.id);

                if (!isEligibleToVote) {
                  return (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                      <div className="flex items-center space-x-2 text-slate-700 font-bold mb-1">
                        <AlertCircle className="w-4 h-4 text-slate-500" />
                        <span>Keine Stimmberechtigung bei diesem Beschluss</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Für diesen Beschlussantrag wurden gesonderte Stimmberechtigte festgelegt. Du hast hier beratende Funktion bzw. nimmst zur Kenntnis.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="bg-white border-2 border-[#003594]/20 rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs uppercase font-bold text-[#003594] tracking-wider">
                          Deine Stimmabgabe ({currentMember.name})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Rolle: {currentMember.role} • Stimmberechtigt
                        </p>
                      </div>
                      {currentMemberVote && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Stimme registriert: {currentMemberVote === 'yes' ? 'JA' : currentMemberVote === 'no' ? 'NEIN' : 'ENTHALTUNG'}</span>
                        </span>
                      )}
                    </div>

                    {/* Vote Buttons */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <button
                        onClick={() => handleVoteClick('yes')}
                        id="vote-btn-yes"
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                          currentMemberVote === 'yes'
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Zustimmen (Ja)</span>
                      </button>

                      <button
                        onClick={() => handleVoteClick('no')}
                        id="vote-btn-no"
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                          currentMemberVote === 'no'
                            ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                            : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Ablehnen (Nein)</span>
                      </button>

                      <button
                        onClick={() => handleVoteClick('abstain')}
                        id="vote-btn-abstain"
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                          currentMemberVote === 'abstain'
                            ? 'bg-slate-600 text-white shadow-sm ring-2 ring-slate-300'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        <MinusCircle className="w-4 h-4" />
                        <span>Enthalten</span>
                      </button>
                    </div>

                    {/* Optional vote note */}
                    <div className="mt-2.5">
                      {!showVoteNoteField ? (
                        <button
                          onClick={() => setShowVoteNoteField(true)}
                          className="text-[11px] text-slate-500 hover:text-[#003594] underline cursor-pointer"
                        >
                          + Optionale Begründungsnotiz zur Stimme hinzufügen
                        </button>
                      ) : (
                        <div className="mt-1 flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Kurze Protokollnotiz zu deiner Stimmabgabe..."
                            value={voteNoteInput}
                            onChange={(e) => setVoteNoteInput(e.target.value)}
                            className="flex-1 text-base sm:text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#003594]"
                          />
                          <button
                            onClick={() => setShowVoteNoteField(false)}
                            className="text-xs text-slate-400 hover:text-slate-600 px-2 cursor-pointer"
                          >
                            Schließen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Status & Quorum Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                    Abstimmungsverlauf & Quorum
                  </h4>
                  <span className="text-xs font-semibold text-slate-700">
                    {activeStats.totalVotesCast} von {members.length} Vorständen haben abgestimmt
                  </span>
                </div>

                {/* Bars */}
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-emerald-500 h-full transition-all" 
                    style={{ width: `${(activeStats.yesCount / members.length) * 100}%` }}
                    title={`Ja: ${activeStats.yesCount}`}
                  />
                  <div 
                    className="bg-rose-500 h-full transition-all" 
                    style={{ width: `${(activeStats.noCount / members.length) * 100}%` }}
                    title={`Nein: ${activeStats.noCount}`}
                  />
                  <div 
                    className="bg-slate-400 h-full transition-all" 
                    style={{ width: `${(activeStats.abstainCount / members.length) * 100}%` }}
                    title={`Enthaltung: ${activeStats.abstainCount}`}
                  />
                </div>

                {/* Quorum Note */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      <span>{activeStats.yesCount} Ja</span>
                    </span>
                    <span className="flex items-center space-x-1 text-rose-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                      <span>{activeStats.noCount} Nein</span>
                    </span>
                    <span className="flex items-center space-x-1 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                      <span>{activeStats.abstainCount} Enthaltung</span>
                    </span>
                  </div>

                  <span className="font-semibold text-slate-800">
                    Erforderliches Quorum: {activeStats.quorum} Stimmen ({activeStats.isQuorumReached ? '✓ Erreicht' : 'Ausstehend'})
                  </span>
                </div>

                {/* Board Members Vote Roster WITH PRECISE TIMESTAMP */}
                <div className="mt-3 pt-3 border-t border-slate-200/80">
                  <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                    Vorstandsmitglieder & Stimmabgabe-Protokoll
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {members.map((member) => {
                      const vote = activeResolution.votes[member.id];
                      return (
                        <div 
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 text-xs"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className={`w-6 h-6 rounded-md ${member.avatarColor} text-white font-bold text-[10px] flex items-center justify-center shrink-0`}>
                              {member.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate text-[11px]">
                                {member.name}
                              </p>
                              {vote?.timestamp ? (
                                <p className="text-[10px] text-slate-500 truncate flex items-center space-x-1">
                                  <Clock className="w-2.5 h-2.5 text-slate-400 inline" />
                                  <span>{formatDateTime(vote.timestamp)}</span>
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400 truncate">
                                  {member.role}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            {vote ? (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                vote.vote === 'yes' 
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : vote.vote === 'no'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}>
                                {vote.vote === 'yes' ? '✓ Ja' : vote.vote === 'no' ? '✗ Nein' : '— Enth.'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Ausstehend
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Linked Invoices Section (Rechnungen mit diesem Beschluss) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                      Zugeordnete Rechnungen & Belege ({linkedInvoices.length})
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">
                      Gebucht: {formatCurrency(linkedInvoicesTotal)}
                      {activeResolution.requestedBudget && (
                        <span className="text-slate-500 font-normal"> / {formatCurrency(activeResolution.requestedBudget)}</span>
                      )}
                    </span>
                    {onOpenNewInvoiceWithResolution && (
                      <button
                        type="button"
                        onClick={() => onOpenNewInvoiceWithResolution(activeResolution.id)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                        title="Rechnung oder Beleg direkt diesem Beschluss zuordnen"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Rechnung zuordnen</span>
                      </button>
                    )}
                  </div>
                </div>

                {linkedInvoices.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl p-4 text-center border border-dashed border-slate-200 space-y-2">
                    <p className="text-xs text-slate-500">
                      Bisher wurden keine Rechnungen oder Belege diesem Beschluss zugeordnet.
                    </p>
                    {onOpenNewInvoiceWithResolution && (
                      <button
                        type="button"
                        onClick={() => onOpenNewInvoiceWithResolution(activeResolution.id)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#003594] hover:bg-[#00266B] text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Jetzt Rechnung für diesen Beschluss hochladen</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedInvoices.map((inv) => {
                      const invBkStatus = inv.bookkeepingStatus || 'nicht_bearbeitet';
                      return (
                        <div
                          key={inv.id}
                          onClick={() => onSelectInvoice(inv.id)}
                          className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/40 border border-slate-200 cursor-pointer transition-all hover:shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-slate-900 hover:text-[#003594] transition-colors">
                                  {inv.vendor} • {inv.title}
                                </span>
                                {inv.fileUrl && (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded flex items-center space-x-0.5">
                                    <Eye className="w-3 h-3" />
                                    <span>PDF/Beleg</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Rechnungs-Nr: <strong className="text-slate-700">{inv.invoiceNumber}</strong> • Datum: {formatDate(inv.date)} • Eingereicht von: {inv.submittedBy.name}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-sm text-slate-900 block">
                                {formatCurrency(inv.amount)}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                inv.status === 'ausgezahlt' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {inv.status}
                              </span>
                            </div>
                          </div>

                          {/* Buchhaltungs-Status Umschalter pro Rechnung */}
                          <div 
                            className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[11px] text-slate-500 font-semibold flex items-center space-x-1">
                              <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Buchhaltung:</span>
                            </span>

                            <div className="flex items-center space-x-1">
                              <button
                                type="button"
                                onClick={() => onUpdateInvoiceBookkeepingStatus?.(inv.id, 'bearbeitet')}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer flex items-center space-x-1 ${
                                  invBkStatus === 'bearbeitet'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
                                }`}
                                title="In Buchhaltung verarbeitet"
                              >
                                <Check className="w-3 h-3" />
                                <span>Bearbeitet</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onUpdateInvoiceBookkeepingStatus?.(inv.id, 'nicht_bearbeitet')}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer flex items-center space-x-1 ${
                                  invBkStatus === 'nicht_bearbeitet'
                                    ? 'bg-amber-600 text-white shadow-2xs'
                                    : 'bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-slate-200'
                                }`}
                                title="Noch nicht in Buchhaltung erfasst"
                              >
                                <Clock className="w-3 h-3" />
                                <span>Offen</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onUpdateInvoiceBookkeepingStatus?.(inv.id, 'nicht_notwendig')}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer flex items-center space-x-1 ${
                                  invBkStatus === 'nicht_notwendig'
                                    ? 'bg-slate-700 text-white shadow-2xs'
                                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                                }`}
                                title="Nicht buchhaltungsrelevant"
                              >
                                <span>Nicht nötig</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Comments & Discussion Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2 text-slate-700">
                  <MessageSquare className="w-4 h-4 text-[#003594]" />
                  <h4 className="text-xs uppercase font-bold tracking-wider">
                    Vorstands-Kommentare & Protokollnotizen ({activeResolution.comments.length})
                  </h4>
                </div>

                {/* Comment list */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto">
                  {activeResolution.comments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      Noch keine Kommentare vorhanden. Schreibe eine Frage oder Notiz zum Beschluss.
                    </p>
                  ) : (
                    activeResolution.comments.map((comm) => (
                      <div key={comm.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800">
                            {comm.authorName} <span className="font-normal text-slate-500">({comm.authorRole})</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(comm.timestamp)}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">
                          {comm.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input Form */}
                <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2 pt-2">
                  <input
                    type="text"
                    placeholder="Kommentar oder Frage zum Beschluss schreiben..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 text-base sm:text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                  <button
                    type="submit"
                    disabled={!commentInput.trim()}
                    className="p-2 rounded-xl bg-[#003594] text-white hover:bg-[#00266B] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Archivieren / endgueltig loeschen */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onArchiveResolution?.(activeResolution.id, !activeResolution.isArchived)
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {activeResolution.isArchived ? (
                    <>
                      <ArchiveRestore className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Aus dem Archiv holen</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Archivieren</span>
                    </>
                  )}
                </button>

                {/* Loeschen erst nach dem Archivieren - so kann nichts
                    versehentlich aus der laufenden Liste verschwinden. */}
                {activeResolution.isArchived && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTargetId(activeResolution.id);
                      setDeleteCode('');
                      setDeleteError(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Endgültig löschen</span>
                  </button>
                )}

                {activeResolution.isArchived && activeResolution.archivedAt && (
                  <span className="text-[11px] text-slate-400">
                    Archiviert am {formatDate(activeResolution.archivedAt)}
                    {activeResolution.archivedBy ? ` von ${activeResolution.archivedBy}` : ''}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm">
              Wähle einen Beschluss aus der linken Liste aus, um die Details, Abstimmungen und Kommentare zu sehen.
            </div>
          )}
        </div>
      </div>

      {/* Endgueltiges Loeschen - nur mit Admin-Code */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" strokeWidth={1.75} />
            </div>

            <h3 className="mt-4 text-sm font-bold text-slate-900 text-center">
              Beschluss endgültig löschen
            </h3>
            <p className="mt-1.5 text-[12px] text-slate-500 text-center leading-relaxed">
              Der Beschluss wird mit allen Stimmen, Kommentaren und Anhängen
              unwiderruflich entfernt. Zur Bestätigung den Admin-Code eingeben.
            </p>

            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={deleteCode}
              onChange={(e) => {
                setDeleteCode(e.target.value);
                setDeleteError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void confirmDelete();
              }}
              placeholder="Admin-Code"
              className="mt-4 w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-base sm:text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
            />

            {deleteError && (
              <div className="mt-2 text-center text-[12px] font-semibold text-rose-600">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetId(null);
                  setDeleteCode('');
                  setDeleteError(null);
                }}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={!deleteCode.trim() || isDeleting}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-40 transition-colors cursor-pointer"
              >
                {isDeleting ? 'Prüfe …' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
