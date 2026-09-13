import React from 'react';
import {
  BoardMember,
  Resolution,
  Invoice,
  Meeting,
  ActiveTab,
  Subsidy,
  SubsidyKind
} from '../types';
import { ofKind, SUBSIDY_STAGES } from '../utils/subsidies';
import {
  RESOLUTION_SECTIONS,
  ResolutionSectionKey,
  countResolutionSection
} from '../utils/resolutionSections';
import { formatDate } from '../utils/formatters';
import { downloadMeetingICS } from '../utils/calendar';
import { DashboardModule, DashboardModuleRow } from './DashboardModule';
import {
  Vote,
  HandCoins,
  Wallet,
  Video,
  AlertCircle,
  Plus,
  Download,
  FileText,
  ArrowRight
} from 'lucide-react';

/**
 * Wohin ein Tipp auf ein Modul der Uebersicht springt: Reiter samt
 * vorausgewaehltem Bereich (Beschluesse) bzw. Phase und Jahr (Zuschuesse,
 * Auslagen).
 */
export type OverviewTarget =
  | { tab: 'resolutions'; section: ResolutionSectionKey }
  | { tab: 'subsidies' | 'expenses'; stage: string; year?: number };

interface DashboardViewProps {
  currentMember: BoardMember;
  members: BoardMember[];
  resolutions: Resolution[];
  invoices: Invoice[];
  /** Zuschuesse UND Auslagen - fuer die beiden Module. */
  subsidies: Subsidy[];
  nextMeeting: Meeting | null;
  onNavigate: (tab: ActiveTab) => void;
  onNavigateTo: (target: OverviewTarget) => void;
  onOpenNewResolution: () => void;
  onOpenNewInvoice: () => void;
  onSelectResolution: (resId: string) => void;
  onSelectInvoice: (invId: string) => void;
  onOpenQuickAgenda: () => void;
  onOpenTeamsSettings?: () => void;
}

const STAGE_DOT: Record<string, string> = {
  offen: 'bg-amber-400',
  geprueft: 'bg-blue-500',
  im_beschluss: 'bg-violet-500',
  zur_zahlung: 'bg-teal-500',
};

const RESOLUTION_DOT: Record<ResolutionSectionKey, string> = {
  offen: 'bg-amber-400',
  buchhaltung: 'bg-emerald-500',
  alle: 'bg-slate-300',
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentMember,
  resolutions,
  subsidies,
  nextMeeting,
  onNavigate,
  onNavigateTo,
  onOpenNewResolution,
  onOpenNewInvoice,
  onOpenQuickAgenda,
}) => {
  const pendingResolutionsForMember = resolutions.filter((res) => {
    if (res.isArchived) return false;
    const isEligible = !res.eligibleVoterIds || res.eligibleVoterIds.length === 0 || res.eligibleVoterIds.includes(currentMember.id);
    return res.status === 'in_abstimmung' && isEligible && !res.votes[currentMember.id];
  });

  /**
   * Module unter der Vorstandssitzung: nur Zaehler, nichts bearbeitbar.
   * Beschluesse stehen immer oben, darunter Zuschuesse und Auslagen.
   */
  const resolutionRows: DashboardModuleRow[] = RESOLUTION_SECTIONS
    .filter((section) => section.key !== 'alle')
    .map((section) => ({
      key: section.key,
      label: section.label,
      count: countResolutionSection(resolutions, section.key),
      dotClass: RESOLUTION_DOT[section.key],
      onClick: () => onNavigateTo({ tab: 'resolutions', section: section.key }),
    }));

  /**
   * Gezaehlt wird ueber alle Jahre, damit ein Antrag vom Dezember im Januar
   * nicht verschwindet. Beim Sprung wird das neueste betroffene Jahr
   * vorausgewaehlt, weil die Zuschuss-Ansicht immer ein Jahr zeigt.
   */
  const subsidyRows = (kind: SubsidyKind): DashboardModuleRow[] => {
    const tab = kind === 'auslage' ? 'expenses' : 'subsidies';
    const list = ofKind(subsidies, kind);
    return SUBSIDY_STAGES.filter((stage) => stage.key !== 'erledigt').map((stage) => {
      const items = list.filter((s) => stage.statuses.includes(s.status));
      const newestYear = items.reduce<number | undefined>(
        (max, s) => (max === undefined || s.year > max ? s.year : max),
        undefined
      );
      return {
        key: stage.key,
        label: stage.label,
        count: items.length,
        dotClass: STAGE_DOT[stage.key],
        onClick: () => onNavigateTo({ tab, stage: stage.key, year: newestYear }),
      };
    });
  };

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

      {/* 3. NAECHSTE VORSTANDSSITZUNG (MICROSOFT TEAMS) */}
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

      {/* 4. MODULE: Beschluesse, Zuschuesse, Auslagen - untereinander. Ein
           Modul ohne offene Eintraege wird nicht angezeigt. */}
      <DashboardModule
        icon={<Vote className="w-4 h-4" strokeWidth={2} />}
        title="Beschlüsse"
        rows={resolutionRows}
      />
      <DashboardModule
        icon={<HandCoins className="w-4 h-4" strokeWidth={2} />}
        title="Zuschüsse"
        rows={subsidyRows('zuschuss')}
      />
      <DashboardModule
        icon={<Wallet className="w-4 h-4" strokeWidth={2} />}
        title="Auslagen"
        rows={subsidyRows('auslage')}
      />
    </div>
  );
};
