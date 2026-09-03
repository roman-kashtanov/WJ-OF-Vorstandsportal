import React, { useState, useRef, useEffect } from 'react';
import { InAppNotification, ActiveTab, BoardMember, Resolution, VoteType } from '../types';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Vote, 
  Receipt, 
  Calendar, 
  Sparkles, 
  Trash2, 
  X, 
  ExternalLink, 
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  ChevronRight
} from 'lucide-react';
import { formatRelativeTime, formatDate } from '../utils/formatters';

interface NotificationCenterProps {
  notifications: InAppNotification[];
  resolutions: Resolution[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearRead: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  onSelectResolution?: (id: string) => void;
  onSelectInvoice?: (id: string) => void;
  onSelectMeeting?: (id: string) => void;
  onVote?: (resolutionId: string, vote: VoteType) => void;
  currentMember: BoardMember;
  onOpenSettings?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  resolutions,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearRead,
  onSelectTab,
  onSelectResolution,
  onSelectInvoice,
  onSelectMeeting,
  onVote,
  currentMember,
  onOpenSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending_resolutions' | 'all_logs'>('pending_resolutions');
  const panelRef = useRef<HTMLDivElement>(null);

  // Filter pending resolutions where the current member has NOT voted yet AND is eligible to vote
  const unvotedResolutions = resolutions.filter((r) => {
    if (r.isArchived) return false;
    if (r.status !== 'in_abstimmung') return false;
    if (r.votes[currentMember.id]) return false;
    if (r.eligibleVoterIds && r.eligibleVoterIds.length > 0 && !r.eligibleVoterIds.includes(currentMember.id)) {
      return false;
    }
    return true;
  });

  // Unerledigte Beschlüsse Anzahl
  const pendingResolutionsCount = unvotedResolutions.length;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notif: InAppNotification) => {
    onMarkAsRead(notif.id);
    if (notif.targetTab) {
      onSelectTab(notif.targetTab);
    }
    if (notif.targetId) {
      if (notif.type === 'resolution' || notif.type === 'vote') {
        if (onSelectResolution) onSelectResolution(notif.targetId);
      } else if (notif.type === 'invoice') {
        if (onSelectInvoice) onSelectInvoice(notif.targetId);
      } else if (notif.type === 'meeting') {
        if (onSelectMeeting) onSelectMeeting(notif.targetId);
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Trigger Button with ONLY pending resolution count */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        title="Unerledigte Beschlüsse & Mitteilungen"
      >
        <Bell className="w-5 h-5" strokeWidth={1.75} />
        {pendingResolutionsCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-xs ring-2 ring-white">
            {pendingResolutionsCount}
          </span>
        )}
      </button>

      {/* MODAL / NEW WINDOW VIEW WHEN CLICKED */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[94vw] sm:w-[460px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs max-h-[85vh] flex flex-col">
          
          {/* Top Header */}
          <div className="bg-[#003594] text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <Bell className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight">Mitteilungsfenster</h4>
                <p className="text-[10px] text-blue-200">
                  {pendingResolutionsCount > 0 
                    ? `${pendingResolutionsCount} Beschluss-Abstimmungen noch offen` 
                    : 'Alle Beschluss-Abstimmungen erledigt'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('pending_resolutions')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'pending_resolutions'
                  ? 'bg-white text-[#003594] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Vote className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Unerledigte Beschlüsse ({pendingResolutionsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all_logs')}
              className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'all_logs'
                  ? 'bg-white text-[#003594] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Verlauf & Aktivitäten ({notifications.length})</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto p-3 space-y-2.5 flex-1">
            
            {/* TAB 1: UNERLEDIGTE BESCHLÜSSE */}
            {activeTab === 'pending_resolutions' && (
              <div className="space-y-2.5">
                {unvotedResolutions.length > 0 ? (
                  unvotedResolutions.map((res) => (
                    <div
                      key={res.id}
                      className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs bg-white text-[#003594] px-1.5 py-0.5 rounded border border-slate-200">
                          {res.number}
                        </span>
                        <span className="text-[10px] text-amber-900 font-bold bg-amber-200/80 px-2 py-0.5 rounded-full">
                        </span>
                      </div>

                      <div>
                        <h5 className="font-bold text-slate-900 text-xs">
                          {res.title}
                        </h5>
                        <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                          {res.motionText}
                        </p>
                      </div>

                      {/* Direct 1-Click Vote Buttons */}
                      {onVote && (
                        <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-500">
                            Direkt abstimmen:
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onVote(res.id, 'yes');
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Mit Ja stimmen"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>Ja</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onVote(res.id, 'no');
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Mit Nein stimmen"
                            >
                              <ThumbsDown className="w-3 h-3" />
                              <span>Nein</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onVote(res.id, 'abstain');
                              }}
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
                              title="Enthalten"
                            >
                              <span>Enth.</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-500 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-800">
                      Alle Beschluss-Abstimmungen erledigt!
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      Es liegen aktuell keine offenen Umlaufbeschlüsse vor, die deine Stimme erfordern.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ALLE MITTEILUNGEN */}
            {activeTab === 'all_logs' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100">
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Letzte System-Mitteilungen
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={onMarkAllAsRead}
                      className="text-[10px] text-[#003594] hover:underline font-bold"
                    >
                      Alle als gelesen
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={onClearRead}
                      className="text-[10px] text-rose-600 hover:underline font-bold"
                    >
                      Gelesene löschen
                    </button>
                  </div>
                </div>

                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        n.isRead
                          ? 'bg-slate-50 border-slate-200 text-slate-600'
                          : 'bg-blue-50/70 border-blue-200 text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs">{n.title}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatRelativeTime(n.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-6 text-slate-400">Keine Mitteilungen vorhanden</p>
                )}
              </div>
            )}

          </div>

          {/* Footer Action */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={() => {
                onSelectTab('resolutions');
                setIsOpen(false);
              }}
              className="text-xs font-bold text-[#003594] hover:underline flex items-center space-x-1"
            >
              <span>Zur Beschlussübersicht</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenSettings) onOpenSettings();
                setIsOpen(false);
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
            >
              Benachrichtigungseinstellungen
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
