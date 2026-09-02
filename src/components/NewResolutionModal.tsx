import React, { useState, useEffect, useRef } from 'react';
import { 
  BoardMember, 
  Resolution, 
  ResolutionAttachment 
} from '../types';
import { 
  X, 
  Vote, 
  Mic, 
  MicOff,
  Paperclip,
  Trash2,
  AlertCircle,
  FileText,
  Plus,
  Sparkles,
  Check
} from 'lucide-react';
import { 
  STANDARD_RESOLUTION_TEMPLATES, 
  ResolutionTemplate 
} from '../utils/copilotParser';
import { SpeechToTextHelper } from '../utils/speechToText';
import { getAttachmentType, formatFileSize } from '../utils/fileHelpers';

interface NewResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (resolutionData: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>) => void;
  currentMember: BoardMember;
  members: BoardMember[];
  existingCount: number;
  initialTitle?: string;
  initialBudget?: number;
}

export const NewResolutionModal: React.FC<NewResolutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentMember,
  members,
  existingCount,
  initialTitle = '',
  initialBudget,
}) => {
  const currentYear = new Date().getFullYear();
  const autoNumber = `VB-${currentYear}-${String(existingCount + 1).padStart(2, '0')}`;

  const [name, setName] = useState('');
  const [text, setText] = useState(initialTitle || '');
  const [budget, setBudget] = useState<string>(initialBudget ? String(initialBudget) : '');
  const [showTemplates, setShowTemplates] = useState<boolean>(false);
  
  // Stimmberechtigte Mitglieder: default alle stimmberechtigten Vorstände
  const [eligibleVoterIds] = useState<string[]>(() => {
    const votingMembers = members.filter((m) => !m.isPermanentStaff);
    return votingMembers.length > 0 ? votingMembers.map((m) => m.id) : members.map((m) => m.id);
  });

  // Voice dictation state
  const [isDictating, setIsDictating] = useState<boolean>(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const stopDictationRef = useRef<(() => void) | null>(null);

  // Attachments (ALWAYS visible)
  const [attachments, setAttachments] = useState<ResolutionAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const type = getAttachmentType(file.name, file.type);
      const reader = new FileReader();

      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAttachment: ResolutionAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: formatFileSize(file.size),
          type,
          mimeType: file.type,
          dataUrl,
          uploadedAt: new Date().toISOString(),
        };

        setAttachments((prev) => [...prev, newAttachment]);
      };

      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  useEffect(() => {
    if (initialTitle) {
      setText(initialTitle);
    }
    if (initialBudget) {
      setBudget(String(initialBudget));
    }
  }, [initialTitle, initialBudget]);

  if (!isOpen) return null;

  // Voice recording toggle
  const toggleVoiceDictation = () => {
    if (isDictating) {
      if (stopDictationRef.current) {
        stopDictationRef.current();
        stopDictationRef.current = null;
      }
      setIsDictating(false);
      return;
    }

    setDictationError(null);

    const stopFn = SpeechToTextHelper.startListening(
      (transcript) => {
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      },
      (listening, error) => {
        setIsDictating(listening);
        if (error) {
          setDictationError(error);
          setIsDictating(false);
        }
      }
    );

    stopDictationRef.current = stopFn;
  };

  const handleApplyTemplate = (tmpl: ResolutionTemplate) => {
    setText(`${tmpl.title}: ${tmpl.motionText}`);
    if (tmpl.suggestedBudget) {
      setBudget(String(tmpl.suggestedBudget));
    }
    setShowTemplates(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !name.trim()) return;

    if (stopDictationRef.current) {
      stopDictationRef.current();
    }

    const calculatedQuorum = Math.max(1, Math.ceil(eligibleVoterIds.length / 2));

    onSubmit({
      number: autoNumber,
      title: name.trim(),
      // Nur ein Text: er ist zugleich Antragswortlaut. Eine separate
      // Beschreibung wuerde in der Detailansicht doppelt erscheinen.
      description: '',
      motionText: text.trim(),
      applicant: {
        id: currentMember.id,
        name: currentMember.name,
        role: currentMember.role,
      },
      requestedBudget: budget ? parseFloat(budget) : undefined,
      status: 'in_abstimmung',
      eligibleVoterIds,
      requiredQuorum: calculatedQuorum,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-[#003594] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#00A3E0]">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                Beschluss fassen
              </h3>
              <p className="text-xs text-blue-100">
                Umlaufbeschluss {autoNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          
          {/* Optional Vorlagen Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">
                Möchtest du eine Vorlage nutzen?
              </span>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-[11px] font-bold text-[#003594] hover:underline cursor-pointer flex items-center space-x-1"
              >
                <Sparkles className="w-3 h-3 text-[#00A3E0]" />
                <span>{showTemplates ? 'Vorlagen ausblenden' : 'Vorlagen anzeigen'}</span>
              </button>
            </div>

            {showTemplates && (
              <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-wrap gap-1.5 animate-in fade-in">
                {STANDARD_RESOLUTION_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-2.5 py-1 bg-white border border-blue-200 hover:border-[#003594] hover:bg-blue-50 text-slate-800 rounded-lg text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dictation Banner if Active */}
          {isDictating && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center justify-between text-rose-900 animate-pulse">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></div>
                <span className="font-bold text-xs">
                  Sprachaufnahme aktiv... Bitte sprechen
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (stopDictationRef.current) stopDictationRef.current();
                  setIsDictating(false);
                }}
                className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors text-[11px]"
              >
                Stopp
              </button>
            </div>
          )}

          {dictationError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-amber-900 flex items-center space-x-2 text-[11px]">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{dictationError}</span>
            </div>
          )}

          {/* MAIN SIMPLE FORM */}
          <form id="new-resolution-form" onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* 1. Kurzname - macht die Beschlussliste lesbar */}
            <div>
              <label className="font-bold text-slate-900 text-xs sm:text-sm block mb-1.5">
                Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Sommerfest 2026"
                maxLength={60}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594]"
              />
            </div>

            {/* 2. Beschlusstext */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-900 text-xs sm:text-sm">
                  Beschlusstext *
                </label>
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    isDictating
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold animate-pulse'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                  title="Text per Sprache einsprechen"
                >
                  {isDictating ? <MicOff className="w-3.5 h-3.5 text-rose-600" /> : <Mic className="w-3.5 h-3.5 text-[#003594]" />}
                  <span>{isDictating ? 'Stopp' : 'Einsprechen'}</span>
                </button>
              </div>

              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                autoFocus
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594] focus:bg-white transition-all placeholder:text-slate-400"
                placeholder="Was soll beschlossen werden? (z.B. Der Vorstand beschließt die Freigabe des Budgets für das Sommerfest...)"
              />
            </div>

            {/* 2. Betrag in € (optional) */}
            <div>
              <label className="font-bold text-slate-900 text-xs mb-1.5 block">
                Betrag in € (optional)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003594] focus:bg-white"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">€</span>
              </div>
            </div>

            {/* 3. DATEI ANHÄNGEN (IMMER SICHTBAR) */}
            <div className="pt-1">
              <label className="font-bold text-slate-900 text-xs mb-1.5 block flex items-center justify-between">
                <span>Dateianhänge (optional)</span>
                <span className="text-[10px] text-slate-400 font-normal">PDF, Excel, Word, Bild</span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,.png,.jpg,.jpeg,.txt,.zip"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border-2 border-dashed border-slate-300 hover:border-[#003594] rounded-xl text-slate-600 hover:text-[#003594] hover:bg-blue-50/20 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer bg-slate-50/50"
              >
                <Paperclip className="w-4 h-4 text-[#003594]" />
                <span>Datei auswählen oder hierher ziehen</span>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1.5 mt-2.5">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center space-x-2 truncate">
                        <FileText className="w-4 h-4 text-[#003594] shrink-0" />
                        <span className="truncate font-medium text-slate-800">{att.name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">({att.size})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Anhang entfernen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold transition-colors cursor-pointer text-xs"
          >
            Abbrechen
          </button>
          
          <button
            type="submit"
            form="new-resolution-form"
            disabled={!name.trim() || !text.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 font-bold text-white transition-all shadow-xs cursor-pointer flex items-center space-x-1.5 text-xs sm:text-sm active:scale-98"
          >
            <Vote className="w-4 h-4" />
            <span>Beschluss fassen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
