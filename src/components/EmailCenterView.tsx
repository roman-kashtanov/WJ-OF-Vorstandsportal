import React, { useState } from 'react';
import { 
  BoardMember, 
  Resolution, 
  Invoice, 
  EmailNotificationLog, 
  InvoiceRequest,
  VoteType 
} from '../types';
import { formatDate, formatDateTime, formatCurrency } from '../utils/formatters';
import { EmailService } from '../utils/emailService';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Receipt, 
  Vote, 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  Server, 
  Key, 
  Zap, 
  RefreshCw,
  Plus,
  ArrowRight,
  Sparkles,
  Inbox
} from 'lucide-react';

interface EmailCenterViewProps {
  currentMember: BoardMember;
  members: BoardMember[];
  resolutions: Resolution[];
  emailLogs: EmailNotificationLog[];
  invoiceRequests: InvoiceRequest[];
  onOpenEmailVoteModal: (res: Resolution) => void;
  onOpenInvoiceRequestModal: () => void;
  onSelectResolution: (resId: string) => void;
  onOpenNewInvoiceWithRequest: (req: InvoiceRequest) => void;
}

export const EmailCenterView: React.FC<EmailCenterViewProps> = ({
  currentMember,
  members,
  resolutions,
  emailLogs,
  invoiceRequests,
  onOpenEmailVoteModal,
  onOpenInvoiceRequestModal,
  onSelectResolution,
  onOpenNewInvoiceWithRequest,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'logs' | 'requests' | 'architecture'>('overview');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const activeResolutions = resolutions.filter((r) => !r.isArchived && r.status === 'in_abstimmung');
  const openInvoiceRequests = invoiceRequests.filter((r) => r.status === 'offen');

  const handleCopyLink = async (text: string, id: string) => {
    const ok = await EmailService.copyToClipboard(text);
    if (ok) {
      setCopiedLink(id);
      setTimeout(() => setCopiedLink(null), 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003594] to-blue-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
            <Mail className="w-4 h-4" />
            <span>Vorstandsportal E-Mail-Zentrale</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            E-Mail-Benachrichtigungen & 1-Klick-Abstimmungen
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl">
            Vorstandsmitglieder automatisch per E-Mail benachrichtigen, Stimmabgaben mit einem Klick erfassen und Rechnungsanforderungen versenden.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeResolutions[0] && (
            <button
              onClick={() => onOpenEmailVoteModal(activeResolutions[0])}
              className="px-4 py-2.5 bg-white text-[#003594] hover:bg-blue-50 font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Vote className="w-4 h-4" />
              <span>Beschluss-E-Mail senden</span>
            </button>
          )}

          <button
            onClick={onOpenInvoiceRequestModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Rechnung anfordern</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeSubTab === 'overview'
              ? 'bg-[#003594] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Übersicht & Aktionen</span>
        </button>

        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeSubTab === 'logs'
              ? 'bg-[#003594] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>E-Mail-Verlauf & Protokoll ({emailLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('requests')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeSubTab === 'requests'
              ? 'bg-[#003594] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Offene Rechnungs-Anforderungen ({openInvoiceRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('architecture')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
            activeSubTab === 'architecture'
              ? 'bg-[#003594] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Technische Architektur (Wie geht das im Produktivbetrieb?)</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & QUICK ACTIONS */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Aktive Umlaufbeschlüsse
              </span>
              <div className="text-2xl font-black text-[#003594] mt-1">
                {activeResolutions.length}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Bereit für 1-Klick E-Mail-Abstimmung
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Protokollierte E-Mails
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {emailLogs.length}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Zustellungen & 1-Klick Aktionen
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Offene Beleg-Anforderungen
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {openInvoiceRequests.length}
              </div>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Ausstehende Rechnungs-Uploads
              </span>
            </div>
          </div>

          {/* Resolutions ready for Email Voting */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                  <Vote className="w-5 h-5 text-[#003594]" />
                  <span>Beschlüsse im Umlaufverfahren ({activeResolutions.length})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hier kannst du Vorstandsmitglieder per E-Mail zur 1-Klick-Abstimmung auffordern.
                </p>
              </div>
            </div>

            {activeResolutions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Keine aktiven Beschlüsse im Umlaufverfahren.
              </div>
            ) : (
              <div className="space-y-3">
                {activeResolutions.map((res) => {
                  const votedCount = Object.keys(res.votes).length;
                  const missingCount = members.length - votedCount;
                  return (
                    <div
                      key={res.id}
                      className="p-4 bg-slate-50 hover:bg-blue-50/40 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-[#003594] bg-white px-2 py-0.5 rounded border border-slate-200">
                            {res.number}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {res.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-1">
                          "{res.motionText}"
                        </p>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-3">
                          <span>Antragsteller: <strong>{res.applicant.name}</strong></span>
                          <span>•</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            {votedCount}/{members.length} Stimmen abgegeben ({missingCount} fehlen)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenEmailVoteModal(res)}
                          className="px-3.5 py-2 bg-[#003594] hover:bg-[#00266B] text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5 text-blue-200" />
                          <span>E-Mail Abstimmung starten</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectResolution(res.id)}
                          className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          title="Im Portal öffnen"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Invoice Request Card */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Fehlende Rechnungen & Belege per E-Mail anfordern
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                  Sende mit wenigen Klicks eine formelle Beleg-Anforderung an Vorstandsmitglieder oder Projektleiter. Die E-Mail enthält einen direkten 1-Klick-Upload-Link, der das Rechnungsformular mit dem passenden Projekt vorbefüllt.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenInvoiceRequestModal}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shrink-0 shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Neue Anforderung senden</span>
            </button>
          </div>

        </div>
      )}

      {/* TAB 2: EMAIL LOGS & AUDIT TRAIL */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <Inbox className="w-5 h-5 text-[#003594]" />
                <span>Zustellprotokoll & E-Mail-Verlauf</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Revisionssichere Protokollierung aller versendeten E-Mails, 1-Klick-Stimmen und Antworten.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Typ</th>
                  <th className="py-2.5 px-3">Empfänger</th>
                  <th className="py-2.5 px-3">Betreff & Bezug</th>
                  <th className="py-2.5 px-3">Versandzeit</th>
                  <th className="py-2.5 px-3">Status / Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {emailLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-3">
                      {log.type === 'resolution_vote' ? (
                        <span className="font-bold px-2 py-0.5 rounded bg-blue-50 text-[#003594] border border-blue-200">
                          Beschluss
                        </span>
                      ) : (
                        <span className="font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Rechnung
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{log.recipientName}</div>
                      <div className="text-[11px] text-slate-500">{log.recipientEmail}</div>
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{log.subject}</div>
                      {log.details && (
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">{log.details}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {formatDateTime(log.sentAt)}
                    </td>
                    <td className="py-3 px-3">
                      {log.status === 'abgestimmt' ? (
                        <span className="font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center space-x-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{log.actionTaken || 'Erledigt'}</span>
                        </span>
                      ) : (
                        <span className="font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center space-x-1 w-fit">
                          <Clock className="w-3 h-3" />
                          <span>Zugestellt</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVOICE REQUESTS */}
      {activeSubTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <span>Ausstehende Rechnungs-Anforderungen ({invoiceRequests.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Übersicht aller Belege, die von Vorstandsmitgliedern oder Projektleitern angefordert wurden.
              </p>
            </div>
            <button
              onClick={onOpenInvoiceRequestModal}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Anforderung senden</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {invoiceRequests.map((req) => {
              const uploadUrl = EmailService.buildInvoiceUploadUrl(req.projectTitle, req.resolutionId, req.recipientEmail);
              return (
                <div key={req.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {req.projectTitle}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        req.status === 'erledigt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status === 'erledigt' ? 'Hochgeladen' : 'Ausstehend'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span>Empfänger: <strong>{req.recipientName}</strong> ({req.recipientEmail})</span>
                      {req.expectedAmount && <span>Erwartet: <strong>{formatCurrency(req.expectedAmount)}</strong></span>}
                      <span>Frist: {formatDate(req.deadline)}</span>
                      {req.resolutionNumber && <span>Beschluss: {req.resolutionNumber}</span>}
                    </div>
                    {req.notes && (
                      <p className="text-[11px] text-slate-600 mt-1 italic">
                        Hinweis: {req.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenNewInvoiceWithRequest(req)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 cursor-pointer"
                    >
                      Jetzt hochladen
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(uploadUrl, req.id)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
                      title="Upload-Link kopieren"
                    >
                      {copiedLink === req.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ARCHITECTURE & THEORY EXPLANATION */}
      {activeSubTab === 'architecture' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <div className="flex items-center space-x-2 text-[#003594] text-xs font-bold uppercase tracking-wider mb-1">
              <Server className="w-4 h-4" />
              <span>Theoretische Erklärung & Umsetzung</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Wie funktioniert die E-Mail-Abstimmung und was wird dafür benötigt?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Hier erfährst du im Detail, wie 1-Klick-Abstimmungen per E-Mail technisch funktionieren, wie die Sicherheit gewährleistet wird und welche Komponenten im Produktivbetrieb eingesetzt werden.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1: Das 1-Klick-Verfahren */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center space-x-2 text-[#003594] font-bold text-sm">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>1. Wie das 1-Klick-Abstimmen in E-Mails funktioniert</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                In modernen HTML-E-Mails können keine interaktiven JavaScript-Skripte oder Formulare eingebettet werden (Sicherheitsrichtlinie aller Mail-Clients wie Outlook, Apple Mail oder Gmail).
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Stattdessen werden <strong>3 eindeutige Hyperlinks</strong> mit signierten Parametern hinterlegt:
              </p>
              <div className="bg-white p-3 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1">
                <div className="text-emerald-700 font-bold">🟢 Ja: ?action=vote&res=VB-004&member=mem_1&vote=yes&token=...</div>
                <div className="text-rose-700 font-bold">🔴 Nein: ?action=vote&res=VB-004&member=mem_1&vote=no&token=...</div>
                <div className="text-slate-600 font-bold">⚪ Enthaltung: ?action=vote&res=VB-004&member=mem_1&vote=abstain&token=...</div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sobald der Vorstand auf den Button klickt, ruft der Browser den Link auf. Das Portal erkennt die Parameter, validiert das Token, speichert die Stimme <strong>vollautomatisch und sekundenschnell</strong> in der Datenbank und zeigt eine Bestätigung an.
              </p>
            </div>

            {/* Box 2: Sicherheit & HMAC Tokens */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>2. Sicherheit & Revisionssicherheit (HMAC-Signatur)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Damit niemand die URL erraten oder für andere Vorstände abstimmen kann, wird ein <strong>kryptographisches Token</strong> erzeugt:
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                <li><strong>HMAC-SHA256 Signatur:</strong> Aus Beschluss-ID, Vorstands-ID, Stimmabgabe und einem geheimen Vereinsschlüssel (`SECRET_KEY`).</li>
                <li><strong>Ablauffrist (TTL):</strong> Nach Ablauf der Beschlussfrist (z.B. nach 7 Tagen) verfällt der Link automatisch.</li>
                <li><strong>Einmaligkeit:</strong> Wenn ein Vorstand bereits abgestimmt hat, wird eine eventuelle spätere Stimmänderung im Portal protokolliert.</li>
              </ul>
            </div>

            {/* Box 3: Was wird für den Produktivbetrieb benötigt? */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center space-x-2 text-[#003594] font-bold text-sm">
                <Server className="w-4 h-4" />
                <span>3. Was wird für den echten automatischen E-Mail-Versand gebraucht?</span>
              </div>
              <div className="text-xs text-slate-600 space-y-2">
                <div>
                  <strong className="text-slate-900 block font-bold">A) Transaktionaler E-Mail-Dienst (Empfohlen):</strong>
                  Dienste wie <strong>Resend</strong> (resend.com), <strong>SendGrid</strong>, <strong>Postmark</strong> oder <strong>Mailgun</strong>. Diese bieten 99.9% Zustellrate direkt in das Hauptpostfach (kein Spam).
                </div>
                <div>
                  <strong className="text-slate-900 block font-bold">B) Eigener SMTP-Mailserver der IHK / Wirtschaftsjunioren:</strong>
                  Zugangsdaten (Host, Port 587, User, Passwort) zum Versenden über z.B. <code>vorstand@wj-offenbach.de</code>.
                </div>
                <div>
                  <strong className="text-slate-900 block font-bold">C) Domain-Verifizierung (DKIM & SPF):</strong>
                  TXT-Einträge im DNS der Domain <code>wj-offenbach.de</code>, damit E-Mails nicht als Phishing blockiert werden.
                </div>
              </div>
            </div>

            {/* Box 4: Direktes Antworten per E-Mail (Inbound Mail Parsing) */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
                <RefreshCw className="w-4 h-4 text-indigo-600" />
                <span>4. Option: Direkt per Antwort-Mail abstimmen (Inbound Parse)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Alternativ zum 1-Klick-Link kann eingerichtet werden, dass ein Vorstandsmitglied einfach in seinem Mail-Programm auf "Antworten" klickt und <strong>"JA"</strong> oder <strong>"NEIN"</strong> schreibt.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dazu wird ein Inbound-Webhook (z.B. an <code>beschluss-vb-004@reply.wj-offenbach.de</code>) eingerichtet. Der Server liest den Betreff und die erste Zeile aus und bucht die Stimme sofort ins Protokoll ein.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
