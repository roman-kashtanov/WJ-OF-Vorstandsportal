import React, { useState, useRef } from 'react';
import { prepareFileForStorage, formatBytes } from '../utils/fileStorage';
import { 
  BoardMember, 
  Invoice, 
  Resolution, 
  InvoiceCategory,
  BookkeepingStatus,
  InvoiceFolder,
  InvoiceRecurrence
} from '../types';
import { 
  X, 
  Receipt, 
  Upload, 
  Check, 
  Vote, 
  Folder, 
  FolderPlus, 
  Clock, 
  MinusCircle, 
  Plus 
} from 'lucide-react';

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => void;
  currentMember: BoardMember;
  resolutions: Resolution[];
  folders?: InvoiceFolder[];
  onCreateFolder?: (name: string) => InvoiceFolder;
  onOpenNewResolution?: () => void;
  onCreateQuickResolution?: (data: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>) => Resolution;
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentMember,
  resolutions,
  folders = [],
  onCreateFolder,
  onCreateQuickResolution,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [title, setTitle] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<InvoiceCategory>('Events & Projekte');
  
  // Resolution toggle: true = mit Beschluss, false = ohne Beschluss
  const [hasResolution, setHasResolution] = useState<boolean>(true);
  const [selectedResolutionId, setSelectedResolutionId] = useState<string>(
    resolutions[0]?.id || ''
  );
  
  // Folder for invoices without resolution or general organization
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folders[0]?.id || '');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Recurrence
  const [recurrence, setRecurrence] = useState<InvoiceRecurrence>('einmalig');

  // Bookkeeping Status (3 choices)
  const [bookkeepingStatus, setBookkeepingStatus] = useState<BookkeepingStatus>('nicht_bearbeitet');

  // Inline quick resolution creator state (streamlined to match current NewResolutionModal)
  const [isCreatingQuickResolution, setIsCreatingQuickResolution] = useState(false);
  const [quickResText, setQuickResText] = useState('');
  const [quickResBudget, setQuickResBudget] = useState('');

  const [notes, setNotes] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [fileType, setFileType] = useState<'image' | 'pdf'>('pdf');
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setFileName(file.name);
    setFileType(file.type.startsWith('image/') ? 'image' : 'pdf');

    // Fotos werden verkleinert: Ein Handyfoto sprengt sonst die Groessengrenze
    // eines Datenbank-Dokuments und wuerde gar nicht erst gespeichert.
    const result = await prepareFileForStorage(file);
    if (result.ok === false) {
      setFileError(result.error);
      setFileName('');
      setFilePreview(null);
      return;
    }

    setFileSize(formatBytes(result.file.bytes));
    setFilePreview(result.file.dataUrl);
    if (result.file.wasCompressed && result.file.originalBytes > result.file.bytes * 1.5) {
      setFileNotice(
        `Foto verkleinert: ${formatBytes(result.file.originalBytes)} → ${formatBytes(result.file.bytes)}`
      );
    } else {
      setFileNotice(null);
    }
  };

  const handleCreateInlineResolution = () => {
    const resText = quickResText.trim() || `Freigabe für ${vendor || title || 'Ausgabe'}`;
    if (!resText || !onCreateQuickResolution) return;

    const currentYear = new Date().getFullYear();
    const newNumber = `VB-${currentYear}-${String(resolutions.length + 1).padStart(2, '0')}`;
    const budgetVal = quickResBudget ? parseFloat(quickResBudget) : (amount ? parseFloat(amount) : undefined);

    const createdRes = onCreateQuickResolution({
      number: newNumber,
      title: resText.length > 80 ? resText.substring(0, 77) + '...' : resText,
      motionText: resText,
      description: resText,
      applicant: {
        id: currentMember.id,
        name: currentMember.name,
        role: currentMember.role,
      },
      requestedBudget: budgetVal,
      status: 'in_abstimmung',
      requiredQuorum: 1,
    });

    if (createdRes) {
      setHasResolution(true);
      setSelectedResolutionId(createdRes.id);
      setIsCreatingQuickResolution(false);
    }
  };

  const handleSaveNewFolder = () => {
    if (!newFolderName.trim() || !onCreateFolder) return;
    const f = onCreateFolder(newFolderName.trim());
    if (f) {
      setSelectedFolderId(f.id);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !vendor.trim() || !amount) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const chosenResolution = hasResolution 
      ? resolutions.find((r) => r.id === selectedResolutionId)
      : undefined;

    const isBearbeitet = bookkeepingStatus === 'bearbeitet';

    onSubmit({
      invoiceNumber: invoiceNumber.trim() || `BELEG-${Date.now().toString().slice(-6)}`,
      title: title.trim(),
      vendor: vendor.trim(),
      amount: parsedAmount,
      date,
      category,
      status: 'eingereicht',
      hasResolution,
      resolutionId: chosenResolution?.id,
      resolutionNumber: chosenResolution?.number,
      resolutionTitle: chosenResolution?.title,
      folderId: !hasResolution ? (selectedFolderId || undefined) : undefined,
      recurrence: recurrence !== 'einmalig' ? recurrence : undefined,
      bookkeepingStatus,
      isBookkeepingRecorded: isBearbeitet,
      bookkeepingRecordedAt: isBearbeitet ? new Date().toISOString() : undefined,
      bookkeepingRecordedBy: isBearbeitet ? `${currentMember.name} (${currentMember.role})` : undefined,
      submittedBy: {
        id: currentMember.id,
        name: currentMember.name,
        role: currentMember.role,
      },
      fileName: fileName || (fileType === 'pdf' ? 'Rechnung_Beleg.pdf' : 'Beleg_Foto.jpg'),
      fileSize: fileSize || '350 KB',
      fileType,
      fileUrl: filePreview || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-[#003594] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                Rechnung / Beleg erfassen
              </h3>
              <p className="text-xs text-blue-100">
                WJ Offenbach Belegverwaltung
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* File Upload Box */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Beleg / Foto (PDF oder Bild)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              className="hidden text-base sm:text-sm"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#003594] rounded-xl p-3.5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
            >
              {filePreview ? (
                <div className="flex items-center justify-center space-x-3">
                  {fileType === 'image' ? (
                    <img src={filePreview} alt="Beleg Vorschau" className="w-10 h-10 object-cover rounded-lg border border-slate-300" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                      PDF
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-bold text-slate-900 truncate max-w-xs">{fileName}</p>
                    <p className="text-[10px] text-emerald-700 font-semibold flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>{fileSize} • Klicken zum Ändern</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 py-0.5">
                  <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700">
                    Datei auswählen oder Foto aufnehmen
                  </p>
                </div>
              )}
            </div>

            {fileError && (
              <div className="mt-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-[11px] leading-relaxed text-rose-800">
                {fileError}
              </div>
            )}

            {fileNotice && !fileError && (
              <p className="mt-1.5 text-[11px] text-slate-500">{fileNotice}</p>
            )}
          </div>

          {/* 1. BESCHLUSS-ZUORDNUNG */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block">
              Zuordnung *
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setHasResolution(true)}
                className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                  hasResolution
                    ? 'bg-blue-50/80 border-[#003594] text-[#003594] ring-1 ring-[#003594] shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Vote className={`w-4 h-4 shrink-0 ${hasResolution ? 'text-[#003594]' : 'text-slate-400'}`} />
                <span className="font-bold text-xs">Mit Beschluss</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setHasResolution(false);
                  setIsCreatingQuickResolution(false);
                }}
                className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                  !hasResolution
                    ? 'bg-amber-50/80 border-amber-600 text-amber-950 ring-1 ring-amber-500 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Folder className={`w-4 h-4 shrink-0 ${!hasResolution ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="font-bold text-xs">Ohne Beschluss (Ordner)</span>
              </button>
            </div>
          </div>

          {/* Conditional Resolution Dropdown & Streamlined Quick Create */}
          {hasResolution ? (
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-blue-950 text-xs">
                  Beschluss:
                </label>

                <button
                  type="button"
                  onClick={() => setIsCreatingQuickResolution(!isCreatingQuickResolution)}
                  className="px-2 py-0.5 bg-[#003594] hover:bg-[#00266B] text-white rounded-lg font-bold text-[10px] flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isCreatingQuickResolution ? 'Bestehende wählen' : '+ Neu anlegen'}</span>
                </button>
              </div>

              {!isCreatingQuickResolution ? (
                <div>
                  {resolutions.length > 0 ? (
                    <select
                      value={selectedResolutionId}
                      onChange={(e) => setSelectedResolutionId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-xs font-semibold"
                    >
                      {resolutions.map((res) => (
                        <option key={res.id} value={res.id}>
                          {res.title} ({res.number}) {res.requestedBudget ? `• ${res.requestedBudget.toFixed(2)} €` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-slate-500 text-xs py-1">Noch keine Beschlüsse. Klicke auf "+ Neu anlegen".</p>
                  )}
                </div>
              ) : (
                /* STREAMLINED QUICK RESOLUTION FORM (Consistent with NewResolutionModal) */
                <div className="bg-white p-3 rounded-xl border border-blue-300 space-y-2 animate-in fade-in">
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5 text-[11px]">
                      Beschlusstext *
                    </label>
                    <input
                      type="text"
                      value={quickResText}
                      onChange={(e) => setQuickResText(e.target.value)}
                      placeholder={vendor && title ? `Freigabe ${vendor} - ${title}` : 'Was soll beschlossen werden?'}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-1 focus:ring-[#003594]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      Betrag: <strong>{quickResBudget || amount || '0.00'} €</strong>
                    </span>
                    <div className="flex space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setIsCreatingQuickResolution(false)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateInlineResolution}
                        className="px-3 py-1 bg-[#003594] text-white rounded-lg text-xs font-bold flex items-center space-x-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Übernehmen</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* FOLDER SELECTION FOR INVOICES WITHOUT RESOLUTION */
            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-amber-950 flex items-center space-x-1 text-xs">
                  <Folder className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ordner:</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                  className="px-2 py-0.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-[10px] flex items-center space-x-1 cursor-pointer"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>{isCreatingFolder ? 'Schließen' : '+ Neuer Ordner'}</span>
                </button>
              </div>

              {!isCreatingFolder ? (
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600 text-base sm:text-xs font-semibold"
                >
                  <option value="">-- Kein Ordner (Allgemein) --</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="bg-white p-2.5 rounded-xl border border-amber-300 space-y-1.5">
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="z.B. Ionos, Zoom, IHK..."
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleSaveNewFolder}
                      disabled={!newFolderName.trim()}
                      className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs disabled:opacity-50"
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MAIN INVOICE FORM */}
          <form id="new-invoice-form" onSubmit={handleSubmit} className="space-y-3">
            
            {/* Vendor & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Lieferant / Empfänger *
                </label>
                <input
                  type="text"
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="z.B. IONOS, Druckerei..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Betrag in € *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 bg-blue-50/40 border border-blue-300 rounded-xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#003594] font-bold">€</span>
                </div>
              </div>
            </div>

            {/* Title / Zweck */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Verwendungszweck / Beschreibung *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Domain & Webhosting"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
              />
            </div>

            {/* Date & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Belegdatum *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kategorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as InvoiceCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
                >
                  <option value="Events & Projekte">Events & Projekte</option>
                  <option value="Marketing & PR">Marketing & PR</option>
                  <option value="IT, Web & Lizenzen">IT, Web & Lizenzen</option>
                  <option value="Verwaltung & IHK">Verwaltung & IHK</option>
                  <option value="Konferenzen (LAKO/BUKO)">Konferenzen (LAKO/BUKO)</option>
                  <option value="Sonstiges">Sonstiges</option>
                </select>
              </div>
            </div>

            {/* Bookkeeping Status 3-Options Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1">
              <label className="block font-bold text-slate-800 text-xs">
                Buchhaltung / DATEV:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setBookkeepingStatus('bearbeitet')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    bookkeepingStatus === 'bearbeitet'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>Bearbeitet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBookkeepingStatus('nicht_bearbeitet')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    bookkeepingStatus === 'nicht_bearbeitet'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Offen</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBookkeepingStatus('nicht_notwendig')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    bookkeepingStatus === 'nicht_notwendig'
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MinusCircle className="w-3 h-3" />
                  <span>Keine</span>
                </button>
              </div>
            </div>

            {/* Notes & Optional Invoice Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rechnungsnr. (optional)
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="z.B. RE-2025-091"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Notiz (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Kurze Anmerkung..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-white transition-colors cursor-pointer text-xs"
          >
            Abbrechen
          </button>
          
          <button
            type="submit"
            form="new-invoice-form"
            className="px-5 py-2.5 rounded-xl bg-[#003594] hover:bg-[#00266B] font-bold text-white transition-colors shadow-xs cursor-pointer flex items-center space-x-1.5 text-xs sm:text-sm"
          >
            <Receipt className="w-4 h-4" />
            <span>Beleg speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};
