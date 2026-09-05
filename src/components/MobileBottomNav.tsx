import React from 'react';
import { ActiveTab } from '../types';
import { 
  LayoutDashboard, 
  Vote, 
  Receipt, 
  Calendar, 
  HandCoins,
  Wallet,
  Sliders
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  pendingVotesCount: number;
  openInvoicesCount: number;
  onOpenSettings: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  pendingVotesCount,
  openInvoicesCount,
  onOpenSettings,
}) => {
  const navItems: {
    id: ActiveTab | 'settings';
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'dashboard',
      label: 'Übersicht',
      icon: <LayoutDashboard className="w-5 h-5" strokeWidth={1.75} />,
    },
    {
      id: 'resolutions',
      label: 'Beschlüsse',
      icon: <Vote className="w-5 h-5" strokeWidth={1.75} />,
      badge: pendingVotesCount > 0 ? pendingVotesCount : undefined,
    },
    {
      id: 'invoices',
      label: 'Belege',
      icon: <Receipt className="w-5 h-5" strokeWidth={1.75} />,
      badge: openInvoicesCount > 0 ? openInvoicesCount : undefined,
    },
    {
      id: 'subsidies',
      label: 'Zuschüsse',
      icon: <HandCoins className="w-5 h-5" strokeWidth={1.75} />,
    },
    {
      id: 'expenses',
      label: 'Auslagen',
      icon: <Wallet className="w-5 h-5" strokeWidth={1.75} />,
    },
    {
      id: 'meetings',
      label: 'Termine',
      icon: <Calendar className="w-5 h-5" strokeWidth={1.75} />,
    },
    {
      id: 'settings',
      label: 'Portal',
      icon: <Sliders className="w-5 h-5" strokeWidth={1.75} />,
    },
  ];

  // Fuer die gleitende Indikator-Leiste: Index unter den "echten" Tabs
  // (Portal/Settings hat keinen eigenen aktiven Zustand, oeffnet nur ein Fenster).
  const activeIndex = navItems.findIndex(
    (item) => item.id !== 'settings' && activeTab === item.id
  );

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 w-full max-w-full overflow-hidden z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg pb-[env(safe-area-inset-bottom)]">
      {/* Main Tab Buttons */}
      <nav className="relative flex items-center justify-around h-14 px-1">
        {/* Aktiv-Indikator gleitet zum neuen Tab, statt abrupt zu springen -
            eine gemeinsame Leiste statt je Knopf eine eigene, per Tab-Breite
            positioniert (alle Knoepfe sind gleich breit: flex-1). */}
        {activeIndex >= 0 && (
          <span
            aria-hidden="true"
            className="absolute top-0 h-0.5 w-8 bg-[#003594] rounded-b-full transition-[left] duration-300 ease-out"
            style={{
              left: `calc((${activeIndex} + 0.5) * (100% / ${navItems.length}) - 1rem)`,
            }}
          />
        )}

        {navItems.map((item) => {
          const isActive = item.id !== 'settings' && activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              id={`mobile-nav-${item.id}`}
              onClick={() => {
                if (item.id === 'settings') {
                  onOpenSettings();
                } else {
                  onSelectTab(item.id as ActiveTab);
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 relative transition-all active:scale-95 touch-manipulation ${
                isActive
                  ? 'text-[#003594] font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative">
                <div className={`transition-colors ${
                  isActive ? 'text-[#003594]' : 'text-slate-500'
                }`}>
                  {item.icon}
                </div>

                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-rose-500 text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[9px] tracking-tight mt-0.5 leading-tight max-w-full truncate px-0.5 ${
                isActive ? 'font-bold text-[#003594]' : 'font-medium'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

