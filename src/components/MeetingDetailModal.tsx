import React, { useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import {
  BoardMember,
  Meeting,
  MeetingAttachment,
  Resolution,
} from '../types';
import { formatDate } from '../utils/formatters';
import {
  downloadMeetingICS,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  getTeamsAppDeepLink,
} from '../utils/calendar';
import { prepareFileForStorage, formatBytes } from '../utils/fileStorage';
import {
  parseResolutionsFromProtocolText,
  ScannedResolutionCandidate,
} from '../utils/protocolResolutionParser';
import { DropzoneFileInput } from './DropzoneFileInput';
import { FilePreviewModal, PreviewableFile } from './FilePreviewModal';
import { ProtocolScanResultsModal } from './ProtocolScanResultsModal';
import {
  X,
  Video,
  ExternalLink,
  Copy,
  Check,
  Clock,
  MapPin,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
  Share2,
  Download,
  UploadCloud,
  Trash2,
  Eye,
  Calendar as CalendarIcon,
  Ban,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

/** Vorlage, die dem Vorstand zeigt, wie Copilot Beschlüsse im Protokolltext
 *  formatieren soll, damit parseResolutionsFromProtocolText() sie erkennt. */
const PROTOCOL_FORMAT_EXAMPLE =
  'BESCHLUSS 1\nTitel: Freigabe Budget Sommerfest 2026\nText: Der Vorstand beschließt die Bereitstellung eines Budgets von 2.500 € für die Durchführung des Sommerfests.\nBetrag: 2500\nKategorie: Veranstaltungen & Projekte';

interface MeetingDetailModalProps {
  meeting: Meeting | null;
  onClose: () => void;
  currentMember: BoardMember;
  members: BoardMember[];
  resolutions: Resolution[];
  onUpdateAttendeeStatus: (meetingId: string, memberId: string, status: 'accepted' | 'declined' | 'tentative') => void;
  onUpdateMeetingTeamsLink: (meetingId: string, newUrl: string) => void;
  onUpdateMeetingFile: (
    meetingId: string,
    field: 'protocolFile' | 'agendaFile',
    file: MeetingAttachment | undefined
  ) => void;
  onCreateResolution: (
    data: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>
  ) => void;
  onSelectResolution: (resId: string) => void;
  onToggleCancelled: (meetingId: string) => void;
  showProtocolFormatHint?: boolean;
}

/**
 * Eigenes Fenster fuer die Termin-Details (Teams-Link, Kalender-Sync,
 * Protokoll-/Agenda-Upload, Beschlusserkennung, Teilnahme, TOP-Liste) -
 * frueher fest als rechte Spalte in MeetingsView.tsx verdrahtet, jetzt auf
 * Nutzerwunsch ein separat zu oeffnendes Modal (siehe CLAUDE.md/Plan:
 * "in separaten Fenster aufgehen"). Reine Extraktion + Absage-Toggle +
 * Teams-App-Deep-Link, keine sonstige Verhaltensaenderung.
 */
export const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  meeting,
  onClose,
  currentMember,
  members,
  resolutions,
  onUpdateAttendeeStatus,
  onUpdateMeetingTeamsLink,
  onUpdateMeetingFile,
  onCreateResolution,
  onSelectResolution,
  onToggleCancelled,
  showProtocolFormatHint = true,
}) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isEditingTeamsLink, setIsEditingTeamsLink] = useState<boolean>(false);
  const [editedTeamsLink, setEditedTeamsLink] = useState<string>('');
  const [fileBusy, setFileBusy] = useState<'protocolFile' | 'agendaFile' | null>(null);
  const [fileError, setFileError] = useState<{ field: 'protocolFile' | 'agendaFile'; message: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewableFile | null>(null);
  const [protocolText, setProtocolText] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanCandidates, setScanCandidates] = useState<ScannedResolutionCandidate[] | null>(null);
  const [isFormatHintExpanded, setIsFormatHintExpanded] = useState<boolean>(false);
  const [copiedFormat, setCopiedFormat] = useState<boolean>(false);

  useBodyScrollLock(!!meeting);
  if (!meeting) return null;

  const handleCopyTeamsLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveTeamsLink = () => {
    if (!editedTeamsLink.trim()) return;
    onUpdateMeetingTeamsLink(meeting.id, editedTeamsLink.trim());
    setIsEditingTeamsLink(false);
  };

  const handleUploadMeetingFile = async (
    field: 'protocolFile' | 'agendaFile',
    file: File
  ) => {
    setFileError(null);
    setFileBusy(field);
    try {
      const result = await prepareFileForStorage(file);
      if (result.ok === false) {
        setFileError({ field, message: result.error });
        return;
      }
      onUpdateMeetingFile(meeting.id, field, {
        id: `att_${Date.now()}`,
        name: file.name,
        size: formatBytes(result.file.bytes),
        mimeType: result.file.mimeType,
        dataUrl: result.file.dataUrl,
        uploadedAt: new Date().toISOString(),
      });
    } finally {
      setFileBusy(null);
    }
  };

  const handleScanProtocol = () => {
    setScanError(null);
    const found = parseResolutionsFromProtocolText(protocolText);
    if (found.length === 0) {
      setScanError(
        'Im eingefügten Text wurde kein Beschluss im erwarteten Format erkannt. Bitte prüfen, ob jeder Beschluss mit einer "BESCHLUSS"-Zeile beginnt und "Titel:"/"Text:" enthält.'
      );
      return;
    }
    setScanCandidates(found);
  };

  const currentMemberAttendee = meeting.attendees.find((a) => a.memberId === currentMember.id);
  const acceptedCount = meeting.attendees.filter((a) => a.status === 'accepted').length;
  const declinedCount = meeting.attendees.filter((a) => a.status === 'declined').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="bg-[#003594] text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded-full">
                {meeting.type}
              </span>
              {meeting.cancelled && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-rose-600 px-2 py-0.5 rounded-full">
                  Abgesagt
                </span>
              )}
            </div>
            <h3 className="font-black text-lg sm:text-xl truncate">{meeting.title}</h3>
            <p className="text-xs text-blue-100 mt-0.5">
              {formatDate(meeting.date)} • {meeting.startTime} - {meeting.endTime} Uhr
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onToggleCancelled(meeting.id)}
              className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                meeting.cancelled
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  : 'bg-rose-600/90 hover:bg-rose-600 text-white'
              }`}
            >
              {meeting.cancelled ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span className="hidden sm:inline">Absage zurücknehmen</span>
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span className="hidden sm:inline">Sitzung absagen</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {meeting.cancelled && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-center gap-2.5 text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <p className="text-xs font-semibold">
                Diese Sitzung wurde abgesagt. Protokoll, Agenda und Tagesordnung bleiben erhalten.
              </p>
            </div>
          )}

          {/* Datum & Ort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2.5">
              <CalendarIcon className="w-4 h-4 text-[#003594] shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Datum & Zeit</span>
                <span className="font-bold text-slate-900">{formatDate(meeting.date)}</span> • {meeting.startTime} - {meeting.endTime} Uhr
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <MapPin className="w-4 h-4 text-[#003594] shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Veranstaltungsort</span>
                <span className="font-semibold text-slate-900 truncate">{meeting.location}</span>
              </div>
            </div>
          </div>

          {/* Prominent MS Teams Section */}
          <div className="bg-gradient-to-r from-[#003594] to-[#0A1E42] rounded-xl p-4 sm:p-5 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2 text-[#00A3E0] text-xs font-bold uppercase tracking-wider">
                  <Video className="w-4 h-4" />
                  <span>Aktueller Microsoft Teams Besprechungslink</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-lg">
                  Immer auffindbar für alle Vorstandsmitglieder. Tritt der Besprechung direkt bei oder kopiere die Einladung.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={meeting.teamsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="teams-launch-direct-btn"
                  className="flex items-center space-x-1.5 bg-[#00A3E0] hover:bg-[#008cc2] text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                  <span>Jetzt beitreten</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                </a>

                <a
                  href={getTeamsAppDeepLink(meeting.teamsUrl)}
                  className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold px-3.5 py-2.5 rounded-xl text-xs border border-white/20 transition-all"
                  title="Direkt in der installierten Teams-Desktop-App öffnen"
                >
                  <Video className="w-4 h-4" />
                  <span>In Teams-App öffnen</span>
                </a>

                <button
                  onClick={() => handleCopyTeamsLink(meeting.teamsUrl)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center space-x-1"
                  title="Link kopieren"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{copiedLink ? 'Kopiert!' : 'Kopieren'}</span>
                </button>
              </div>
            </div>

            {/* Teams Link URL Display and Edit */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
              {!isEditingTeamsLink ? (
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="text-slate-400 shrink-0">Link:</span>
                  <span className="font-mono text-[11px] text-[#00A3E0] truncate max-w-md">
                    {meeting.teamsUrl}
                  </span>
                  <button
                    onClick={() => {
                      setEditedTeamsLink(meeting.teamsUrl);
                      setIsEditingTeamsLink(true);
                    }}
                    className="text-[10px] text-slate-400 hover:text-white underline shrink-0"
                  >
                    Bearbeiten
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 w-full">
                  <input
                    type="text"
                    value={editedTeamsLink}
                    onChange={(e) => setEditedTeamsLink(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 text-white border border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#00A3E0]"
                    placeholder="https://teams.microsoft.com/..."
                  />
                  <button
                    onClick={handleSaveTeamsLink}
                    className="px-3 py-1.5 bg-[#00A3E0] text-slate-950 font-bold rounded-lg text-xs"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => setIsEditingTeamsLink(false)}
                    className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Abbrechen
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Automatic Calendar Sync Integration */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-800">
                <CalendarIcon className="w-4 h-4 text-[#003594]" />
                <h4 className="text-xs uppercase font-bold tracking-wider">
                  Automatisch in den Kalender eintragen
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Inkl. Teams-Link & Tagesordnung
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                onClick={() => downloadMeetingICS(meeting)}
                id="meeting-download-ics"
                className="p-3 rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#003594] transition-all flex items-center justify-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs group"
              >
                <Download className="w-4 h-4 text-[#003594] group-hover:translate-y-0.5 transition-transform" />
                <span>Outlook / Apple (.ics)</span>
              </button>

              <a
                href={getGoogleCalendarUrl(meeting)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#003594] transition-all flex items-center justify-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
              >
                <Share2 className="w-4 h-4 text-emerald-600" />
                <span>Google Kalender</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </a>

              <a
                href={getOutlookCalendarUrl(meeting)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#003594] transition-all flex items-center justify-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
              >
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>Outlook 365 Web</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Protokoll & Agenda-Datei */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                { field: 'agendaFile' as const, label: 'Agenda-Datei', hint: 'Zusätzlich zur Tagesordnung unten - z. B. eine fertige Word/PDF-Agenda.' },
                { field: 'protocolFile' as const, label: 'Sitzungsprotokoll', hint: 'Nach der Sitzung hier ablegen.' },
              ]
            ).map(({ field, label, hint }) => {
              const file = meeting[field];
              return (
                <div key={field} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-slate-700">
                    <FileText className="w-3.5 h-3.5 text-[#003594]" />
                    <h4 className="text-[11px] uppercase font-bold tracking-wider">{label}</h4>
                  </div>
                  <p className="text-[11px] text-slate-400">{hint}</p>

                  {file ? (
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="truncate text-left text-[#003594] font-semibold text-xs hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{file.name}</span>
                        <span className="text-slate-400 font-normal shrink-0">({file.size})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateMeetingFile(meeting.id, field, undefined)}
                        className="p-1 text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  ) : (
                    <DropzoneFileInput
                      accept="image/*,.pdf,.doc,.docx"
                      disabled={fileBusy === field}
                      onFile={(f) => handleUploadMeetingFile(field, f)}
                    >
                      <UploadCloud className="w-4 h-4 mx-auto text-slate-400 mb-1" strokeWidth={1.75} />
                      <span className="text-[11px] text-slate-500">
                        {fileBusy === field ? 'Wird verarbeitet…' : 'Datei auswählen oder hierher ziehen'}
                      </span>
                    </DropzoneFileInput>
                  )}
                  {fileError?.field === field && (
                    <p className="text-[11px] font-semibold text-rose-700">{fileError.message}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Beschlüsse aus Protokolltext erkennen (textbasiert, ohne KI) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-[#003594]" />
              <h4 className="text-[11px] uppercase font-bold tracking-wider">
                Beschlüsse aus Protokolltext erkennen
              </h4>
            </div>
            <p className="text-[11px] text-slate-400">
              Den von Copilot erzeugten Protokolltext hier einfügen.
            </p>

            {showProtocolFormatHint && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsFormatHintExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-left cursor-pointer"
                >
                  <span className="text-[11px] font-bold text-slate-700">
                    Format für Copilot anzeigen
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                      isFormatHintExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isFormatHintExpanded && (
                  <div className="p-3 space-y-2 bg-white">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Bringt Copilot bei, jeden Beschluss im Sitzungsprotokoll in diesem
                      festen Format auszugeben. Jeder Beschluss beginnt mit einer Zeile{' '}
                      <code className="font-mono">BESCHLUSS</code> und enthält darunter{' '}
                      <code className="font-mono">Titel:</code> sowie{' '}
                      <code className="font-mono">Text:</code> (optional{' '}
                      <code className="font-mono">Betrag:</code> und{' '}
                      <code className="font-mono">Kategorie:</code> - muss einer der sieben
                      Beschluss-Kategorien der App entsprechen).
                    </p>
                    <pre className="text-[11px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2.5 whitespace-pre-wrap">
                      {PROTOCOL_FORMAT_EXAMPLE}
                    </pre>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(PROTOCOL_FORMAT_EXAMPLE);
                        setCopiedFormat(true);
                        setTimeout(() => setCopiedFormat(false), 2000);
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-[#003594] hover:underline cursor-pointer"
                    >
                      {copiedFormat ? (
                        <>
                          <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Kopiert!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Format kopieren</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            <textarea
              value={protocolText}
              onChange={(e) => setProtocolText(e.target.value)}
              rows={5}
              placeholder={PROTOCOL_FORMAT_EXAMPLE}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003594] resize-y"
            />
            <button
              type="button"
              onClick={handleScanProtocol}
              disabled={!protocolText.trim()}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#003594]/5 hover:bg-[#003594]/10 disabled:opacity-50 text-[#003594] font-bold text-[11px] border border-[#003594]/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Beschlüsse erkennen</span>
            </button>
            {scanError && <p className="text-[11px] font-semibold text-rose-700">{scanError}</p>}
          </div>

          {/* Attendee RSVP (Teilnehmerzusagen) */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#003594]" />
                <h4 className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                  Teilnahme & Anwesenheit ({acceptedCount} zugesagt, {declinedCount} entschuldigt)
                </h4>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-500 mr-1 font-medium">Dein Status:</span>
                <button
                  onClick={() => onUpdateAttendeeStatus(meeting.id, currentMember.id, 'accepted')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                    currentMemberAttendee?.status === 'accepted'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ich nehme teil</span>
                </button>
                <button
                  onClick={() => onUpdateAttendeeStatus(meeting.id, currentMember.id, 'declined')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                    currentMemberAttendee?.status === 'declined'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Entschuldigt</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
              {members.map((m) => {
                const att = meeting.attendees.find((a) => a.memberId === m.id);
                return (
                  <div key={m.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className={`w-5 h-5 rounded-md ${m.avatarColor} text-white text-[9px] font-bold flex items-center justify-center shrink-0`}>
                        {m.initials}
                      </div>
                      <span className="font-semibold text-slate-800 truncate text-[11px]">{m.name}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      att?.status === 'accepted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : att?.status === 'declined'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {att?.status === 'accepted' ? 'Zusage' : att?.status === 'declined' ? 'Fehlt' : 'Offen'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda (Tagesordnungspunkte) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#003594]" />
                <h4 className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                  Tagesordnung & Beschlussanträge ({meeting.agenda.length} TOPs)
                </h4>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Geplante Gesamtdauer: {meeting.agenda.reduce((acc, curr) => acc + curr.durationMin, 0)} Min.
              </span>
            </div>

            <div className="space-y-2.5">
              {meeting.agenda.map((top) => (
                <div
                  key={top.id}
                  className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-3">
                      <span className="font-mono font-bold text-xs text-white bg-[#003594] px-2 py-1 rounded-md shrink-0">
                        {top.topNumber}
                      </span>
                      <div>
                        <h5 className="font-bold text-xs sm:text-sm text-slate-900">
                          {top.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Referent: <strong>{top.presenter}</strong> • Dauer: {top.durationMin} Minuten
                        </p>
                        {top.notes && (
                          <p className="text-xs text-slate-600 mt-1 italic">
                            {top.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {top.resolutionId && (
                      <button
                        onClick={() => onSelectResolution(top.resolutionId!)}
                        className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-2.5 py-1 rounded-lg shrink-0 flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Beschluss {top.resolutionNumber || ''}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      <ProtocolScanResultsModal
        isOpen={scanCandidates !== null}
        onClose={() => setScanCandidates(null)}
        candidates={scanCandidates || []}
        meetingLabel={meeting.title}
        currentMember={currentMember}
        members={members}
        existingResolutionCount={resolutions.length}
        onCreateResolution={onCreateResolution}
      />
    </div>
  );
};
