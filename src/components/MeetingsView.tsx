import React, { useState } from 'react';
import {
  BoardMember,
  Meeting,
  Resolution,
  AgendaItem,
  MeetingAttachment
} from '../types';
import {
  formatDate,
  formatDateTime
} from '../utils/formatters';
import {
  downloadMeetingICS,
  getGoogleCalendarUrl,
  getOutlookCalendarUrl
} from '../utils/calendar';
import { prepareFileForStorage, formatBytes } from '../utils/fileStorage';
import { DropzoneFileInput } from './DropzoneFileInput';
import { FilePreviewModal, PreviewableFile } from './FilePreviewModal';
import {
  Calendar as CalendarIcon,
  Video,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Clock,
  MapPin,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight,
  Share2,
  Download,
  UploadCloud,
  Trash2,
  Eye
} from 'lucide-react';

interface MeetingsViewProps {
  currentMember: BoardMember;
  members: BoardMember[];
  meetings: Meeting[];
  resolutions: Resolution[];
  onOpenNewMeeting: () => void;
  onUpdateAttendeeStatus: (meetingId: string, memberId: string, status: 'accepted' | 'declined' | 'tentative') => void;
  onSelectResolution: (resId: string) => void;
  onUpdateMeetingTeamsLink: (meetingId: string, newUrl: string) => void;
  onUpdateMeetingFile: (
    meetingId: string,
    field: 'protocolFile' | 'agendaFile',
    file: MeetingAttachment | undefined
  ) => void;
  onOpenTeamsSettings?: () => void;
  defaultTeamsUrl?: string;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({
  currentMember,
  members,
  meetings,
  resolutions,
  onOpenNewMeeting,
  onUpdateAttendeeStatus,
  onSelectResolution,
  onUpdateMeetingTeamsLink,
  onUpdateMeetingFile,
  onOpenTeamsSettings,
  defaultTeamsUrl,
}) => {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(meetings[0]?.id || '');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isEditingTeamsLink, setIsEditingTeamsLink] = useState<boolean>(false);
  const [editedTeamsLink, setEditedTeamsLink] = useState<string>('');
  const [fileBusy, setFileBusy] = useState<'protocolFile' | 'agendaFile' | null>(null);
  const [fileError, setFileError] = useState<{ field: 'protocolFile' | 'agendaFile'; message: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewableFile | null>(null);

  const activeMeeting = meetings.find((m) => m.id === selectedMeetingId) || meetings[0];

  const handleCopyTeamsLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveTeamsLink = () => {
    if (!activeMeeting || !editedTeamsLink.trim()) return;
    onUpdateMeetingTeamsLink(activeMeeting.id, editedTeamsLink.trim());
    setIsEditingTeamsLink(false);
  };

  const handleUploadMeetingFile = async (
    field: 'protocolFile' | 'agendaFile',
    file: File
  ) => {
    if (!activeMeeting) return;
    setFileError(null);
    setFileBusy(field);
    try {
      const result = await prepareFileForStorage(file);
      if (result.ok === false) {
        setFileError({ field, message: result.error });
        return;
      }
      onUpdateMeetingFile(activeMeeting.id, field, {
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

  // Get current member attendee status for active meeting
  const currentMemberAttendee = activeMeeting?.attendees.find((a) => a.memberId === currentMember.id);
  const acceptedCount = activeMeeting?.attendees.filter((a) => a.status === 'accepted').length || 0;
  const declinedCount = activeMeeting?.attendees.filter((a) => a.status === 'declined').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <CalendarIcon className="w-6 h-6 text-[#003594]" strokeWidth={1.75} />
            <span>Sitzungen</span>
          </h2>
        </div>

        <div className="flex items-center space-x-2.5">
          {onOpenTeamsSettings && (
            <button
              onClick={onOpenTeamsSettings}
              id="teams-settings-btn"
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-2xs cursor-pointer"
            >
              <Video className="w-4 h-4 text-[#003594]" strokeWidth={1.75} />
              <span>Teams-Link</span>
            </button>
          )}

          <button
            onClick={onOpenNewMeeting}
            id="meetings-new-btn"
            className="flex items-center justify-center space-x-2 bg-[#003594] hover:bg-[#00266B] text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#00A3E0]" strokeWidth={1.75} />
            <span>Sitzung anlegen</span>
          </button>
        </div>
      </div>

      {/* Main Layout or Empty State */}
      {meetings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="w-14 h-14 bg-blue-50 text-[#003594] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="w-7 h-7" strokeWidth={1.75} />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Noch keine Vorstandssitzungen angelegt</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            Plane die nächste reguläre Vorstandssitzung mit automatischer Tagesordnung, Beschlussverknüpfung und MS Teams Besprechungslink.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              onClick={onOpenNewMeeting}
              className="px-5 py-2.5 bg-[#003594] hover:bg-[#00266B] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#00A3E0]" strokeWidth={1.75} />
              <span>Erste Sitzung anlegen</span>
            </button>
            {onOpenTeamsSettings && (
              <button
                onClick={onOpenTeamsSettings}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-xl text-xs sm:text-sm transition-all flex items-center space-x-2 cursor-pointer"
              >
                <Video className="w-4 h-4 text-[#003594]" strokeWidth={1.75} />
                <span>Teams-Link konfigurieren</span>
              </button>
            )}
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Meetings Selector (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
            Termine ({meetings.length})
          </p>

          {meetings.map((meeting) => {
            const isSelected = activeMeeting?.id === meeting.id;
            return (
              <div
                key={meeting.id}
                onClick={() => {
                  setSelectedMeetingId(meeting.id);
                  setIsEditingTeamsLink(false);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-blue-50/50 border-[#003594] shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#003594] bg-blue-100/70 px-2 py-0.5 rounded">
                    {meeting.type}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {formatDate(meeting.date)}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-2 line-clamp-1">
                  {meeting.title}
                </h3>

                <div className="mt-2 text-xs text-slate-500 flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{meeting.startTime} - {meeting.endTime} Uhr</span>
                  </span>
                  <span>•</span>
                  <span>{meeting.agenda.length} TOPs</span>
                </div>

                {/* MS Teams Badge */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-indigo-700 font-semibold flex items-center space-x-1">
                    <Video className="w-3.5 h-3.5 text-[#00A3E0]" />
                    <span>MS Teams aktiv</span>
                  </span>
                  <span className="text-slate-400 flex items-center">
                    Details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Meeting Detail & Agenda & Calendar Sync (8 Cols) */}
        <div className="lg:col-span-8">
          {activeMeeting ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
              {/* Meeting Header */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#003594] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    {activeMeeting.type}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Wirtschaftsjunioren Offenbach
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {activeMeeting.title}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center space-x-2.5">
                    <CalendarIcon className="w-4 h-4 text-[#003594] shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Datum & Zeit</span>
                      <span className="font-bold text-slate-900">{formatDate(activeMeeting.date)}</span> • {activeMeeting.startTime} - {activeMeeting.endTime} Uhr
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <MapPin className="w-4 h-4 text-[#003594] shrink-0" />
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Veranstaltungsort</span>
                      <span className="font-semibold text-slate-900 truncate">{activeMeeting.location}</span>
                    </div>
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
                      href={activeMeeting.teamsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      id="teams-launch-direct-btn"
                      className="flex items-center space-x-1.5 bg-[#00A3E0] hover:bg-[#008cc2] text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                    >
                      <Video className="w-4 h-4" />
                      <span>Jetzt beitreten</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                    </a>

                    <button
                      onClick={() => handleCopyTeamsLink(activeMeeting.teamsUrl)}
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
                        {activeMeeting.teamsUrl}
                      </span>
                      <button
                        onClick={() => {
                          setEditedTeamsLink(activeMeeting.teamsUrl);
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
                  {/* .ICS Download (Outlook, Apple, Thunderbird) */}
                  <button
                    onClick={() => downloadMeetingICS(activeMeeting)}
                    id="meeting-download-ics"
                    className="p-3 rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#003594] transition-all flex items-center justify-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs group"
                  >
                    <Download className="w-4 h-4 text-[#003594] group-hover:translate-y-0.5 transition-transform" />
                    <span>Outlook / Apple (.ics)</span>
                  </button>

                  {/* Google Calendar Web Link */}
                  <a
                    href={getGoogleCalendarUrl(activeMeeting)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#003594] transition-all flex items-center justify-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer shadow-2xs"
                  >
                    <Share2 className="w-4 h-4 text-emerald-600" />
                    <span>Google Kalender</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  </a>

                  {/* Outlook Web / 365 Link */}
                  <a
                    href={getOutlookCalendarUrl(activeMeeting)}
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
                  const file = activeMeeting[field];
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
                            onClick={() => onUpdateMeetingFile(activeMeeting.id, field, undefined)}
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

              {/* Attendee RSVP (Teilnehmerzusagen) */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-[#003594]" />
                    <h4 className="text-xs uppercase font-bold text-slate-700 tracking-wider">
                      Teilnahme & Anwesenheit ({acceptedCount} zugesagt, {declinedCount} entschuldigt)
                    </h4>
                  </div>
                  
                  {/* Current Member RSVP Buttons */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-slate-500 mr-1 font-medium">Dein Status:</span>
                    <button
                      onClick={() => onUpdateAttendeeStatus(activeMeeting.id, currentMember.id, 'accepted')}
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
                      onClick={() => onUpdateAttendeeStatus(activeMeeting.id, currentMember.id, 'declined')}
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
                    const att = activeMeeting.attendees.find((a) => a.memberId === m.id);
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
                      Tagesordnung & Beschlussanträge ({activeMeeting.agenda.length} TOPs)
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    Geplante Gesamtdauer: {activeMeeting.agenda.reduce((acc, curr) => acc + curr.durationMin, 0)} Min.
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeMeeting.agenda.map((top, idx) => (
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
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 text-sm">
              Wähle eine Vorstandssitzung aus.
            </div>
          )}
        </div>
      </div>
      )}

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
};
