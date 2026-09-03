import React, { useState, useEffect } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Meeting } from '../types';
import { 
  Video, 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Save, 
  Sparkles, 
  Calendar, 
  Clock, 
  Link2, 
  AlertCircle,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

interface TeamsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTeamsUrl: string;
  onSaveDefaultTeamsUrl: (url: string, applyToAllMeetings: boolean) => void;
  meetings: Meeting[];
  onUpdateMeetingTeamsLink: (meetingId: string, newUrl: string) => void;
}

export const TeamsSettingsModal: React.FC<TeamsSettingsModalProps> = ({
  isOpen,
  onClose,
  defaultTeamsUrl,
  onSaveDefaultTeamsUrl,
  meetings,
  onUpdateMeetingTeamsLink,
}) => {
  const [url, setUrl] = useState<string>(defaultTeamsUrl || '');
  const [applyToAll, setApplyToAll] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(defaultTeamsUrl || '');
      setSavedSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, defaultTeamsUrl]);

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const handleCopy = () => {
    if (!url.trim()) return;
    navigator.clipboard.writeText(url.trim());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleTestLink = () => {
    if (!url.trim()) return;
    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setErrorMessage('Bitte gib einen gültigen MS Teams Besprechungslink ein.');
      return;
    }

    onSaveDefaultTeamsUrl(cleanUrl, applyToAll);
    setSavedSuccess(true);
    setErrorMessage(null);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const upcomingMeetings = meetings.filter((m) => m.isUpcoming);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#003594] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#00A3E0]">
              <Video className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                MS Teams Link Einstellungen
              </h3>
              <p className="text-xs text-blue-100">
                Standard-Besprechungslink für alle Vorstandssitzungen
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Main URL Input Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Link2 className="w-4 h-4 text-[#003594]" strokeWidth={1.75} />
                  <span>Dauerhafter MS Teams Link</span>
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  Wird bei neuen Sitzungen vorausgefüllt
                </span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  className="w-full text-base sm:text-sm px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003594] focus:border-[#003594] transition-all font-mono"
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  <span>{errorMessage}</span>
                </p>
              )}
            </div>

            {/* Quick Action Buttons for the URL */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!url.trim()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.75} />
                    <span className="text-emerald-700">Link kopiert!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                    <span>Link kopieren</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestLink}
                disabled={!url.trim()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                <span>Link testen (im Browser öffnen)</span>
              </button>
            </div>
          </div>

          {/* Sync Option to existing meetings */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 space-y-2.5">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-blue-300 text-[#003594] focus:ring-[#003594] cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-[#003594] block">
                  Auch auf alle anstehenden Vorstandssitzungen übertragen
                </span>
                <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                  Aktualisiert den Besprechungslink automatisch für alle aktuell geplanten Sitzungen in der Kalenderübersicht.
                </span>
              </div>
            </label>
          </div>

          {/* Upcoming Meetings Preview if any exist */}
          {upcomingMeetings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                <span>Anstehende Sitzungen ({upcomingMeetings.length})</span>
              </h4>
              
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {upcomingMeetings.map((meeting) => (
                  <div 
                    key={meeting.id} 
                    className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate">{meeting.title}</p>
                      <p className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                        <span>{formatDate(meeting.date)}</span>
                        <span>•</span>
                        <span>{meeting.startTime} - {meeting.endTime} Uhr</span>
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center space-x-1">
                      {meeting.teamsUrl ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Link aktiv
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Kein Link
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Status / Notification */}
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={1.75} />
              <span>MS Teams Link erfolgreich gespeichert & synchronisiert!</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#003594] hover:bg-[#002870] rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" strokeWidth={1.75} />
              <span>Link speichern</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
