import React, { useMemo, useState } from 'react';
import {
  BoardMember,
  Meeting,
  Resolution,
  MeetingAttachment
} from '../types';
import {
  formatDate
} from '../utils/formatters';
import { MeetingDetailModal } from './MeetingDetailModal';
import {
  Calendar as CalendarIcon,
  Video,
  Plus,
  Clock,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface MeetingsViewProps {
  currentMember: BoardMember;
  members: BoardMember[];
  meetings: Meeting[];
  nextMeeting: Meeting | null;
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
  onCreateResolution: (
    data: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>
  ) => void;
  onToggleMeetingCancelled: (meetingId: string) => void;
  onOpenTeamsSettings?: () => void;
  defaultTeamsUrl?: string;
  showProtocolFormatHint?: boolean;
}

/**
 * Zeigt standardmäßig nur die nächste, tatsächlich bevorstehende Sitzung
 * als Karte - alle weiteren (auch vergangene/abgesagte) Termine sind
 * über "Weitere Termine" abrufbar, nicht permanent aufgeklappt. Details
 * öffnen sich in einem eigenen Fenster (MeetingDetailModal.tsx), statt
 * dauerhaft als zweite Spalte eingeblendet zu sein - Nutzerwunsch nach
 * Verwirrung durch eine lange Serie (Termine bis 2028) in einer
 * permanent sichtbaren Liste.
 */
export const MeetingsView: React.FC<MeetingsViewProps> = ({
  currentMember,
  members,
  meetings,
  nextMeeting,
  resolutions,
  onOpenNewMeeting,
  onUpdateAttendeeStatus,
  onSelectResolution,
  onUpdateMeetingTeamsLink,
  onUpdateMeetingFile,
  onCreateResolution,
  onToggleMeetingCancelled,
  onOpenTeamsSettings,
  showProtocolFormatHint = true,
}) => {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(false);

  const sortedMeetings = useMemo(
    () => [...meetings].sort((a, b) => a.date.localeCompare(b.date)),
    [meetings]
  );
  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId) || null;
  const today = new Date().toISOString().slice(0, 10);

  const renderMeetingCard = (meeting: Meeting) => {
    const isPast = meeting.date < today;
    return (
      <div
        key={meeting.id}
        onClick={() => setSelectedMeetingId(meeting.id)}
        className={`p-4 rounded-xl border transition-all cursor-pointer text-left bg-white hover:border-slate-300 ${
          meeting.cancelled ? 'border-rose-200 opacity-75' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#003594] bg-blue-100/70 px-2 py-0.5 rounded">
            {meeting.type}
          </span>
          <div className="flex items-center gap-1.5">
            {meeting.cancelled && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                Abgesagt
              </span>
            )}
            {!meeting.cancelled && isPast && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Vergangen
              </span>
            )}
            <span className={`text-xs font-bold ${meeting.cancelled ? 'text-rose-700 line-through' : 'text-slate-900'}`}>
              {formatDate(meeting.date)}
            </span>
          </div>
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
  };

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

      {/* Empty State */}
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
        <div className="space-y-5 max-w-2xl">
          {/* Nächste Sitzung */}
          <div>
            <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-3">
              Nächste Sitzung
            </p>
            {nextMeeting ? (
              renderMeetingCard(nextMeeting)
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                <p className="text-sm text-slate-500">Keine bevorstehende Sitzung geplant.</p>
                <button
                  onClick={onOpenNewMeeting}
                  className="mt-3 px-4 py-2 bg-[#003594] hover:bg-[#00266B] text-white font-bold rounded-xl text-xs transition-all shadow-xs inline-flex items-center space-x-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#00A3E0]" strokeWidth={1.75} />
                  <span>Sitzung anlegen</span>
                </button>
              </div>
            )}
          </div>

          {/* Weitere Termine, auf Wunsch abrufbar */}
          <div>
            <button
              type="button"
              onClick={() => setIsAllExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-left cursor-pointer transition-all"
            >
              <span className="text-xs font-bold text-slate-700">
                Weitere Termine anzeigen ({sortedMeetings.length})
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                  isAllExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isAllExpanded && (
              <div className="space-y-3 mt-3">
                {sortedMeetings.map(renderMeetingCard)}
              </div>
            )}
          </div>
        </div>
      )}

      <MeetingDetailModal
        meeting={selectedMeeting}
        onClose={() => setSelectedMeetingId(null)}
        currentMember={currentMember}
        members={members}
        resolutions={resolutions}
        onUpdateAttendeeStatus={onUpdateAttendeeStatus}
        onUpdateMeetingTeamsLink={onUpdateMeetingTeamsLink}
        onUpdateMeetingFile={onUpdateMeetingFile}
        onCreateResolution={onCreateResolution}
        onSelectResolution={onSelectResolution}
        onToggleCancelled={onToggleMeetingCancelled}
        showProtocolFormatHint={showProtocolFormatHint}
      />
    </div>
  );
};
