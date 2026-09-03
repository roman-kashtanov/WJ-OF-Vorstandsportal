import React from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import {
  BoardMember, 
  Invoice, 
  Resolution, 
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
  X, 
  Receipt, 
  Download, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  User, 
  Building2, 
  Layers, 
  Tag, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FolderCheck,
  Folder,
  Clock,
  MinusCircle
} from 'lucide-react';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  currentMember: BoardMember;
  resolutions: Resolution[];
  folders?: InvoiceFolder[];
  onUpdateStatus: (invoiceId: string, status: InvoiceStatus) => void;
  onToggleBookkeepingRecorded?: (invoiceId: string, isRecorded: boolean) => void;
  onUpdateBookkeepingStatus?: (invoiceId: string, status: BookkeepingStatus) => void;
  onSelectResolution: (resId: string) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  currentMember,
  resolutions,
  folders = [],
  onUpdateStatus,
  onToggleBookkeepingRecorded,
  onUpdateBookkeepingStatus,
  onSelectResolution,
}) => {
  useBodyScrollLock(!!invoice);
  if (!invoice) return null;

  const linkedResolution = invoice.resolutionId 
    ? resolutions.find((r) => r.id === invoice.resolutionId)
    : undefined;

  const folder = invoice.folderId ? folders.find((f) => f.id === invoice.folderId) : undefined;
  const currentBkStatus = invoice.bookkeepingStatus || (invoice.isBookkeepingRecorded ? 'bearbeitet' : 'nicht_bearbeitet');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0A1E42] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Receipt className="w-5 h-5 text-[#00A3E0]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-[#00A3E0] bg-blue-900/60 px-2 py-0.5 rounded">
                  {invoice.invoiceNumber}
                </span>
                <span className="text-xs text-slate-300">
                  {invoice.category}
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg mt-0.5">
                {invoice.vendor}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          {/* Main Info Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Rechnungsbetrag</span>
              <span className="font-black text-slate-900 text-lg sm:text-xl text-[#003594]">
                {formatCurrency(invoice.amount)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Belegdatum</span>
              <span className="font-bold text-slate-900 text-sm">
                {formatDate(invoice.date)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Ordner / Zuordnung</span>
              <span className="font-bold text-slate-900 text-xs flex items-center space-x-1 mt-0.5">
                {folder ? (
                  <span className="flex items-center space-x-1 text-[#003594]">
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                    <span>{folder.name}</span>
                  </span>
                ) : invoice.hasResolution ? (
                  <span className="text-emerald-700">✓ Mit Beschluss</span>
                ) : (
                  <span className="text-slate-600">Ohne Beschluss</span>
                )}
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Bearbeitungsstatus</span>
              <span className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded-full mt-1 ${
                invoice.status === 'ausgezahlt'
                  ? 'bg-emerald-100 text-emerald-800'
                  : invoice.status === 'freigegeben'
                  ? 'bg-blue-100 text-blue-800'
                  : invoice.status === 'geprueft'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* WJ Buchhaltung & Kassenprüfung 3-State Block */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 mt-0.5">
                  <FolderCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Buchhaltung & DATEV / Kassenprüfung:
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      currentBkStatus === 'bearbeitet'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentBkStatus === 'nicht_bearbeitet'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {currentBkStatus === 'bearbeitet' ? '✓ Bearbeitet' : currentBkStatus === 'nicht_bearbeitet' ? 'Offen' : 'Nicht notwendig'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {currentBkStatus === 'bearbeitet' 
                      ? `In der Buchhaltungssoftware / DATEV erfasst${invoice.bookkeepingRecordedBy ? ` von ${invoice.bookkeepingRecordedBy}` : ''}${invoice.bookkeepingRecordedAt ? ` am ${formatDateTime(invoice.bookkeepingRecordedAt)}` : ''}.`
                      : currentBkStatus === 'nicht_bearbeitet'
                      ? 'Beleg noch nicht in DATEV / Buchhaltungssoftware des Schatzmeisters eingepflegt.'
                      : 'Für diesen Beleg ist keine Buchhaltungserfassung erforderlich.'}
                  </p>
                </div>
              </div>

                            {/* Status Dropdown */}
              <div className="shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
                <select
                  value={currentBkStatus}
                  onChange={(e) => onUpdateBookkeepingStatus?.(invoice.id, e.target.value as BookkeepingStatus)}
                  className={`w-full sm:w-auto text-xs font-bold py-2 pl-3 pr-8 rounded-xl border border-slate-200 shadow-sm cursor-pointer appearance-none bg-no-repeat focus:ring-2 focus:ring-offset-1 transition-colors ${
                    currentBkStatus === 'bearbeitet'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-500'
                      : currentBkStatus === 'nicht_notwendig'
                      ? 'bg-slate-100 text-slate-700 border-slate-300 focus:ring-slate-500'
                      : 'bg-amber-50 text-amber-800 border-amber-200 focus:ring-amber-500'
                  }`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke-width='2' stroke='currentColor' class='w-4 h-4'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9' /%3E%3C/svg%3E")`,
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '14px'
                  }}
                >
                  <option value="nicht_bearbeitet">Offen (Nicht bearbeitet)</option>
                  <option value="bearbeitet">✓ Bearbeitet in DATEV</option>
                  <option value="nicht_notwendig">Nicht notwendig</option>
                </select>
              </div>
            </div>
          </div>

          {/* Details & Notes */}
          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                {invoice.title}
              </h4>
              <p className="text-slate-500 text-xs mt-0.5">
                Eingereicht von: <strong>{invoice.submittedBy.name}</strong> ({invoice.submittedBy.role}) am {formatDateTime(invoice.createdAt)}
              </p>
            </div>

            {invoice.notes && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-slate-800">
                <span className="font-bold text-amber-900 block text-[11px] uppercase tracking-wider mb-1">
                  Notiz des Einreichers:
                </span>
                <p className="text-xs leading-relaxed">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>

          {/* Resolution Link Box */}
          {invoice.hasResolution && linkedResolution && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-1.5 text-indigo-900 font-bold text-xs">
                  <FileText className="w-4 h-4 text-indigo-700" />
                  <span>Zugeordneter Vorstandsbeschluss: {linkedResolution.number}</span>
                </div>
                <p className="text-xs text-indigo-950 font-semibold mt-0.5">
                  {linkedResolution.title}
                </p>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Beschlossenes Budget: {linkedResolution.requestedBudget ? formatCurrency(linkedResolution.requestedBudget) : 'Nicht spezifiziert'}
                </p>
              </div>

              <button
                onClick={() => {
                  onSelectResolution(linkedResolution.id);
                  onClose();
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shrink-0 cursor-pointer"
              >
                <span>Zum Beschluss</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Receipt Image / File Preview */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 text-xs">
                Belegdatei: {invoice.fileName || 'Rechnung.pdf'} ({invoice.fileSize || 'Standard'})
              </span>
              {invoice.fileUrl && (
                <a
                  href={invoice.fileUrl}
                  download={invoice.fileName || 'Rechnung.png'}
                  className="text-xs font-semibold text-[#003594] hover:underline flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Beleg herunterladen</span>
                </a>
              )}
            </div>

            {invoice.fileUrl && invoice.fileType === 'image' ? (
              <div className="mt-2 bg-white rounded-lg p-2 border border-slate-200 flex justify-center max-h-72 overflow-hidden">
                <img
                  src={invoice.fileUrl}
                  alt={invoice.title}
                  className="max-h-64 object-contain rounded"
                />
              </div>
            ) : (
              <div className="py-6 text-center bg-white rounded-lg border border-slate-200 space-y-2">
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">
                  {invoice.fileName || 'PDF Belegdatei im Archiv'}
                </p>
                <p className="text-[10px] text-slate-400">
                  Digital hinterlegt für Kassenprüfung und IHK Nachweis
                </p>
              </div>
            )}
          </div>

          {/* Workflow Status Modification */}
          <div className="pt-2 border-t border-slate-200">
            <span className="block font-bold text-slate-700 text-xs mb-2">
              Status ändern (Schatzmeister & Vorstand):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['eingereicht', 'geprueft', 'freigegeben', 'ausgezahlt'] as InvoiceStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => onUpdateStatus(invoice.id, st)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                    invoice.status === st
                      ? 'bg-[#003594] text-white ring-2 ring-blue-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ausgezahlt' ? '✓ Ausgezahlt' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 text-white font-semibold text-xs hover:bg-slate-900 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
