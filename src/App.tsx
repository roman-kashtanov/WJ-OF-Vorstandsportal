import React, { useState, useEffect } from 'react';
import { 
  BoardMember,
  Resolution,
  ActiveTab,
  VoteType,
  AppVersionConfig,
  Subsidy,
  SubsidyPerson
} from './types';
import { AppStorage } from './utils/storage';
import { PwaNotificationService } from './utils/pwaNotifications';
import { FirebaseSync, FirebaseSyncStatus } from './utils/firebaseSync';
import { CURRENT_APP_VERSION, DEFAULT_VERSION_CONFIG } from './constants/version';
import { normalizeSecuritySettings } from './utils/security';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ResolutionsView } from './components/ResolutionsView';
import { InvoicesView } from './components/InvoicesView';
import { MeetingsView } from './components/MeetingsView';
import { EmailCenterView } from './components/EmailCenterView';
import { StorageGuideView } from './components/StorageGuideView';
import { NewResolutionModal } from './components/NewResolutionModal';
import { NewInvoiceModal } from './components/NewInvoiceModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { NewMeetingModal } from './components/NewMeetingModal';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { TeamsSettingsModal } from './components/TeamsSettingsModal';
import { QuickAgendaModal } from './components/QuickAgendaModal';
import { EmailVoteModal } from './components/EmailVoteModal';
import { InvoiceRequestModal } from './components/InvoiceRequestModal';
import { ForceUpdateModal } from './components/ForceUpdateModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { BiometricLock } from './components/BiometricLock';
import { SubsidiesView } from './components/SubsidiesView';
import { NewSubsidyModal } from './components/NewSubsidyModal';
import { SubsidyPeopleModal } from './components/SubsidyPeopleModal';
import { SubsidyCatalogueModal } from './components/SubsidyCatalogueModal';
import { SubsidyPayoutModal } from './components/SubsidyPayoutModal';
import { BundleSubsidiesModal } from './components/BundleSubsidiesModal';
import { useSubsidies } from './hooks/useSubsidies';
import { useMembers } from './hooks/useMembers';
import { useMeetings } from './hooks/useMeetings';
import { useNotifications } from './hooks/useNotifications';
import { useResolutions } from './hooks/useResolutions';
import { useInvoices } from './hooks/useInvoices';
import { useAuditLog } from './hooks/useAuditLog';
import { CheckCircle2, AlertCircle, Mail, Sparkles, X, Bell, Settings, Video } from 'lucide-react';

/** Stimme als Wort - fuer Rueckfragen und Meldungen. */
function voteLabel(v: VoteType): string {
  return v === 'yes' ? 'Ja' : v === 'no' ? 'Nein' : 'Enthaltung';
}

