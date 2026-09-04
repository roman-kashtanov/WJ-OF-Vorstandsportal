import React from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Meeting } from '../types';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  FileText, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface QuickAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  onOpenResolution?: (resId: string) => void;
  onNavigateToMeetings?: () => void;
}

export const QuickAgendaModal: React.FC<QuickAgendaModalProps> = ({
  isOpen,
  onClose,
  meeting,
  onOpenResolution,
  onNavigateToMeetings,
}) => {
  useBodyScrollLock(isOpen && !!meeting);
  if (!isOpen || !meeting) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#003594] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#00A3E0]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
                Tagesordnung (Agenda)
              </span>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {meeting.title}
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

        {/* Meeting Quick Meta */}
        <div className="bg-blue-50/60 border-b border-blue-100 p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#003594] shrink-0" />
            <span>
              {new Date(meeting.date).toLocaleDateString('de-DE', {
                weekday: 'short',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-[#003594] shrink-0" />
            <span>{meeting.startTime} – {meeting.endTime} Uhr</span>
          </div>

          <div className="flex items-center space-x-2 truncate">
            <Video className="w-4 h-4 text-[#003594] shrink-0" />
            <span className="truncate">Online (MS Teams)</span>
          </div>
        </div>

        {/* Agenda List */}
        <div className="p-6 space-y-4 max-h-[60dvh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Tagesordnungspunkte ({meeting.agenda.length} TOPs)
            </h4>
            <span className="text-xs text-slate-500 font-medium">
              Gesamtdauer: ~{meeting.agenda.reduce((acc, curr) => acc + (curr.durationMin || 0), 0)} Min.
            </span>
          </div>

          <div className="space-y-2.5">
            {meeting.agenda.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <span className="px-2 py-0.5 rounded-lg bg-[#003594] text-white text-[11px] font-mono font-bold shrink-0 mt-0.5">
                      {item.topNumber}
                    </span>
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                        {item.title}
                      </h5>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Referent: <strong className="text-slate-700">{item.presenter}</strong></span>
                        <span>•</span>
                        <span>Dauer: <strong className="text-slate-700">{item.durationMin} Min.</strong></span>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-slate-600 mt-1.5 bg-white p-2 rounded-lg border border-slate-100 italic">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.resolutionNumber && (
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-[10px] font-bold">
                        <span>Beschluss: {item.resolutionNumber}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with Teams link & Full View */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          {meeting.teamsUrl && (
            <a
              href={meeting.teamsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#464EB8] hover:bg-[#3B429F] text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Video className="w-4 h-4" />
              <span>MS Teams Besprechung beitreten</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          )}

          <div className="flex items-center space-x-2">
            {onNavigateToMeetings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToMeetings();
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
              >
                <span>Alle Sitzungen anzeigen</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
