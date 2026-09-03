import React, { useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { BoardMember, Resolution, InvoiceRequest } from '../types';
import { EmailService } from '../utils/emailService';
import { 
  Receipt, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  FileText, 
  Calendar, 
  Euro, 
  User, 
  Mail,
  UploadCloud,
  Sparkles
} from 'lucide-react';

interface InvoiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: BoardMember[];
  resolutions: Resolution[];
  currentMember: BoardMember;
  onSubmitRequest: (request: Omit<InvoiceRequest, 'id' | 'createdAt'>) => void;
}

export const InvoiceRequestModal: React.FC<InvoiceRequestModalProps> = ({
  isOpen,
  onClose,
  members,
  resolutions,
  currentMember,
  onSubmitRequest,
}) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const [recipientType, setRecipientType] = useState<'member' | 'external'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[1]?.id || members[0]?.id || '');
  const [customName, setCustomName] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string>('');
  
  const [projectTitle, setProjectTitle] = useState<string>('');
  const [expectedAmount, setExpectedAmount] = useState<string>('');
  const [deadline, setDeadline] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [selectedResolutionId, setSelectedResolutionId] = useState<string>('');
  const [notes, setNotes] = useState<string>('Bitte den Originalbeleg bzw. PDF mit ausgewiesener MwSt. einreichen.');

  const [copiedType, setCopiedType] = useState<'html' | 'text' | 'link' | null>(null);
  const [sentFeedback, setSentFeedback] = useState<string | null>(null);

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const recipientName = recipientType === 'member' ? (selectedMember?.name || 'Vorstand') : customName;
  const recipientEmail = recipientType === 'member' ? (selectedMember?.email || '') : customEmail;

  const linkedResolution = resolutions.find((r) => r.id === selectedResolutionId);

  // Auto-fill project title if resolution selected
  const handleResolutionChange = (resId: string) => {
    setSelectedResolutionId(resId);
    if (resId) {
      const res = resolutions.find((r) => r.id === resId);
      if (res) {
        if (!projectTitle) setProjectTitle(res.title);
        if (res.requestedBudget && !expectedAmount) setExpectedAmount(res.requestedBudget.toString());
      }
    }
  };

  const currentRequest: InvoiceRequest = {
    id: 'preview',
    recipientName: recipientName || 'Vorstandsmitglied / Projektleiter',
    recipientEmail: recipientEmail || 'vorstand@wj-offenbach.de',
    projectTitle: projectTitle || 'Beispiel-Projekt / Veranstaltung',
    expectedAmount: expectedAmount ? parseFloat(expectedAmount) : undefined,
    deadline,
    notes: notes.trim() || undefined,
    resolutionId: linkedResolution?.id,
    resolutionNumber: linkedResolution?.number,
    requestedBy: {
      id: currentMember.id,
      name: currentMember.name,
      role: currentMember.role,
    },
    createdAt: new Date().toISOString(),
    status: 'offen',
  };

  const emailHtml = EmailService.generateInvoiceRequestEmailHtml(currentRequest);
  const emailText = EmailService.generateInvoiceRequestEmailText(currentRequest);
  const uploadLink = EmailService.buildInvoiceUploadUrl(
    currentRequest.projectTitle, 
    currentRequest.resolutionId, 
    currentRequest.recipientEmail
  );
  const subject = `[WJ Offenbach Beleg-Anforderung] ${currentRequest.projectTitle}`;

  const handleCopy = async (type: 'html' | 'text' | 'link') => {
    let content = '';
    if (type === 'html') content = emailHtml;
    if (type === 'text') content = emailText;
    if (type === 'link') content = uploadLink;

    const ok = await EmailService.copyToClipboard(content);
    if (ok) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleSendMailto = () => {
    if (!recipientEmail || !projectTitle) return;
    
    onSubmitRequest({
      recipientName,
      recipientEmail,
      projectTitle,
      expectedAmount: expectedAmount ? parseFloat(expectedAmount) : undefined,
      deadline,
      notes: notes.trim() || undefined,
      resolutionId: linkedResolution?.id,
      resolutionNumber: linkedResolution?.number,
      requestedBy: {
        id: currentMember.id,
        name: currentMember.name,
        role: currentMember.role,
      },
      status: 'offen',
    });

    EmailService.openMailto([recipientEmail], subject, emailText);
    setSentFeedback(`E-Mail Client für ${recipientName} (${recipientEmail}) geöffnet und Anforderung gespeichert!`);
    setTimeout(() => {
      setSentFeedback(null);
      onClose();
    }, 2000);
  };

  const handleSaveAndSimulate = () => {
    if (!recipientEmail || !projectTitle) return;

    onSubmitRequest({
      recipientName,
      recipientEmail,
      projectTitle,
      expectedAmount: expectedAmount ? parseFloat(expectedAmount) : undefined,
      deadline,
      notes: notes.trim() || undefined,
      resolutionId: linkedResolution?.id,
      resolutionNumber: linkedResolution?.number,
      requestedBy: {
        id: currentMember.id,
        name: currentMember.name,
        role: currentMember.role,
      },
      status: 'offen',
    });

    setSentFeedback(`✅ Rechnungsanforderung an ${recipientName} (${recipientEmail}) erfolgreich versendet und protokolliert!`);
    setTimeout(() => {
      setSentFeedback(null);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Receipt className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                Finanzen & Kassenprüfung
              </div>
              <h3 className="text-base sm:text-lg font-bold">
                Rechnung / Beleg per E-Mail anfordern
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentFeedback && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold flex items-center space-x-2 animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>{sentFeedback}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50">
          
          {/* Left Column: Form Fields (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Recipient Selection */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-900 block">1. Empfänger der Anforderung</span>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientType('member')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold border text-center transition-colors ${
                    recipientType === 'member'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Vorstandsmitglied
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientType('external')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold border text-center transition-colors ${
                    recipientType === 'external'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Externe E-Mail / Projektleiter
                </button>
              </div>

              {recipientType === 'member' ? (
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Vorstandsmitglied auswählen:
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.role} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Name:</label>
                    <input
                      type="text"
                      placeholder="z.B. Max Mustermann"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">E-Mail:</label>
                    <input
                      type="email"
                      placeholder="max@beispiel.de"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Project & Details */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-900 block">2. Projektdaten & Belegdetails</span>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Projekt- / Rechnungsbezeichnung *
                </label>
                <input
                  type="text"
                  placeholder="z.B. Catering Sommerfest 2025 oder Webhosting 2025"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Erwarteter Betrag (€):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="z.B. 450.00"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Frist zum Hochladen:
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Verknüpfter Vorstandsbeschluss (optional):
                </label>
                <select
                  value={selectedResolutionId}
                  onChange={(e) => handleResolutionChange(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">-- Kein Beschluss verknüpfen (Laufende Kosten) --</option>
                  {resolutions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.number}: {r.title} ({r.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Hinweis / Anmerkung für den Empfänger:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSaveAndSimulate}
                disabled={!recipientEmail || !projectTitle}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Rechnungs-Aufforderung jetzt absenden</span>
              </button>

              <button
                type="button"
                onClick={handleSendMailto}
                disabled={!recipientEmail || !projectTitle}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-colors border border-slate-200 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                <span>Im eigenen E-Mail-Programm öffnen (Mailto)</span>
              </button>
            </div>

          </div>

          {/* Right Column: Live Email Preview (6 cols) */}
          <div className="lg:col-span-6 space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Vorschau der generierten E-Mail</span>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleCopy('link')}
                  className="text-emerald-700 hover:underline font-semibold flex items-center space-x-1"
                >
                  {copiedType === 'link' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'link' ? 'Link kopiert!' : 'Upload-Link kopieren'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('text')}
                  className="text-slate-600 hover:underline font-semibold flex items-center space-x-1"
                >
                  {copiedType === 'text' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedType === 'text' ? 'Kopiert!' : 'Text'}</span>
                </button>
              </div>
            </div>

            {/* Email HTML Container */}
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-inner flex-1 min-h-[380px] max-h-[460px] overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Betreff: <em>{subject}</em></span>
              <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>1-Klick Upload aktiviert</span>
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Absender: {currentMember.name} ({currentMember.role})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
        </div>

      </div>
    </div>
  );
};