export default function App() {
  // --- Vorstand/Anmeldung/Sicherheit: siehe src/hooks/useMembers.ts
  // (vierter extrahierter Bereich der App.tsx-Modularisierung, Details in
  // CLAUDE.md) - bewusst als erster Hook aufgerufen, da praktisch jede
  // andere Domain "currentMember" braucht. -------------------------------
  const {
    members,
    setMembers,
    currentMemberId,
    setCurrentMemberId,
    authSession,
    setAuthSession,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isDeviceLocked,
    setIsDeviceLocked,
    securitySettings,
    setSecuritySettings,
    roleCatalogue,
    setRoleCatalogue,
    currentMember,
    handleAuthSuccess,
    handleLogout,
    handleSelectMember,
    handleUpdateMembers,
    handleUpdateSecuritySettings,
    handleSaveRoleCatalogue,
  } = useMembers();

  const [versionConfig, setVersionConfig] = useState<AppVersionConfig | null>(() => DEFAULT_VERSION_CONFIG);
  const [cloudStatus, setCloudStatus] = useState<FirebaseSyncStatus>(() => FirebaseSync.getStatus());
  /** Nur gesetzt, wenn die Cloud-Synchronisation tatsaechlich blockiert ist. */
  const [syncBlocked, setSyncBlocked] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    'members' | 'security' | 'notifications' | 'system' | 'teams'
  >('members');

  // Register PWA Service Worker on mount
  useEffect(() => {
    PwaNotificationService.registerServiceWorker();
  }, []);

  // Immer den aktuellen authSession-Stand fuer den unten stehenden,
  // langlebigen Firestore-Listener verfuegbar halten (der Listener wird nur
  // einmal beim Mount registriert, siehe zentraler Sync-Effekt weiter unten -
  // ohne Ref wuerde er sich sonst dauerhaft an den authSession-Stand vom
  // allerersten Rendern "erinnern").
  const authSessionRef = React.useRef(authSession);
  useEffect(() => {
    authSessionRef.current = authSession;
  }, [authSession]);

  // Zeitpunkt der letzten Anmeldung - kurze Gnadenfrist danach, bevor ein
  // "nicht mehr in der Mitgliederliste" aus einem frischen Firestore-Snapshot
  // zu einem automatischen Logout fuehrt. Ohne diese Frist wuerde ein
  // brandneu angelegtes Profil sich selbst sofort wieder ausloggen, weil der
  // eigene Schreibvorgang (FirebaseSync.saveMember) den naechsten Snapshot
  // manchmal erst nach dem allerersten (noch leeren/alten) Snapshot erreicht.
  const authSinceRef = React.useRef<number>(0);
  useEffect(() => {
    if (authSession?.isAuthenticated) authSinceRef.current = Date.now();
  }, [authSession?.isAuthenticated]);

  /**
   * Verbindungs-Gate: ohne eine tatsaechlich erfolgreiche Leseverbindung zur
   * Vereinsdatenbank darf die App fuer bereits angemeldete Sitzungen nicht
   * nutzbar werden - sonst koennte ein Geraet mit einer alten, lokal
   * zwischengespeicherten Anmeldung offline weiterhin die zuletzt gesehenen
   * (moeglicherweise laengst veralteten) Daten anzeigen, selbst wenn die
   * Person laengst aus dem Vorstand entfernt wurde. Ohne Verbindung kann das
   * nicht geprueft werden - also ohne Verbindung auch kein Zugriff.
   */
  const [connectionGate, setConnectionGate] = useState<'checking' | 'ok' | 'blocked'>('checking');
  const verifyConnection = () => {
    setConnectionGate('checking');
    FirebaseSync.checkConnection().then((conn) => {
      setSyncBlocked(!conn.canRead || !conn.canWrite);
      setConnectionGate(conn.canRead ? 'ok' : 'blocked');
    });
  };

  // Echtzeit-Synchronisation mit Firestore.
  //
  // Wichtig: Die allererste Antwort aus der Cloud darf lokale Daten nicht
  // loeschen. Ist die Cloud leer, waehrend lokal etwas vorliegt (z.B. weil das
  // Geraet offline gearbeitet hat oder die Datenbank neu ist), werden die
  // lokalen Daten stattdessen hochgeladen.
  useEffect(() => {
    const local = {
      members,
      resolutions,
      invoices,
      meetings,
      meetingSeries,
      invoiceRequests,
      securitySettings,
      folders,
      subsidies,
      subsidyPeople,
    };

    FirebaseSync.autoInitCloudIfEmpty(local);

    // Aktiv pruefen statt darauf zu warten, dass ein Listener stillschweigend
    // scheitert - sonst merkt niemand, dass nichts synchronisiert wird. Setzt
    // nebenbei auch das Verbindungs-Gate (siehe oben).
    verifyConnection();

    const firstSnapshot = {
      resolutions: true,
      invoices: true,
      folders: true,
      meetings: true,
      meetingSeries: true,
      members: true,
      requests: true,
      subsidies: true,
      subsidyPeople: true,
    };

    /** Uebernimmt Cloud-Daten - ausser die Cloud ist beim ersten Mal leer. */
    function applyRemote<T>(
      key: keyof typeof firstSnapshot,
      remote: T[] | null,
      localList: T[],
      setter: (list: T[]) => void,
      uploadLocal: (item: T) => void
    ) {
      if (!remote) return;
      if (firstSnapshot[key]) {
        firstSnapshot[key] = false;
        if (remote.length === 0 && localList.length > 0) {
          localList.forEach(uploadLocal);
          return;
        }
      }
      setter(remote);
    }

    const unsubStatus = FirebaseSync.subscribeStatus(setCloudStatus);

    const unsubVersion = FirebaseSync.subscribeVersionConfig((remoteConfig) => {
      if (remoteConfig) setVersionConfig(remoteConfig);
    });

    const unsubRes = FirebaseSync.subscribeResolutions((remote) =>
      applyRemote('resolutions', remote, local.resolutions, setResolutions, (r) =>
        FirebaseSync.saveResolution(r).catch(() => {})
      )
    );

    const unsubInv = FirebaseSync.subscribeInvoices((remote) =>
      applyRemote('invoices', remote, local.invoices, setInvoices, (i) =>
        FirebaseSync.saveInvoice(i).catch(() => {})
      )
    );

    const unsubFolders = FirebaseSync.subscribeInvoiceFolders((remote) =>
      applyRemote('folders', remote, local.folders, setFolders, (f) =>
        FirebaseSync.saveInvoiceFolder(f).catch(() => {})
      )
    );

    const unsubMeet = FirebaseSync.subscribeMeetings((remote) =>
      applyRemote('meetings', remote, local.meetings, setMeetings, (m) =>
        FirebaseSync.saveMeeting(m).catch(() => {})
      )
    );

    const unsubMeetSeries = FirebaseSync.subscribeMeetingSeries((remote) =>
      applyRemote('meetingSeries', remote, local.meetingSeries, setMeetingSeries, (s) =>
        FirebaseSync.saveMeetingSeries(s).catch(() => {})
      )
    );

    const unsubMem = FirebaseSync.subscribeMembers((remote) => {
      applyRemote('members', remote, local.members, setMembers, (m) =>
        FirebaseSync.saveMember(m).catch(() => {})
      );

      // Sicherheits-Check: wurde die aktuell angemeldete Person aus dem
      // Vorstand entfernt, sofort ausloggen - unabhaengig davon, ob dieses
      // Geraet gerade den entsprechenden Tab offen hat. Ohne diesen Check
      // bliebe eine entfernte Person mit einer alten lokalen Sitzung
      // unbegrenzt angemeldet (siehe Kommentar bei authSinceRef weiter oben).
      const session = authSessionRef.current;
      if (
        remote &&
        remote.length > 0 &&
        session?.isAuthenticated &&
        session.user &&
        Date.now() - authSinceRef.current > 8000 &&
        !remote.some(
          (m) =>
            m.id === session.user!.id ||
            (m.email || '').toLowerCase() === (session.user!.email || '').toLowerCase()
        )
      ) {
        handleLogout();
      }
    });

    const unsubReq = FirebaseSync.subscribeInvoiceRequests((remote) =>
      applyRemote('requests', remote, local.invoiceRequests, setInvoiceRequests, (r) =>
        FirebaseSync.saveInvoiceRequest(r).catch(() => {})
      )
    );

    const unsubSubs = FirebaseSync.subscribeSubsidies((remote) =>
      applyRemote('subsidies', remote as Subsidy[], local.subsidies, setSubsidies, (x) =>
        FirebaseSync.saveSubsidy(x).catch(() => {})
      )
    );

    const unsubSubPeople = FirebaseSync.subscribeSubsidyPeople((remote) =>
      applyRemote(
        'subsidyPeople',
        remote as SubsidyPerson[],
        local.subsidyPeople,
        setSubsidyPeople,
        (x) => FirebaseSync.saveSubsidyPerson(x).catch(() => {})
      )
    );

    const unsubSec = FirebaseSync.subscribeSecuritySettings((remoteSec) => {
      // Auch aus der Cloud kann noch der kaputte Alt-Hash kommen, wenn die
      // Einstellungen vor dem Fix einmal hochgeladen wurden.
      if (remoteSec) setSecuritySettings(normalizeSecuritySettings(remoteSec));
    });

    const unsubMeetingConfig = FirebaseSync.subscribeMeetingSettings((remoteConfig) => {
      if (remoteConfig?.defaultTeamsUrl) {
        setDefaultTeamsUrl(remoteConfig.defaultTeamsUrl);
        AppStorage.saveDefaultTeamsUrl(remoteConfig.defaultTeamsUrl);
      }
    });

    const unsubCatalogue = FirebaseSync.subscribeSubsidyCatalogueSettings((remoteCatalogue) => {
      if (remoteCatalogue) setCatalogueSettings(remoteCatalogue);
    });

    const unsubRoleCatalogue = FirebaseSync.subscribeRoleCatalogue((remoteRoles) => {
      if (remoteRoles) setRoleCatalogue(remoteRoles);
    });

    // Benachrichtigungen und Revisionshistorie fuer oeffentliche/externe
    // Vorgaenge (siehe api/*.ts) - anders als applyRemote() oben nur neue
    // IDs vorne einfuegen statt die ganze Liste zu ersetzen: beides sind
    // anwachsende Ereignis-Feeds, kein zweiseitig editierbarer Datensatz,
    // und lokale isRead-Aenderungen an Benachrichtigungen sollen erhalten
    // bleiben.
    const unsubNotifications = FirebaseSync.subscribeNotifications((remote) => {
      setNotifications((prev) => {
        const known = new Set(prev.map((n) => n.id));
        const fresh = remote.filter((n) => !known.has(n.id));
        if (fresh.length === 0) return prev;
        return [...fresh, ...prev].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      });
    });

    const unsubAuditLog = FirebaseSync.subscribeAuditLog((remote) => {
      setAuditLog((prev) => {
        const known = new Set(prev.map((a) => a.id));
        const fresh = remote.filter((a) => !known.has(a.id));
        if (fresh.length === 0) return prev;
        return [...fresh, ...prev].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      });
    });

    return () => {
      unsubStatus();
      unsubVersion();
      unsubRes();
      unsubInv();
      unsubFolders();
      unsubMeet();
      unsubMeetSeries();
      unsubMem();
      unsubReq();
      unsubSubs();
      unsubSubPeople();
      unsubSec();
      unsubMeetingConfig();
      unsubCatalogue();
      unsubRoleCatalogue();
      unsubNotifications();
      unsubAuditLog();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [selectedResolutionId, setSelectedResolutionId] = useState<string | null>(null);
  
  // Notification Banner State
  const [systemBanner, setSystemBanner] = useState<{
    type: 'success' | 'info' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // --- Sitzungen: siehe src/hooks/useMeetings.ts (zweiter extrahierter
  // Bereich der App.tsx-Modularisierung, Details in CLAUDE.md) -----------
  const {
    meetings,
    setMeetings,
    nextMeeting,
    meetingSeries,
    setMeetingSeries,
    defaultTeamsUrl,
    setDefaultTeamsUrl,
    showProtocolFormatHint,
    setShowProtocolFormatHint,
    isNewMeetingOpen,
    setIsNewMeetingOpen,
    isTeamsSettingsOpen,
    setIsTeamsSettingsOpen,
    isQuickAgendaOpen,
    setIsQuickAgendaOpen,
    handleCreateMeeting,
    handleUpdateAttendeeStatus,
    handleUpdateMeetingTeamsLink,
    handleUpdateMeetingFile,
    handleToggleMeetingCancelled,
    handleSaveDefaultTeamsUrl,
    handleCreateMeetingSeries,
    handleUpdateMeetingSeries,
    handleDeleteMeetingSeries,
  } = useMeetings({ members, setSystemBanner, setActiveTab });

  const handleUpdateVersionConfig = async (newConfig: Partial<AppVersionConfig>) => {
    await FirebaseSync.saveVersionConfig(newConfig);
    setVersionConfig((prev) => (prev ? { ...prev, ...newConfig } : { ...DEFAULT_VERSION_CONFIG, ...newConfig }));
  };

  const handleCheckForUpdates = async () => {
    // Check Firestore configuration
    const latest = await FirebaseSync.subscribeVersionConfig((cfg) => {
      if (cfg) setVersionConfig(cfg);
    });
  };

  // --- Revisionshistorie: siehe src/hooks/useAuditLog.ts - vor allen
  // Domain-Hooks aufgerufen (keine Abhaengigkeiten), damit addAuditLogEntry
  // als Parameter in Resolutions/Invoices/Subsidies hereingereicht werden
  // kann, analog zu addInAppAndPushNotification aus useNotifications. -----
  const { auditLog, setAuditLog, addAuditLogEntry } = useAuditLog();

  // --- Benachrichtigungen/E-Mail-Protokoll: siehe
  // src/hooks/useNotifications.ts (dritter extrahierter Bereich der
  // App.tsx-Modularisierung, Details in CLAUDE.md) ------------------------
  const {
    notifications,
    setNotifications,
    notificationSettings,
    setNotificationSettings,
    emailLogs,
    setEmailLogs,
    emailServerConfig,
    setEmailServerConfig,
    addInAppAndPushNotification,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleClearReadNotifications,
    handleSendTestNotification,
    handleAddEmailLog,
  } = useNotifications({ currentMember, setSystemBanner });

  // --- Beschluesse: siehe src/hooks/useResolutions.ts (sechster und
  // letzter extrahierter Bereich der App.tsx-Modularisierung, Details in
  // CLAUDE.md) - vor Subsidies/Invoices aufgerufen, da beide auf
  // Resolutions-Handler zugreifen. ----------------------------------------
  const {
    resolutions,
    setResolutions,
    isNewResolutionOpen,
    setIsNewResolutionOpen,
    isEmailVoteModalOpen,
    setIsEmailVoteModalOpen,
    emailVoteResolution,
    setEmailVoteResolution,
    pendingVoteChange,
    setPendingVoteChange,
    handleVoteForMember,
    handleVote,
    handleArchiveResolution,
    handleDeleteResolution,
    handleAddComment,
    handleAddAttachment,
    handleCreateResolution,
    handleUpdateResolutionBookkeepingStatus,
    handleOpenEmailVoteModal,
  } = useResolutions({
    members,
    currentMember,
    notificationSettings,
    addInAppAndPushNotification,
    handleAddEmailLog,
    addAuditLogEntry,
    setSystemBanner,
    setActiveTab,
    selectedResolutionId,
    setSelectedResolutionId,
  });

  // --- Belege: siehe src/hooks/useInvoices.ts (fuenfter extrahierter
  // Bereich der App.tsx-Modularisierung, Details in CLAUDE.md) -----------
  const {
    invoices,
    setInvoices,
    folders,
    setFolders,
    invoiceRequests,
    setInvoiceRequests,
    isNewInvoiceOpen,
    setIsNewInvoiceOpen,
    isInvoiceRequestModalOpen,
    setIsInvoiceRequestModalOpen,
    selectedInvoiceId,
    setSelectedInvoiceId,
    handleCreateInvoice,
    handleToggleBookkeepingRecorded,
    handleUpdateInvoiceBookkeepingStatus,
    handleCreateFolder,
    handleDeleteFolder,
    handleUpdateInvoiceFolder,
    handleUpdateInvoiceRecurrence,
    handleUpdateInvoiceStatus,
    handleCreateInvoiceRequest,
  } = useInvoices({
    currentMember,
    setResolutions,
    addInAppAndPushNotification,
    handleAddEmailLog,
    addAuditLogEntry,
    notificationSettings,
    setSystemBanner,
    setActiveTab,
  });

  // 1-Klick-Aktionen aus E-Mails (?action=vote&...).
  //
  // Die Parameter werden beim Start einmal gemerkt und erst ausgefuehrt, wenn
  // die Anmeldung steht und der Beschluss vorliegt. Vorher wuerde die Stimme
  // ins Leere laufen, weil die Daten noch aus der Cloud geladen werden.
  const [pendingUrlAction, setPendingUrlAction] = useState<URLSearchParams | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('action') ? params : null;
  });

  useEffect(() => {
    if (!pendingUrlAction) return;
    if (!authSession?.isAuthenticated || !authSession?.isCodeVerified) return;

    const action = pendingUrlAction.get('action');
    const clearUrl = () =>
      window.history.replaceState({}, document.title, window.location.pathname);

    if (action === 'vote') {
      const resId = pendingUrlAction.get('res');
      const memberId = pendingUrlAction.get('member');
      const vote = pendingUrlAction.get('vote') as VoteType;
      if (!resId || !memberId || !vote) {
        setPendingUrlAction(null);
        clearUrl();
        return;
      }

      const targetRes = resolutions.find((r) => r.id === resId);
      if (!targetRes) return; // noch nicht geladen - beim naechsten Durchlauf erneut versuchen

      // Die Stimme wird immer fuer das angemeldete Konto verbucht - nicht fuer
      // die im Link genannte Person. Sonst koennte eine weitergeleitete E-Mail
      // genutzt werden, um im Namen anderer abzustimmen.
      const votingMember = currentMember;
      handleVoteForMember(resId, votingMember, vote, '1-Klick-Stimmabgabe über E-Mail');
      setSelectedResolutionId(resId);
      setActiveTab('resolutions');
      setSystemBanner({
        type: 'success',
        title: 'Stimme erfasst',
        message: `${targetRes.number}: ${votingMember.name} hat mit '${
          vote === 'yes' ? 'JA' : vote === 'no' ? 'NEIN' : 'ENTHALTUNG'
        }' abgestimmt.`,
      });
      handleAddEmailLog({
        type: 'resolution_vote',
        recipientName: votingMember.name,
        recipientEmail: votingMember.email,
        subject: `[1-Klick Antwort] ${targetRes.number}: ${targetRes.title}`,
        status: 'abgestimmt',
        actionTaken: `Stimme '${vote.toUpperCase()}' erfasst`,
        resolutionId: resId,
        details: `Erfasst am ${new Date().toLocaleString('de-DE')}`,
      });
      setPendingUrlAction(null);
      clearUrl();
      return;
    }

    if (action === 'upload_invoice') {
      const project = pendingUrlAction.get('project');
      const resId = pendingUrlAction.get('res');
      if (resId) setSelectedResolutionId(resId);
      setIsNewInvoiceOpen(true);
      setActiveTab('invoices');
      setSystemBanner({
        type: 'info',
        title: 'Beleg hochladen',
        message: project ? `Bitte Beleg für "${project}" hochladen.` : 'Bitte Beleg hochladen.',
      });
      setPendingUrlAction(null);
      clearUrl();
      return;
    }

    if (action === 'view_resolution') {
      const resId = pendingUrlAction.get('res');
      if (resId) {
        setSelectedResolutionId(resId);
        setActiveTab('resolutions');
      }
      setPendingUrlAction(null);
      clearUrl();
    }
  }, [pendingUrlAction, authSession, resolutions, members]);

  // --- Zuschuesse: siehe src/hooks/useSubsidies.ts (erster extrahierter
  // Bereich der App.tsx-Modularisierung, Details in CLAUDE.md) ------------
  const {
    subsidies,
    setSubsidies,
    subsidyPeople,
    setSubsidyPeople,
    subsidyYear,
    setSubsidyYear,
    clubAccount,
    catalogueSettings,
    setCatalogueSettings,
    isSubsidyModalOpen,
    setIsSubsidyModalOpen,
    editingSubsidy,
    setEditingSubsidy,
    isSubsidyPeopleOpen,
    setIsSubsidyPeopleOpen,
    isSubsidyCatalogueOpen,
    setIsSubsidyCatalogueOpen,
    isPayoutOpen,
    setIsPayoutOpen,
    isBundleModalOpen,
    setIsBundleModalOpen,
    handleSaveSubsidy,
    handleDeleteSubsidy,
    handleUpdateSubsidyStatus,
    handleReassignSubsidyResolution,
    handleBundleSubsidies,
    handleMarkSubsidiesPaid,
    handleLogPaymentFileRegenerated,
    handleSaveSubsidyPerson,
    handleDeleteSubsidyPerson,
    handleSaveClubAccount,
    handleMergeSubsidyPeople,
    handleImportSubsidyCsv,
    handleSaveCatalogueSettings,
    handleResetCatalogueToDefault,
  } = useSubsidies({
    resolutions,
    currentMember,
    createResolution: handleCreateResolution,
    addResolutionAttachment: handleAddAttachment,
    addAuditLogEntry,
    setSystemBanner,
    notificationSettings,
    addInAppAndPushNotification,
  });

  // Compute pending votes for current member (only where eligible)
  const pendingVotesCount = resolutions.filter((res) => {
    if (res.isArchived) return false;
    if (res.status !== 'in_abstimmung') return false;
    if (res.votes[currentMember.id]) return false;
    if (res.eligibleVoterIds && res.eligibleVoterIds.length > 0 && !res.eligibleVoterIds.includes(currentMember.id)) {
      return false;
    }
    return true;
  }).length;

  const openInvoicesCount = invoices.filter(
    (inv) => inv.status === 'eingereicht' || inv.status === 'geprueft'
  ).length;

  const selectedInvoice = invoices.find((i) => i.id === selectedInvoiceId) || null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-[#003594] selection:text-white w-full max-w-full overflow-x-hidden relative">
      
      {/* Top Header with Agenda Instant Popup & Next Meeting Widget */}
      <Header
        currentMember={currentMember}
        members={members}
        onSelectMember={handleSelectMember}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingVotesCount={pendingVotesCount}
        openInvoicesCount={openInvoicesCount}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        notifications={notifications}
        resolutions={resolutions}
        onVote={handleVote}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearRead={handleClearReadNotifications}
        onSelectResolution={(resId) => {
          setSelectedResolutionId(resId);
          setActiveTab('resolutions');
        }}
        onSelectInvoice={(invId) => {
          setSelectedInvoiceId(invId);
          setActiveTab('invoices');
        }}
        onSelectMeeting={() => {
          setActiveTab('meetings');
        }}
        onSendTestNotification={handleSendTestNotification}
      />

      {/* Nur im Fehlerfall: Ohne Datenbankzugriff arbeitet die App still nur
          lokal weiter - das darf nicht unbemerkt bleiben. */}
      {syncBlocked && !isAuthModalOpen && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-xs animate-in fade-in slide-in-from-top">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <span className="font-semibold">
              Keine Verbindung zur Vereinsdatenbank – Änderungen bleiben nur auf diesem Gerät.
            </span>
            <button
              type="button"
              onClick={() => {
                setSettingsInitialTab('system');
                setIsSettingsOpen(true);
              }}
              className="shrink-0 px-3 py-1 bg-amber-950/10 hover:bg-amber-950/20 rounded-lg font-bold transition-colors"
            >
              Prüfen
            </button>
          </div>
        </div>
      )}

      {/* Global System Banner Notification */}
      {systemBanner && (
        <div className={`px-4 py-3 shadow-md text-white animate-in fade-in slide-in-from-top ${
          systemBanner.type === 'error' ? 'bg-rose-700' : systemBanner.type === 'info' ? 'bg-[#003594]' : 'bg-emerald-700'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-white/80 shrink-0" />
              <div>
                <strong className="font-bold block text-sm">{systemBanner.title}</strong>
                <span className="text-white/85">{systemBanner.message}</span>
              </div>
            </div>
            <button
              onClick={() => setSystemBanner(null)}
              className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {/* key auf dem Tab: React baut den Bereich beim Wechsel neu auf, dadurch
          laeuft die Einblend-Animation bei jedem Ansichtswechsel erneut. */}
      <main
        key={activeTab}
        className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 md:pb-8 wj-view-enter"
      >
        
        {activeTab === 'dashboard' && (
          <DashboardView
            currentMember={currentMember}
            members={members}
            resolutions={resolutions}
            invoices={invoices}
            nextMeeting={nextMeeting}
            onNavigate={setActiveTab}
            onOpenNewResolution={() => setIsNewResolutionOpen(true)}
            onOpenNewInvoice={() => setIsNewInvoiceOpen(true)}
            onSelectResolution={(resId) => {
              setSelectedResolutionId(resId);
              setActiveTab('resolutions');
            }}
            onSelectInvoice={(invId) => {
              setSelectedInvoiceId(invId);
            }}
            onOpenQuickAgenda={() => setIsQuickAgendaOpen(true)}
            onOpenTeamsSettings={() => setIsTeamsSettingsOpen(true)}
          />
        )}

        {activeTab === 'resolutions' && (
          <ResolutionsView
            currentMember={currentMember}
            members={members}
            resolutions={resolutions}
            invoices={invoices}
            subsidies={subsidies}
            subsidyPeople={subsidyPeople}
            auditLog={auditLog}
            onVote={handleVote}
            onAddComment={handleAddComment}
            onOpenNewResolution={() => setIsNewResolutionOpen(true)}
            selectedResolutionId={selectedResolutionId}
            onSelectResolution={setSelectedResolutionId}
            onSelectInvoice={(invId) => setSelectedInvoiceId(invId)}
            onOpenEmailVoteModal={handleOpenEmailVoteModal}
            onAddAttachment={handleAddAttachment}
            onArchiveResolution={handleArchiveResolution}
            onDeleteResolution={handleDeleteResolution}
            securitySettings={securitySettings}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView
            currentMember={currentMember}
            members={members}
            invoices={invoices}
            resolutions={resolutions}
            folders={folders}
            onOpenNewInvoice={() => setIsNewInvoiceOpen(true)}
            onSelectInvoice={(invId) => setSelectedInvoiceId(invId)}
            onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
            onToggleBookkeepingRecorded={handleToggleBookkeepingRecorded}
            onUpdateInvoiceBookkeepingStatus={handleUpdateInvoiceBookkeepingStatus}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            onUpdateInvoiceFolder={handleUpdateInvoiceFolder}
            onOpenInvoiceRequestModal={() => setIsInvoiceRequestModalOpen(true)}
          />
        )}

        {activeTab === 'meetings' && (
          <MeetingsView
            currentMember={currentMember}
            members={members}
            meetings={meetings}
            nextMeeting={nextMeeting}
            resolutions={resolutions}
            onOpenNewMeeting={() => setIsNewMeetingOpen(true)}
            onUpdateAttendeeStatus={handleUpdateAttendeeStatus}
            onSelectResolution={(resId) => {
              setSelectedResolutionId(resId);
              setActiveTab('resolutions');
            }}
            onUpdateMeetingTeamsLink={handleUpdateMeetingTeamsLink}
            onUpdateMeetingFile={handleUpdateMeetingFile}
            onCreateResolution={handleCreateResolution}
            onToggleMeetingCancelled={handleToggleMeetingCancelled}
            onOpenTeamsSettings={() => setIsTeamsSettingsOpen(true)}
            defaultTeamsUrl={defaultTeamsUrl}
            showProtocolFormatHint={showProtocolFormatHint}
          />
        )}

        {activeTab === 'subsidies' && (
          <SubsidiesView
            subsidies={subsidies}
            people={subsidyPeople}
            year={subsidyYear}
            limits={catalogueSettings.limits}
            auditLog={auditLog}
            resolutions={resolutions}
            clubAccount={clubAccount}
            onLogPaymentFileRegenerated={handleLogPaymentFileRegenerated}
            onChangeYear={setSubsidyYear}
            onOpenNew={() => {
              setEditingSubsidy(null);
              setIsSubsidyModalOpen(true);
            }}
            onEdit={(s) => {
              setEditingSubsidy(s);
              setIsSubsidyModalOpen(true);
            }}
            onDelete={handleDeleteSubsidy}
            onUpdateStatus={handleUpdateSubsidyStatus}
            onReassignResolution={handleReassignSubsidyResolution}
            onManagePeople={() => setIsSubsidyPeopleOpen(true)}
            onManageCatalogue={() => setIsSubsidyCatalogueOpen(true)}
            onOpenPayout={() => setIsPayoutOpen(true)}
            onOpenBundle={() => setIsBundleModalOpen(true)}
            onImportCsv={handleImportSubsidyCsv}
          />
        )}

        {activeTab === 'email-center' && (
          <EmailCenterView
            currentMember={currentMember}
            members={members}
            resolutions={resolutions}
            emailLogs={emailLogs}
            invoiceRequests={invoiceRequests}
            onOpenEmailVoteModal={handleOpenEmailVoteModal}
            onOpenInvoiceRequestModal={() => setIsInvoiceRequestModalOpen(true)}
            onSelectResolution={(resId) => {
              setSelectedResolutionId(resId);
              setActiveTab('resolutions');
            }}
            onOpenNewInvoiceWithRequest={(req) => {
              setIsNewInvoiceOpen(true);
            }}
          />
        )}

        {activeTab === 'storage-guide' && <StorageGuideView />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">Wirtschaftsjunioren Offenbach am Main e.V.</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">v{CURRENT_APP_VERSION}</span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <button
              type="button"
              onClick={() => setIsTeamsSettingsOpen(true)}
              className="flex items-center space-x-1 text-slate-600 hover:text-[#003594] transition cursor-pointer"
              title="MS Teams Besprechungslink konfigurieren"
              id="bottom-footer-teams-btn"
            >
              <Video className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>MS Teams Link</span>
            </button>

            <span className="text-slate-300">•</span>

            <button
              type="button"
              onClick={() => {
                setSettingsInitialTab('members');
                setIsSettingsOpen(true);
              }}
              className="flex items-center space-x-1 text-slate-600 hover:text-[#003594] transition cursor-pointer"
              title="Portal- & Sicherheitseinstellungen"
              id="bottom-footer-settings-btn"
            >
              <Settings className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Einstellungen</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {/* Rueckfrage vor dem Aendern einer bereits abgegebenen Stimme */}
      {pendingVoteChange && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 text-center">Stimme ändern?</h3>
            <p className="mt-2 text-[12px] text-slate-500 text-center leading-relaxed">
              Du hast bereits mit{' '}
              <strong className="text-slate-800">{voteLabel(pendingVoteChange.previous)}</strong>{' '}
              gestimmt. Soll die Stimme auf{' '}
              <strong className="text-slate-800">{voteLabel(pendingVoteChange.voteType)}</strong>{' '}
              geändert werden?
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPendingVoteChange(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => {
                  handleVoteForMember(
                    pendingVoteChange.resolutionId,
                    currentMember,
                    pendingVoteChange.voteType,
                    pendingVoteChange.note
                  );
                  setPendingVoteChange(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-[#003594] hover:bg-[#00266B] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Ändern
              </button>
            </div>
          </div>
        </div>
      )}

      {isSubsidyModalOpen && (
        <NewSubsidyModal
          isOpen={isSubsidyModalOpen}
          onClose={() => {
            setIsSubsidyModalOpen(false);
            setEditingSubsidy(null);
          }}
          people={subsidyPeople}
          subsidies={subsidies}
          editing={editingSubsidy}
          year={subsidyYear}
          catalogue={catalogueSettings.entries}
          limits={catalogueSettings.limits}
          resolutions={resolutions}
          onSubmit={handleSaveSubsidy}
          onManagePeople={() => setIsSubsidyPeopleOpen(true)}
        />
      )}

      <SubsidyPeopleModal
        isOpen={isSubsidyPeopleOpen}
        onClose={() => setIsSubsidyPeopleOpen(false)}
        people={subsidyPeople}
        subsidies={subsidies}
        year={subsidyYear}
        limits={catalogueSettings.limits}
        onSave={handleSaveSubsidyPerson}
        onDelete={handleDeleteSubsidyPerson}
        onMerge={handleMergeSubsidyPeople}
      />

      <SubsidyCatalogueModal
        isOpen={isSubsidyCatalogueOpen}
        onClose={() => setIsSubsidyCatalogueOpen(false)}
        settings={catalogueSettings}
        onSave={handleSaveCatalogueSettings}
        onResetToDefault={handleResetCatalogueToDefault}
      />

      <SubsidyPayoutModal
        isOpen={isPayoutOpen}
        onClose={() => setIsPayoutOpen(false)}
        subsidies={subsidies}
        people={subsidyPeople}
        year={subsidyYear}
        clubAccount={clubAccount}
        onSaveClubAccount={handleSaveClubAccount}
        onMarkPaid={handleMarkSubsidiesPaid}
      />

      <BundleSubsidiesModal
        isOpen={isBundleModalOpen}
        onClose={() => setIsBundleModalOpen(false)}
        subsidies={subsidies}
        people={subsidyPeople}
        year={subsidyYear}
        currentMember={currentMember}
        members={members}
        existingResolutionCount={resolutions.length}
        onCreate={handleBundleSubsidies}
      />

      <BiometricLock
        isOpen={isDeviceLocked && !isAuthModalOpen}
        memberName={currentMember.name}
        onUnlocked={() => {
          sessionStorage.setItem('wjof_unlocked', '1');
          setIsDeviceLocked(false);
        }}
        onLogout={handleLogout}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onSuccess={handleAuthSuccess}
        members={members}
        securitySettings={securitySettings}
      />

      {/* Verbindungs-Gate: siehe Kommentar bei connectionGate weiter oben.
          Nur relevant, wenn ohnehin schon angemeldet - der Login-Vorgang
          selbst prueft die Freigabe bereits live gegen Firestore
          (AuthModal/handleGoogleUser), unabhaengig hiervon. */}
      {!isAuthModalOpen && authSession?.isAuthenticated && connectionGate !== 'ok' && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
            {connectionGate === 'checking' ? (
              <>
                <div className="w-10 h-10 mx-auto rounded-full border-2 border-slate-200 border-t-[#003594] animate-spin" />
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  Verbindung zur Vereinsdatenbank wird geprüft…
                </p>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-900">Keine Verbindung</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Ohne Verbindung zur Vereinsdatenbank kann nicht geprüft werden, ob dieses Konto
                  noch im Vorstand freigegeben ist. Bitte Internetverbindung prüfen.
                </p>
                <button
                  type="button"
                  onClick={verifyConnection}
                  className="mt-5 w-full py-2.5 rounded-xl bg-[#003594] hover:bg-[#00266B] text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  Erneut versuchen
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Abmelden
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        members={members}
        roleCatalogue={roleCatalogue}
        onSaveRoleCatalogue={handleSaveRoleCatalogue}
        onUpdateMembers={handleUpdateMembers}
        securitySettings={securitySettings}
        onUpdateSecuritySettings={handleUpdateSecuritySettings}
        notificationSettings={notificationSettings}
        onUpdateNotificationSettings={setNotificationSettings}
        emailServerConfig={emailServerConfig}
        onUpdateEmailServerConfig={setEmailServerConfig}
        onLogout={handleLogout}
        currentMember={currentMember}
        onSendTestNotification={handleSendTestNotification}
        versionConfig={versionConfig}
        onUpdateVersionConfig={handleUpdateVersionConfig}
        initialTab={settingsInitialTab}
        defaultTeamsUrl={defaultTeamsUrl}
        onSaveDefaultTeamsUrl={handleSaveDefaultTeamsUrl}
        showProtocolFormatHint={showProtocolFormatHint}
        onToggleShowProtocolFormatHint={setShowProtocolFormatHint}
        resolutions={resolutions}
        auditLog={auditLog}
      />

      <TeamsSettingsModal
        isOpen={isTeamsSettingsOpen}
        onClose={() => setIsTeamsSettingsOpen(false)}
        defaultTeamsUrl={defaultTeamsUrl}
        onSaveDefaultTeamsUrl={handleSaveDefaultTeamsUrl}
        meetings={meetings}
        onUpdateMeetingTeamsLink={handleUpdateMeetingTeamsLink}
      />

      <QuickAgendaModal
        isOpen={isQuickAgendaOpen}
        onClose={() => setIsQuickAgendaOpen(false)}
        meeting={nextMeeting}
        onOpenResolution={(resId) => {
          setSelectedResolutionId(resId);
          setActiveTab('resolutions');
        }}
        onNavigateToMeetings={() => setActiveTab('meetings')}
      />

      <NewResolutionModal
        isOpen={isNewResolutionOpen}
        onClose={() => setIsNewResolutionOpen(false)}
        onSubmit={handleCreateResolution}
        currentMember={currentMember}
        members={members}
        existingCount={resolutions.length}
      />

      <NewInvoiceModal
        isOpen={isNewInvoiceOpen}
        onClose={() => setIsNewInvoiceOpen(false)}
        onSubmit={handleCreateInvoice}
        currentMember={currentMember}
        resolutions={resolutions}
        folders={folders}
        onCreateFolder={handleCreateFolder}
        onOpenNewResolution={() => setIsNewResolutionOpen(true)}
        onCreateQuickResolution={handleCreateResolution}
      />

      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoiceId(null)}
        currentMember={currentMember}
        resolutions={resolutions}
        folders={folders}
        auditLog={auditLog}
        onUpdateStatus={handleUpdateInvoiceStatus}
        onToggleBookkeepingRecorded={handleToggleBookkeepingRecorded}
        onUpdateBookkeepingStatus={handleUpdateInvoiceBookkeepingStatus}
        onSelectResolution={(resId) => {
          setSelectedResolutionId(resId);
          setActiveTab('resolutions');
        }}
      />

      <NewMeetingModal
        isOpen={isNewMeetingOpen}
        onClose={() => setIsNewMeetingOpen(false)}
        onSubmit={handleCreateMeeting}
        onSubmitSeries={handleCreateMeetingSeries}
        members={members}
        resolutions={resolutions}
        defaultTeamsUrl={defaultTeamsUrl}
      />

      <EmailVoteModal
        isOpen={isEmailVoteModalOpen}
        onClose={() => {
          setIsEmailVoteModalOpen(false);
          setEmailVoteResolution(null);
        }}
        resolution={emailVoteResolution}
        members={members}
        onLogEmailSent={(member, subject) => {
          handleAddEmailLog({
            type: 'resolution_vote',
            recipientName: member.name,
            recipientEmail: member.email,
            subject,
            status: 'zugestellt',
            resolutionId: emailVoteResolution?.id,
            details: `Versendet an ${member.email} um ${new Date().toLocaleTimeString('de-DE')}`,
          });
        }}
      />

      <InvoiceRequestModal
        isOpen={isInvoiceRequestModalOpen}
        onClose={() => setIsInvoiceRequestModalOpen(false)}
        members={members}
        resolutions={resolutions}
        currentMember={currentMember}
        onSubmitRequest={handleCreateInvoiceRequest}
      />

      {/* Force Update Modal (Triggered automatically if versionConfig enforces it) */}
      <ForceUpdateModal versionConfig={versionConfig} />

      {/* Native Mobile Bottom Navigation Bar (Optimized for smartphone handling) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingVotesCount={pendingVotesCount}
        openInvoicesCount={openInvoicesCount}
        onOpenSettings={() => {
          setSettingsInitialTab('members');
          setIsSettingsOpen(true);
        }}
      />
    </div>
  );
}
