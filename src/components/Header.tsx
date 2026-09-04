import React, { useState, useEffect } from 'react';
import { BoardMember, ActiveTab, InAppNotification, Resolution, VoteType } from '../types';
import {
  Vote,
  Receipt,
  LayoutDashboard,
  ChevronDown,
  UserCheck,
  LogOut,
  KeyRound,
  Download,
  Sliders,
  CalendarDays,
  HandCoins,
  Cloud
} from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { PwaNotificationService } from '../utils/pwaNotifications';

interface HeaderProps {
  currentMember: BoardMember;
  members: BoardMember[];
  onSelectMember: (memberId: string) => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  pendingVotesCount: number;
  openInvoicesCount: number;
  onOpenSettings: () => void;
  onLogout: () => void;
  notifications: InAppNotification[];
  resolutions: Resolution[];
  onVote?: (resolutionId: string, vote: VoteType) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearRead: () => void;
  onSelectResolution?: (id: string) => void;
  onSelectInvoice?: (id: string) => void;
  onSelectMeeting?: (id: string) => void;
  onSendTestNotification?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMember,
  members,
  onSelectMember,
  activeTab,
  onSelectTab,
  pendingVotesCount,
  openInvoicesCount,
  onOpenSettings,
  onLogout,
  notifications,
  resolutions,
  onVote,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearRead,
  onSelectResolution,
  onSelectInvoice,
  onSelectMeeting,
  onSendTestNotification,
}) => {
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  useEffect(() => {
    PwaNotificationService.initInstallPromptListener((canInstall) => {
      setCanInstallPwa(canInstall);
    });
  }, []);

  const handleInstallPwa = async () => {
    const res = await PwaNotificationService.promptInstall();
    if (res === 'accepted') {
      setCanInstallPwa(false);
    }
  };

  // Dieselben Bereiche wie in der unteren Leiste auf dem Smartphone
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { 
      id: 'dashboard', 
      label: 'Übersicht', 
      icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.75} /> 
    },
    { 
      id: 'resolutions', 
      label: 'Beschlüsse', 
      icon: <Vote className="w-4 h-4" strokeWidth={1.75} />,
      badge: pendingVotesCount > 0 ? pendingVotesCount : undefined,
    },
    { 
      id: 'invoices', 
      label: 'Belege', 
      icon: <Receipt className="w-4 h-4" strokeWidth={1.75} />,
      badge: openInvoicesCount > 0 ? openInvoicesCount : undefined,
    },
    {
      id: 'subsidies',
      label: 'Zuschüsse',
      icon: <HandCoins className="w-4 h-4" strokeWidth={1.75} />,
    },
    {
      id: 'meetings',
      label: 'Sitzungen',
      icon: <CalendarDays className="w-4 h-4" strokeWidth={1.75} />,
    },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 pt-[env(safe-area-inset-top)]">

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-16">
          
          {/* Oben Links: Nur reiner Text WJOF. */}
          <div 
            className="flex items-center cursor-pointer select-none py-1" 
            onClick={() => onSelectTab('dashboard')}
          >
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight hover:text-[#003594] transition-colors">
              WJOF.
            </h1>
          </div>

          {/* Oben Rechts: Minimalist User Profile (Initials + Name) & Notification Bell */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">

            {/* PWA Install Button (If installable) */}
            {canInstallPwa && (
              <button
                type="button"
                onClick={handleInstallPwa}
                className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-[#003594] text-white hover:bg-[#00266B] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="App auf Smartphone / Desktop installieren"
              >
                <Download className="w-3.5 h-3.5 text-[#00A3E0]" />
                <span>App installieren</span>
              </button>
            )}

            {/* Notification Center Bell */}
            <NotificationCenter
              notifications={notifications}
              resolutions={resolutions}
              onVote={onVote}
              onMarkAsRead={onMarkAsRead}
              onMarkAllAsRead={onMarkAllAsRead}
              onClearRead={onClearRead}
              onSelectTab={onSelectTab}
              onSelectResolution={onSelectResolution}
              onSelectInvoice={onSelectInvoice}
              onSelectMeeting={onSelectMeeting}
              currentMember={currentMember}
              onOpenSettings={onOpenSettings}
            />

            {/* Minimalist Profile Button (Initials + Name, no heavy extra border box) */}
            <div className="relative">
              <button 
                type="button"
                className="flex items-center space-x-1.5 sm:space-x-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                id="user-profile-toggle"
              >
                <div className={`w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full ${currentMember.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0`}>
                  {currentMember.initials}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                    {currentMember.name}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Profile Dropdown */}
              {isMemberDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsMemberDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-slate-200 z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                    
                    {/* User info details */}
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center space-x-2.5 mb-1.5">
                        <div className={`w-9 h-9 rounded-full ${currentMember.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0`}>
                          {currentMember.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {currentMember.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {currentMember.role}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 truncate">
                        ✉️ {currentMember.email}
                      </p>
                      {currentMember.phone && (
                        <p className="text-[11px] text-slate-500 mt-1 px-1 truncate">
                          📞 {currentMember.phone}
                        </p>
                      )}
                    </div>

                    {/* Member switcher */}
                    <div className="px-2 py-1.5">
                      <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Vorstandsmitglied wechseln:
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-0.5">
                        {members.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => {
                              onSelectMember(member.id);
                              setIsMemberDropdownOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center space-x-2.5 text-left transition-colors cursor-pointer ${
                              member.id === currentMember.id 
                                ? 'bg-blue-50 text-[#003594] font-bold' 
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full ${member.avatarColor} text-white flex items-center justify-center font-bold text-[10px] shrink-0`}>
                              {member.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs">{member.name}</p>
                            </div>
                            {member.id === currentMember.id && (
                              <UserCheck className="w-3.5 h-3.5 text-[#003594] shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="border-t border-slate-100 p-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMemberDropdownOpen(false);
                          onOpenSettings();
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center space-x-2 text-left cursor-pointer font-semibold"
                      >
                        <Sliders className="w-3.5 h-3.5 text-slate-500" />
                        <span>Einstellungen & Vorstandscode</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMemberDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center space-x-2 text-left font-semibold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Abmelden</span>
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Minimalist Tab Navigation Bar for Desktop ONLY (on mobile, bottom nav is used) */}
        <nav className="hidden md:flex space-x-2 overflow-x-auto no-scrollbar border-t border-slate-100 pt-1.5 pb-2.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                id={`nav-tab-${tab.id}`}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#003594] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className={isActive ? 'text-[#00A3E0]' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-[#00A3E0] text-slate-900' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
