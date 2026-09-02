import React, { useState } from 'react';
import { BoardMember, Resolution, VoteType, EmailServerConfig } from '../types';
import { EmailService, sendResolutionVoteMails } from '../utils/emailService';
import { 
  Mail, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Smartphone, 
  Monitor, 
  Sparkles,
  Info,
  ShieldCheck,
  Zap,
  Users,
  Loader2
} from 'lucide-react';

interface EmailVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  resolution: Resolution | null;
  members: BoardMember[];
  onVote: (resolutionId: string, member: BoardMember, vote: VoteType, note?: string) => void;
  onLogEmailSent: (recipient: BoardMember, subject: string) => void;
  emailServerConfig?: EmailServerConfig;
}

export const EmailVoteModal: React.FC<EmailVoteModalProps> = ({
  isOpen,
  onClose,
  resolution,
  members,
  onVote,
  onLogEmailSent,
  emailServerConfig,
}) => {
  if (!isOpen || !resolution) return null;

  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(members.map((m) => m.id));
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedType, setCopiedType] = useState<'html' | 'text' | 'yes' | 'no' | null>(null);
  const [sentFeedback, setSentFeedback] = useState<string | null>(null);
  const [showTechGuide, setShowTechGuide] = useState<boolean>(false);

  const previewMember = members.find((m) => m.id === selectedMemberId) || members[0];
  const emailHtml = EmailService.generateResolutionEmailHtml(resolution, previewMember);
  const emailText = EmailService.generateResolutionEmailText(resolution, previewMember);
  const subject = `[WJ Offenbach Umlaufbeschluss] ${resolution.number}: ${resolution.title} (1-Klick Abstimmung)`;

  const handleToggleRecipient = (id: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllRecipients = () => {
    if (selectedRecipients.length === members.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(members.map((m) => m.id));
    }
  };

  const handleCopy = async (type: 'html' | 'text' | 'yes' | 'no') => {
    let content = '';
    if (type === 'html') content = emailHtml;
    if (type === 'text') content = emailText;
    if (type === 'yes') content = EmailService.buildVoteUrl(resolution.id, previewMember.id, 'yes');
    if (type === 'no') content = EmailService.buildVoteUrl(resolution.id, previewMember.id, 'no');

    const ok = await EmailService.copyToClipboard(content);
    if (ok) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  const handleSendMailto = () => {
    const recipients = members
      .filter((m) => selectedRecipients.includes(m.id))
      .map((m) => m.email);

    if (recipients.length === 0) return;

    // Log the send action
    members
      .filter((m) => selectedRecipients.includes(m.id))
      .forEach((member) => {
        onLogEmailSent(member, subject);
      });

    EmailService.openMailto(recipients, subject, emailText);
    setSentFeedback(`E-Mail Client mit ${recipients.length} Empfängern geöffnet und protokolliert.`);
    setTimeout(() => setSentFeedback(null), 4000);
  };

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSimulateAutomatedSend = async () => {
    const recipientMembers = members.filter(
      (m) => selectedRecipients.includes(m.id) && !!m.email
    );
    if (recipientMembers.length === 0) return;

    setIsSending(true);
    try {
      const result = await sendResolutionVoteMails(resolution, recipientMembers);

      recipientMembers.slice(0, result.sent).forEach((m) => onLogEmailSent(m, subject));

      if (result.failed > 0) {
        setSendError(
          `${result.sent} von ${recipientMembers.length} E-Mails versendet.\n\n${result.errors.join('\n')}`
        );
      } else {
        setSentFeedback(
          `${result.sent} E-Mails mit 1-Klick-Abstimmungslinks erfolgreich versendet.`
        );
      }
    } catch (err: any) {
      setSendError(err?.message || 'Unbekannter Fehler beim Senden.');
    } finally {
      setIsSending(false);
      setTimeout(() => setSentFeedback(null), 6000);
    }
  };

  const handleTestVoteInModal = (vote: VoteType) => {
    onVote(resolution.id, previewMember, vote, `1-Klick Stimmabgabe per E-Mail für ${previewMember.name}`);
    setSentFeedback(`⚡ Test-Stimme für ${previewMember.name} erfolgreich als '${vote === 'yes' ? 'JA' : vote === 'no' ? 'NEIN' : 'ENTHALTUNG'}' erfasst!`);
    setTimeout(() => setSentFeedback(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#003594] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Mail className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                E-Mail-Benachrichtigung & 1-Klick-Abstimmung
              </div>
              <h3 className="text-base sm:text-lg font-bold truncate max-w-md sm:max-w-xl">
                {resolution.number}: {resolution.title}
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

        {sendError && (
          <div className="bg-rose-50 border-b border-rose-200 px-5 py-3 text-xs text-rose-800">
            <div className="flex items-start justify-between gap-3">
              <div className="whitespace-pre-line font-medium">{sendError}</div>
              <button onClick={() => setSendError(null)} className="text-rose-500 shrink-0">✕</button>
            </div>
            <div className="mt-2 text-[11px] text-rose-600">
              Haeufigste Ursache: Die Absender-Domain ist bei Resend noch nicht verifiziert.
              Solange nur onboarding@resend.dev als Absender verwenden.
            </div>
          </div>
        )}

        {/* Action Alert Message */}
        {sentFeedback && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{sentFeedback}</span>
            </div>
            <button onClick={() => setSentFeedback(null)} className="text-white/80 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Modal Body: Split view */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50">
          
          {/* Left Column: Recipients & Dispatch Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* 1. Recipients Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-[#003594]" />
                  <span className="text-xs font-bold text-slate-900">Empfänger auswählen</span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllRecipients}
                  className="text-[11px] font-bold text-[#003594] hover:underline"
                >
                  {selectedRecipients.length === members.length ? 'Keine' : 'Alle (8)'}
                </button>
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {members.map((m) => {
                  const isChecked = selectedRecipients.includes(m.id);
                  const hasVoted = !!resolution.votes[m.id];
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-50/60 border-blue-200 text-slate-900'
                          : 'bg-slate-50/50 border-slate-200/60 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 pr-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRecipient(m.id)}
                          className="rounded text-[#003594] focus:ring-[#003594]"
                        />
                        <div className="truncate">
                          <span className="font-semibold block truncate">{m.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{m.email}</span>
                        </div>
                      </div>
                      {hasVoted ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                          Abgestimmt
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                          Offen
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 2. Dispatch Options Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <span className="text-xs font-bold text-slate-900 block">E-Mail Versand auslösen</span>

              <button
                type="button"
                onClick={handleSimulateAutomatedSend}
                disabled={isSending}
                className="w-full py-2.5 px-3 bg-[#003594] hover:bg-[#00266B] text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-4 h-4 text-blue-200 animate-spin" /> : <Send className="w-4 h-4 text-blue-200" />}
                <span>{isSending ? 'Sende...' : `Automatisch an ${selectedRecipients.length} Vorstände senden`}</span>
              </button>

              <button
                type="button"
                onClick={handleSendMailto}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center space-x-2 transition-colors border border-slate-200 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                <span>Im E-Mail-Programm öffnen (Mailto)</span>
              </button>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleCopy('text')}
                  className="text-slate-600 hover:text-[#003594] font-semibold flex items-center space-x-1"
                >
                  {copiedType === 'text' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'text' ? 'Kopiert!' : 'Text kopieren'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('html')}
                  className="text-slate-600 hover:text-[#003594] font-semibold flex items-center space-x-1"
                >
                  {copiedType === 'html' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'html' ? 'Kopiert!' : 'HTML kopieren'}</span>
                </button>
              </div>
            </div>

            {/* 3. Live 1-Click Vote Tester */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>1-Klick-Abstimmung direkt testen:</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Wähle ein Vorstandsmitglied und teste, wie der Klick in der E-Mail sofort die Stimme registriert:
              </p>
              
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white text-slate-800"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    Als: {m.name} ({m.role})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleTestVoteInModal('yes')}
                  className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Ja</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoteInModal('no')}
                  className="py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <XCircle className="w-3 h-3" />
                  <span>Nein</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoteInModal('abstain')}
                  className="py-1.5 px-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg text-[11px] flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <MinusCircle className="w-3 h-3" />
                  <span>Enth.</span>
                </button>
              </div>
            </div>

            {/* 4. Production Guide Toggle */}
            <button
              type="button"
              onClick={() => setShowTechGuide(!showTechGuide)}
              className="w-full text-left text-[11px] text-slate-500 hover:text-[#003594] font-semibold flex items-center justify-between p-2 rounded-lg hover:bg-slate-100"
            >
              <div className="flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Wie funktioniert das im Produktivbetrieb? (Setup & Token)</span>
              </div>
              <span>{showTechGuide ? '▲' : '▼'}</span>
            </button>
          </div>

          {/* Right Column: Live Email Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-3 flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-700">E-Mail-Vorschau für {previewMember.name}</span>
                <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                  HTML
                </span>
              </div>

              <div className="flex items-center space-x-1 bg-slate-200 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-1 rounded-md transition-colors ${
                    previewMode === 'desktop' ? 'bg-white text-[#003594] shadow-xs' : 'text-slate-600'
                  }`}
                  title="Desktop-Ansicht"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-1 rounded-md transition-colors ${
                    previewMode === 'mobile' ? 'bg-white text-[#003594] shadow-xs' : 'text-slate-600'
                  }`}
                  title="Mobile Smartphone-Ansicht"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Frame containing the rendered HTML email */}
            <div className={`bg-white border border-slate-300 rounded-xl overflow-hidden shadow-inner flex-1 min-h-[380px] max-h-[460px] overflow-y-auto ${
              previewMode === 'mobile' ? 'max-w-xs mx-auto border-4 border-slate-700 rounded-3xl p-1' : ''
            }`}>
              <div dangerouslySetInnerHTML={{ __html: emailHtml }} />
            </div>

            {/* Info note */}
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Betreff: <em>{subject}</em></span>
              <span className="text-slate-400">Responsive Email HTML5</span>
            </div>
          </div>

        </div>

        {/* Optional Collapsible Technical Architecture Info */}
        {showTechGuide && (
          <div className="bg-slate-900 text-slate-200 px-6 py-4 border-t border-slate-800 text-xs space-y-2 animate-in slide-in-from-bottom duration-150">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Produktivbetrieb: Was wird für den echten automatisierten E-Mail-Versand benötigt?</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-300 pt-1">
              <div className="bg-slate-800/80 p-2.5 rounded-lg">
                <strong className="text-white block mb-0.5">1. Transaktions-Mailserver</strong>
                Einbindung eines SMTP-Relays oder Anbieters wie Resend, SendGrid, Mailjet oder dem eigenen IHK/WJ-Mailserver via API-Key.
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg">
                <strong className="text-white block mb-0.5">2. Signierte 1-Klick-Links (HMAC)</strong>
                Jeder Button enthält ein manipulationssicheres Token (z.B. SHA-256 HMAC), sodass nur der Empfänger genau 1x abstimmen kann.
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-lg">
                <strong className="text-white block mb-0.5">3. Inbound Email Reply (Optional)</strong>
                Mit Diensten wie SendGrid Inbound Parse kann ein Vorstand auch einfach mit "JA" auf die Mail antworten; der Server erfasst die Stimme automatisch.
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedRecipients.length} von {members.length} Vorstandsmitgliedern ausgewählt
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>

      </div>
    </div>
  );
};
