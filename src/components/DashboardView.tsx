import React, { useState } from 'react';
import { 
  BoardMember, 
  Resolution, 
  Invoice, 
  Meeting, 
  ActiveTab 
} from '../types';
import { formatDate } from '../utils/formatters';
import { subscribeToPushServer } from '../utils/pwaNotifications';
import { BellRing } from 'lucide-react';
import { downloadMeetingICS } from '../utils/calendar';
import { 
  Vote, 
  Receipt, 
  Calendar, 
  Video, 
  AlertCircle, 
  Plus, 
  Download,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DashboardViewProps {
  currentMember: BoardMember;
  members: BoardMember[];
  resolutions: Resolution[];
  invoices: Invoice[];
  nextMeeting: Meeting | null;
  onNavigate: (tab: ActiveTab) => void;
  onOpenNewResolution: () => void;
  onOpenNewInvoice: () => void;
  onSelectResolution: (resId: string) => void;
  onSelectInvoice: (invId: string) => void;
  onOpenQuickAgenda: () => void;
  onOpenTeamsSettings?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentMember,
  members,
  resolutions,
  invoices,
  nextMeeting,
  onNavigate,
  onOpenNewResolution,
  onOpenNewInvoice,
  onSelectResolution,
  onOpenQuickAgenda,
}) => {
  // Pending votes for current member
    const [expandedResId, setExpandedResId] = useState<string | null>(null);

  const openResolutions = resolutions
    .filter((res) => !res.isArchived && res.status === 'in_abstimmung')
    .sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());

  const pendingResolutionsForMember = resolutions.filter((res) => {
    if (res.isArchived) return false;
    const isEligible = !res.eligibleVoterIds || res.eligibleVoterIds.length === 0 || res.eligibleVoterIds.includes(currentMember.id);
    return res.status === 'in_abstimmung' && isEligible && !res.votes[currentMember.id];
  });

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      

      
      {/* 1. HINWEIS WENN STIMME OFFEN */}
      {pendingResolutionsForMember.length > 0 && (
        <div 
          onClick={() => onNavigate('resolutions')}
          className="bg-amber-500/10 border border-amber-300/80 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-500/15 transition-all shadow-2xs active:scale-99"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" strokeWidth={2} />
            <div className="min-w-0">
              <span className="font-bold text-amber-950 text-xs sm:text-sm block truncate">
                {pendingResolutionsForMember.length === 1
                  ? '1 Beschluss wartet auf deine Stimme'
                  : `${pendingResolutionsForMember.length} Beschlüsse warten auf deine Stimme`}
              </span>
              <span className="text-[11px] text-amber-800">Tippen, um jetzt abzustimmen</span>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-700 text-white font-bold text-xs rounded-xl shrink-0">
            Abstimmen
          </span>
        </div>
      )}

      {/* 2. SCHNELLE HAUPTAKTIONEN: BESCHLUSS FASSEN & RECHNUNG HOCHLADEN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        
        {/* BUTTON 1: BESCHLUSS FASSEN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-2">
          <button
            type="button"
            onClick={onOpenNewResolution}
            className="w-full py-3.5 px-4 bg-[#003594] hover:bg-[#00266B] active:scale-98 text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs touch-manipulation"
          >
            <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
            <span>Beschluss fassen</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('resolutions')}
            className="w-full py-1 text-slate-500 hover:text-[#003594] font-semibold text-xs text-center cursor-pointer transition-colors flex items-center justify-center space-x-1"
          >
            <span>Beschlüsse ansehen</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* BUTTON 2: RECHNUNG HOCHLADEN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-2">
          <button
            type="button"
            onClick={onOpenNewInvoice}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-black active:scale-98 text-white font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs touch-manipulation"
          >
            <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
            <span>Rechnung hochladen</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('invoices')}
            className="w-full py-1 text-slate-500 hover:text-slate-900 font-semibold text-xs text-center cursor-pointer transition-colors flex items-center justify-center space-x-1"
          >
            <span>Belege ansehen</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

      </div>

      {/* 3. MICROSOFT TEAMS LINK (ONLINE-SITZUNG) */}
      {nextMeeting && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#464EB8]/10 text-[#464EB8] flex items-center justify-center shrink-0">
              <Video className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {nextMeeting.title}
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {formatDate(nextMeeting.date)} • {nextMeeting.startTime} Uhr</p></div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-stretch sm:self-auto">
            {nextMeeting.teamsUrl && (
              <a
                href={nextMeeting.teamsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none px-4 py-2.5 bg-[#464EB8] hover:bg-[#3B429F] text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-2xs transition-colors"
              >
                <Video className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Microsoft Teams Link</span>
              </a>
            )}

            <button
              type="button"
              onClick={onOpenQuickAgenda}
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1 transition-colors cursor-pointer"
              title="Tagesordnung anzeigen"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" strokeWidth={2} />
              <span>Agenda</span>
            </button>

            <button
              type="button"
              onClick={() => downloadMeetingICS(nextMeeting)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Kalendereintrag (.ics) herunterladen"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}



      {/* 4. LAUFENDE BESCHLÜSSE (MINIMALISTISCHE LISTE) */}
      {openResolutions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-700 px-1 uppercase tracking-wider">
            Offene Beschlüsse ({openResolutions.length})
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden divide-y divide-slate-100">
            {openResolutions.map((res) => {
              const isExpanded = expandedResId === res.id;
              // Calculate basic stats
              const yesVotes = Object.values(res.votes).filter((v: any) => v.vote === 'yes').length;
              const noVotes = Object.values(res.votes).filter((v: any) => v.vote === 'no').length;
              
              return (
                <div key={res.id} className="flex flex-col transition-all">
                  <button
                    type="button"
                    onClick={() => setExpandedResId(isExpanded ? null : res.id)}
                    className="w-full px-4 py-3 sm:py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors focus:outline-none"
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#003594] flex items-center justify-center shrink-0">
                        <Vote className="w-4 h-4" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {res.title}</p></div>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="hidden sm:flex items-center space-x-2 mr-2">
                         <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{yesVotes} Ja</span>
                         <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">{noVotes} Nein</span>
                      </div>
                      <div className="text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-50 bg-slate-50/50 animate-in fade-in slide-in-from-top-2">
                      <p className="text-xs text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                        {res.description}</p><div className="flex items-center justify-between">
                         <div className="sm:hidden flex items-center space-x-2">
                           <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{yesVotes} Ja</span>
                           <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">{noVotes} Nein</span>
                         </div>
                         <button
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             onSelectResolution(res.id);
                             // If App.tsx supports it, we might also want to set it active
                           }}
                           className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors ml-auto flex items-center space-x-1 shadow-sm"
                         >
                           <span>Zum Beschluss</span>
                           <ArrowRight className="w-3 h-3" />
                         </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

