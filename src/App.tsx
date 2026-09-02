import React, { useState, useEffect } from 'react';
import { 
  BoardMember, 
  Resolution, 
  Invoice, 
  Meeting, 
  ActiveTab, 
  VoteType, 
  InvoiceStatus,
  SecuritySettings,
  AuthSession,
  EmailNotificationLog,
  InvoiceRequest,
  InAppNotification,
  NotificationSettings,
  EmailServerConfig,
  ResolutionAttachment,
  AppVersionConfig,
  BookkeepingStatus,
  InvoiceFolder,
  InvoiceRecurrence
} from './types';
import { AppStorage } from './utils/storage';
import { PwaNotificationService } from './utils/pwaNotifications';
import { sendResolutionVoteMails } from './utils/emailService';
import { notifyAllDevices } from './utils/webPushHelper';
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
import { Biometric } from './utils/biometric';
import { calculateVoteStats, formatDate } from './utils/formatters';
import { CheckCircle2, AlertCircle, Mail, Sparkles, X, Bell, Settings, Video } from 'lucide-react';

/** Stimme als Wort - fuer Rueckfragen und Meldungen. */
function voteLabel(v: VoteType): string {
  return v === 'yes' ? 'Ja' : v === 'no' ? 'Nein' : 'Enthaltung';
}

export default function App() {
  const [members, setMembers] = useState<BoardMember[]>(() => AppStorage.getMembers());
  const [currentMemberId, setCurrentMemberId] = useState<string>(() => AppStorage.getCurrentMemberId());
  const [resolutions, setResolutions] = useState<Resolution[]>(() => AppStorage.getResolutions());
  const [invoices, setInvoices] = useState<Invoice[]>(() => AppStorage.getInvoices());
  const [folders, setFolders] = useState<InvoiceFolder[]>(() => AppStorage.getInvoiceFolders());
  const [meetings, setMeetings] = useState<Meeting[]>(() => AppStorage.getMeetings());
  const [defaultTeamsUrl, setDefaultTeamsUrl] = useState<string>(() => AppStorage.getDefaultTeamsUrl());
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() => AppStorage.getSecuritySettings());
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>(() => AppStorage.getEmailLogs());
  const [invoiceRequests, setInvoiceRequests] = useState<InvoiceRequest[]>(() => AppStorage.getInvoiceRequests());
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => AppStorage.getNotifications());
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => AppStorage.getNotificationSettings());
  const [emailServerConfig, setEmailServerConfig] = useState<EmailServerConfig>(() => AppStorage.getEmailServerConfig());
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
      invoiceRequests,
      securitySettings,
      folders,
    };

    FirebaseSync.autoInitCloudIfEmpty(local);

    // Aktiv pruefen statt darauf zu warten, dass ein Listener stillschweigend
    // scheitert - sonst merkt niemand, dass nichts synchronisiert wird.
    FirebaseSync.checkConnection().then((conn) => {
      setSyncBlocked(!conn.canRead || !conn.canWrite);
    });

    const firstSnapshot = {
      resolutions: true,
      invoices: true,
      folders: true,
      meetings: true,
      members: true,
      requests: true,
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

    const unsubMem = FirebaseSync.subscribeMembers((remote) =>
      applyRemote('members', remote, local.members, setMembers, (m) =>
        FirebaseSync.saveMember(m).catch(() => {})
      )
    );

    const unsubReq = FirebaseSync.subscribeInvoiceRequests((remote) =>
      applyRemote('requests', remote, local.invoiceRequests, setInvoiceRequests, (r) =>
        FirebaseSync.saveInvoiceRequest(r).catch(() => {})
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

    return () => {
      unsubStatus();
      unsubVersion();
      unsubRes();
      unsubInv();
      unsubFolders();
      unsubMeet();
      unsubMem();
      unsubReq();
      unsubSec();
      unsubMeetingConfig();
    };
  }, []);

  // Authentication state
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => AppStorage.getAuthSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    const existing = AppStorage.getAuthSession();
    return !existing || !existing.isAuthenticated || !existing.isCodeVerified;
  });

  // Face-ID-Sperre: Die Anmeldung bleibt bestehen, aber solange dieses Geraet
  // biometrisch geschuetzt ist, muss beim Oeffnen entsperrt werden.
  // sessionStorage = pro geoeffneter App-Sitzung genau einmal.
  const [isDeviceLocked, setIsDeviceLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const session = AppStorage.getAuthSession();
    if (!session?.isAuthenticated) return false;
    if (!Biometric.isEnabled()) return false;
    return sessionStorage.getItem('wjof_unlocked') !== '1';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  
  // Modals state
  const [isNewResolutionOpen, setIsNewResolutionOpen] = useState(false);
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTeamsSettingsOpen, setIsTeamsSettingsOpen] = useState(false);
  const [isQuickAgendaOpen, setIsQuickAgendaOpen] = useState(false);
  const [isEmailVoteModalOpen, setIsEmailVoteModalOpen] = useState(false);
  const [emailVoteResolution, setEmailVoteResolution] = useState<Resolution | null>(null);
  const [isInvoiceRequestModalOpen, setIsInvoiceRequestModalOpen] = useState(false);

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedResolutionId, setSelectedResolutionId] = useState<string | null>(null);
  
  // Notification Banner State
  const [systemBanner, setSystemBanner] = useState<{
    type: 'success' | 'info' | 'error';
    title: string;
    message: string;
  } | null>(null);

  // Sync to storage
  useEffect(() => {
    AppStorage.saveMembers(members);
  }, [members]);

  useEffect(() => {
    AppStorage.saveCurrentMemberId(currentMemberId);
  }, [currentMemberId]);

  useEffect(() => {
    AppStorage.saveResolutions(resolutions);
  }, [resolutions]);

  useEffect(() => {
    AppStorage.saveInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    AppStorage.saveInvoiceFolders(folders);
  }, [folders]);

  useEffect(() => {
    AppStorage.saveMeetings(meetings);
  }, [meetings]);

  useEffect(() => {
    AppStorage.saveSecuritySettings(securitySettings);
  }, [securitySettings]);

  useEffect(() => {
    AppStorage.saveAuthSession(authSession);
  }, [authSession]);

  useEffect(() => {
    AppStorage.saveEmailLogs(emailLogs);
  }, [emailLogs]);

  useEffect(() => {
    AppStorage.saveInvoiceRequests(invoiceRequests);
  }, [invoiceRequests]);

  useEffect(() => {
    AppStorage.saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    AppStorage.saveNotificationSettings(notificationSettings);
  }, [notificationSettings]);

  useEffect(() => {
    AppStorage.saveEmailServerConfig(emailServerConfig);
  }, [emailServerConfig]);

  const addInAppAndPushNotification = (notif: {
    title: string;
    message: string;
    type: 'resolution' | 'vote' | 'invoice' | 'meeting' | 'system';
    targetTab?: ActiveTab;
    targetId?: string;
    /**
     * Wenn gesetzt, erhalten nur diese Mitglieder eine Push-Nachricht.
     * Bei Beschluessen sind das die Stimmberechtigten - alle anderen sollen
     * nicht fuer etwas benachrichtigt werden, wozu sie nichts beitragen.
     */
    recipientMemberIds?: string[];
  }) => {
    const newEntry: InAppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      targetTab: notif.targetTab,
      targetId: notif.targetId,
    };
    setNotifications((prev) => [newEntry, ...prev]);

    // Eigenes Geraet: Systemmeldung nur, wenn lokal gewuenscht
    if (notificationSettings.pushNotificationsEnabled) {
      PwaNotificationService.showPushNotification({
        title: notif.title,
        body: notif.message,
      });
    }

    // Alle anderen Geraete: echte Push-Nachricht ueber den Server.
    // Bewusst unabhaengig von den lokalen Einstellungen des Absenders -
    // sonst wuerde die eigene Einstellung die Benachrichtigung der anderen
    // Vorstandsmitglieder unterdruecken.
    notifyAllDevices(
      {
        title: notif.title,
        body: notif.message,
        url: '/',
      },
      currentMember.id,
      notif.recipientMemberIds
    ).catch(() => {});
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearReadNotifications = () => {
    setNotifications((prev) => prev.filter((n) => !n.isRead));
  };

  const handleSendTestNotification = () => {
    addInAppAndPushNotification({
      title: '⚡ Test-Umlaufbeschluss',
      message: `Hallo ${currentMember.name}, dies ist eine Test-Benachrichtigung für das WJ Vorstandsportal.`,
      type: 'resolution',
      targetTab: 'resolutions',
    });
    setSystemBanner({
      type: 'info',
      title: 'Test-Benachrichtigung ausgelöst!',
      message: 'Eine Benachrichtigung wurde in die Mitteilungszentrale und an dein Gerät übertragen.',
    });
  };

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

  // Platzhalter, damit die App auch vor der ersten Anmeldung rendern kann
  // (die Vorstandsliste ist bei einer frischen Installation leer).
  const currentMember: BoardMember =
    authSession?.user ||
    members.find((m) => m.id === currentMemberId) ||
    members[0] || {
      id: 'mem_unbekannt',
      name: 'Nicht angemeldet',
      role: 'Kreissprecher / Vorsitzender',
      email: '',
      initials: '–',
      avatarColor: 'bg-slate-400',
    };

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

  // Auth Success Handler
  const handleAuthSuccess = (session: AuthSession) => {
    setAuthSession(session);
    setIsAuthModalOpen(false);
    if (!session.user) return;

    const user = session.user;
    const isNew = !members.some(
      (m) => m.id === user.id || (m.email || '').toLowerCase() === (user.email || '').toLowerCase()
    );

    if (isNew) {
      setMembers((prev) => [...prev, user]);
      // Das eigene Profil muss auch in der Cloud landen, sonst sieht kein
      // anderes Geraet das Mitglied - und die eigene Freigabe fehlt.
      FirebaseSync.saveMember(user).catch(() => {});
      FirebaseSync.addToAllowlist(user.email).catch(() => {});
    }

    setCurrentMemberId(user.id);
  };

  // Logout Handler
  const handleLogout = () => {
    setAuthSession(null);
    AppStorage.saveAuthSession(null);
    sessionStorage.removeItem('wjof_unlocked');
    setIsDeviceLocked(false);
    setIsAuthModalOpen(true);
  };

  // Handler: Switch active board member profile
  const handleSelectMember = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (member) {
      const isExempt = AppStorage.isExemptFromCode(member, securitySettings);
      setCurrentMemberId(memberId);
      setAuthSession({
        isAuthenticated: true,
        isCodeVerified: isExempt || (authSession?.isCodeVerified ?? true),
        user: member,
      });
    }
  };

  // Handler: Cast vote on resolution for a specific member
  const handleVoteForMember = (resolutionId: string, member: BoardMember, voteType: VoteType, note?: string) => {
    setResolutions((prev) =>
      prev.map((res) => {
        if (res.id !== resolutionId) return res;

        const updatedVotes = {
          ...res.votes,
          [member.id]: {
            memberId: member.id,
            memberName: member.name,
            memberRole: member.role,
            vote: voteType,
            timestamp: new Date().toISOString(),
            note,
          },
        };

        // Recalculate status
        const tempRes = { ...res, votes: updatedVotes };
        const stats = calculateVoteStats(tempRes, members.length);
        let newStatus = res.status;
        let passedAt = res.passedAt;

        if (stats.isQuorumReached && stats.yesCount > members.length / 2) {
          newStatus = 'angenommen';
          if (!passedAt) passedAt = new Date().toISOString();
          
          // Trigger notification on quorum reached
          if (res.status !== 'angenommen' && notificationSettings.notifyOnQuorumReached) {
            addInAppAndPushNotification({
              title: `🎉 Beschluss angenommen: ${res.number}`,
              message: `"${res.title}" hat mit ${stats.yesCount} Ja-Stimmen das Quorum erreicht und ist offiziell gültig.`,
              type: 'vote',
              targetTab: 'resolutions',
              targetId: res.id,
              recipientMemberIds: res.eligibleVoterIds,
            });
          }
        } else if (stats.isQuorumReached && stats.noCount >= members.length / 2) {
          newStatus = 'abgelehnt';
        }

        const updatedRes: Resolution = {
          ...res,
          votes: updatedVotes,
          status: newStatus,
          passedAt,
        };

        // Sync updated resolution to Firebase Cloud
        FirebaseSync.saveResolution(updatedRes).catch(() => {});

        return updatedRes;
      })
    );
  };

  /**
   * Stimmabgabe des angemeldeten Mitglieds.
   *
   * Liegt bereits eine abweichende Stimme vor, wird zuerst nachgefragt: Die
   * Abstimmungsknoepfe stehen in Listen dicht beieinander, ein versehentlicher
   * Tipp wuerde sonst unbemerkt eine bestehende Stimme ueberschreiben.
   */
  const handleVote = (resolutionId: string, voteType: VoteType, note?: string) => {
    const existing = resolutions.find((r) => r.id === resolutionId)?.votes[currentMember.id];

    if (existing && existing.vote !== voteType) {
      setPendingVoteChange({ resolutionId, voteType, note, previous: existing.vote });
      return;
    }

    handleVoteForMember(resolutionId, currentMember, voteType, note);
  };

  /** Offene Rueckfrage zum Aendern einer bereits abgegebenen Stimme. */
  const [pendingVoteChange, setPendingVoteChange] = useState<{
    resolutionId: string;
    voteType: VoteType;
    note?: string;
    previous: VoteType;
  } | null>(null);

  // Handler: Beschluss archivieren bzw. wieder in die laufende Liste holen
  const handleArchiveResolution = (resolutionId: string, archive: boolean) => {
    setResolutions((prev) =>
      prev.map((res) => {
        if (res.id !== resolutionId) return res;
        const updated: Resolution = {
          ...res,
          isArchived: archive,
          archivedAt: archive ? new Date().toISOString() : undefined,
          archivedBy: archive ? `${currentMember.name} (${currentMember.role})` : undefined,
        };
        FirebaseSync.saveResolution(updated).catch(() => {});
        return updated;
      })
    );

    if (archive && selectedResolutionId === resolutionId) {
      setSelectedResolutionId(null);
    }

    setSystemBanner({
      type: 'success',
      title: archive ? 'Beschluss archiviert' : 'Beschluss wiederhergestellt',
      message: archive
        ? 'Er ist weiterhin über den Archiv-Filter auffindbar.'
        : 'Er erscheint wieder in der laufenden Liste.',
    });
    setTimeout(() => setSystemBanner(null), 4000);
  };

  // Handler: Beschluss endgueltig loeschen (nur archivierte, nur mit Code)
  const handleDeleteResolution = (resolutionId: string) => {
    const target = resolutions.find((r) => r.id === resolutionId);
    setResolutions((prev) => prev.filter((r) => r.id !== resolutionId));
    FirebaseSync.deleteResolution(resolutionId).catch(() => {});
    if (selectedResolutionId === resolutionId) setSelectedResolutionId(null);

    setSystemBanner({
      type: 'success',
      title: 'Beschluss gelöscht',
      message: target
        ? `${target.number} wurde unwiderruflich entfernt.`
        : 'Der Beschluss wurde unwiderruflich entfernt.',
    });
    setTimeout(() => setSystemBanner(null), 5000);
  };

  // Handler: Add comment to resolution
  const handleAddComment = (resolutionId: string, content: string) => {
    const newComment = {
      id: `comm_${Date.now()}`,
      authorId: currentMember.id,
      authorName: currentMember.name,
      authorRole: currentMember.role,
      content,
      timestamp: new Date().toISOString(),
    };

    setResolutions((prev) =>
      prev.map((res) => {
        if (res.id !== resolutionId) return res;
        const updatedRes = {
          ...res,
          comments: [...res.comments, newComment],
        };
        FirebaseSync.saveResolution(updatedRes).catch(() => {});
        return updatedRes;
      })
    );
  };

  // Handler: Add attachment to resolution
  const handleAddAttachment = (resolutionId: string, attachment: ResolutionAttachment) => {
    setResolutions((prev) =>
      prev.map((res) => {
        if (res.id !== resolutionId) return res;
        const currentAttachments = res.attachments || [];
        const updatedRes = {
          ...res,
          attachments: [...currentAttachments, attachment],
        };
        FirebaseSync.saveResolution(updatedRes).catch(() => {});
        return updatedRes;
      })
    );
    setSystemBanner({
      type: 'success',
      title: 'Dokument angehängt',
      message: `"${attachment.name}" (${attachment.size}) wurde erfolgreich zum Beschluss hinzugefügt.`,
    });
  };

  // Handler: Create new resolution
  const handleCreateResolution = (
    data: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>
  ) => {
    const newRes: Resolution = {
      ...data,
      id: `res_${Date.now()}`,
      createdAt: new Date().toISOString(),
      votes: {
        [currentMember.id]: {
          memberId: currentMember.id,
          memberName: currentMember.name,
          memberRole: currentMember.role,
          vote: 'yes',
          timestamp: new Date().toISOString(),
          note: 'Als Antragsteller automatisch mit Ja gestimmt.',
        },
      },
      comments: [],
      linkedInvoiceIds: [],
    };

    setResolutions((prev) => [newRes, ...prev]);
    FirebaseSync.saveResolution(newRes).catch(() => {});
    setSelectedResolutionId(newRes.id);
    setActiveTab('resolutions');

    // Trigger in-app and push notification
    if (notificationSettings.notifyOnNewResolution) {
      addInAppAndPushNotification({
        title: `⚡ Neuer Umlaufbeschluss: ${newRes.number}`,
        message: `${newRes.title} – deine Stimme wird benötigt.`,
        type: 'resolution',
        targetTab: 'resolutions',
        targetId: newRes.id,
        // Nur die Stimmberechtigten dieses Beschlusses benachrichtigen
        recipientMemberIds: newRes.eligibleVoterIds,
      });
    }

    // E-Mail mit 1-Klick-Abstimmungslinks automatisch an alle Stimmberechtigten
    const voters = members.filter(
      (m) =>
        m.id !== currentMember.id &&
        !!m.email &&
        (!newRes.eligibleVoterIds ||
          newRes.eligibleVoterIds.length === 0 ||
          newRes.eligibleVoterIds.includes(m.id))
    );

    if (voters.length > 0) {
      sendResolutionVoteMails(newRes, voters)
        .then((result) => {
          voters.slice(0, result.sent).forEach((m) =>
            handleAddEmailLog({
              type: 'resolution_vote',
              recipientName: m.name,
              recipientEmail: m.email,
              subject: `[Umlaufbeschluss ${newRes.number}] ${newRes.title}`,
              status: 'zugestellt',
              resolutionId: newRes.id,
              details: 'Automatisch beim Anlegen des Beschlusses versendet',
            })
          );

          if (result.failed > 0) {
            setSystemBanner({
              type: 'error',
              title: `${result.sent} von ${voters.length} E-Mails versendet`,
              message: result.errors.join(' | '),
            });
          } else {
            setSystemBanner({
              type: 'success',
              title: 'Beschluss eingereicht',
              message: `${result.sent} Vorstandsmitglieder wurden per E-Mail zur Abstimmung eingeladen.`,
            });
            setTimeout(() => setSystemBanner(null), 5000);
          }
        })
        .catch(() => {});
    }

    return newRes;
  };

  // Handler: Create new invoice
  const handleCreateInvoice = (data: Omit<Invoice, 'id' | 'createdAt'>) => {
    const newInvId = `inv_${Date.now()}`;
    const newInvoice: Invoice = {
      ...data,
      id: newInvId,
      createdAt: new Date().toISOString(),
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    FirebaseSync.saveInvoice(newInvoice).catch(() => {});

    // If linked to a resolution, update that resolution's linkedInvoiceIds
    if (data.resolutionId) {
      setResolutions((prev) =>
        prev.map((res) => {
          if (res.id === data.resolutionId) {
            const updatedRes = {
              ...res,
              linkedInvoiceIds: [...res.linkedInvoiceIds, newInvId],
            };
            FirebaseSync.saveResolution(updatedRes).catch(() => {});
            return updatedRes;
          }
          return res;
        })
      );
    }

    // Check if there was an open invoice request for this title and mark as completed
    setInvoiceRequests((prev) =>
      prev.map((req) =>
        req.projectTitle.toLowerCase() === data.title.toLowerCase() ||
        (data.resolutionId && req.resolutionId === data.resolutionId)
          ? { ...req, status: 'erledigt' as const }
          : req
      )
    );

    // Add In-App notification
    addInAppAndPushNotification({
      title: `📥 Neuer Beleg eingereicht: ${newInvoice.invoiceNumber}`,
      message: `${newInvoice.submittedBy.name} hat Beleg für "${newInvoice.title}" (${newInvoice.amount.toFixed(2)} €) hochgeladen.`,
      type: 'invoice',
      targetTab: 'invoices',
      targetId: newInvoice.id,
    });

    setActiveTab('invoices');
  };

  // Handler: Toggle invoice bookkeeping status
  const handleToggleBookkeepingRecorded = (invoiceId: string, isRecorded: boolean) => {
    handleUpdateInvoiceBookkeepingStatus(invoiceId, isRecorded ? 'bearbeitet' : 'nicht_bearbeitet');
  };

  // Handler: Update invoice bookkeeping status (3 options: 'bearbeitet' | 'nicht_bearbeitet' | 'nicht_notwendig')
  const handleUpdateInvoiceBookkeepingStatus = (invoiceId: string, status: BookkeepingStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const isBearbeitet = status === 'bearbeitet';
        const updatedInv: Invoice = {
          ...inv,
          bookkeepingStatus: status,
          isBookkeepingRecorded: isBearbeitet,
          bookkeepingRecordedAt: isBearbeitet ? new Date().toISOString() : undefined,
          bookkeepingRecordedBy: isBearbeitet ? `${currentMember.name} (${currentMember.role})` : undefined,
        };
        FirebaseSync.saveInvoice(updatedInv).catch(() => {});
        return updatedInv;
      })
    );
  };

  // Handler: Update resolution bookkeeping status
  const handleUpdateResolutionBookkeepingStatus = (resolutionId: string, status: BookkeepingStatus) => {
    setResolutions((prev) =>
      prev.map((res) => {
        if (res.id !== resolutionId) return res;
        const updatedRes: Resolution = {
          ...res,
          bookkeepingStatus: status,
        };
        FirebaseSync.saveResolution(updatedRes).catch(() => {});
        return updatedRes;
      })
    );
  };

  // Handler: Create a new invoice folder
  const handleCreateFolder = (name: string, color?: string, icon?: string) => {
    const newFolder: InvoiceFolder = {
      id: `folder_${Date.now()}`,
      name,
      color: color || '#003594',
      icon: icon || 'folder',
      createdAt: new Date().toISOString(),
      createdBy: currentMember.id,
    };
    setFolders((prev) => [...prev, newFolder]);
    FirebaseSync.saveInvoiceFolder(newFolder).catch(() => {});
    return newFolder;
  };

  // Handler: Delete invoice folder
  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    FirebaseSync.deleteInvoiceFolder(folderId).catch(() => {});
    // Unassign invoices in this folder
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.folderId === folderId) {
          const updated = { ...inv, folderId: undefined };
          FirebaseSync.saveInvoice(updated).catch(() => {});
          return updated;
        }
        return inv;
      })
    );
  };

  // Handler: Assign invoice to folder
  const handleUpdateInvoiceFolder = (invoiceId: string, folderId: string | undefined) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const updated = { ...inv, folderId };
        FirebaseSync.saveInvoice(updated).catch(() => {});
        return updated;
      })
    );
  };

  // Handler: Update invoice recurrence
  const handleUpdateInvoiceRecurrence = (invoiceId: string, recurrence: InvoiceRecurrence | undefined) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const updated = { ...inv, recurrence };
        FirebaseSync.saveInvoice(updated).catch(() => {});
        return updated;
      })
    );
  };

  // Handler: Update invoice status
  const handleUpdateInvoiceStatus = (invoiceId: string, newStatus: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const updatedInv = {
          ...inv,
          status: newStatus,
          reviewedBy: `${currentMember.name} (${currentMember.role})`,
          paidAt: newStatus === 'ausgezahlt' ? new Date().toISOString() : inv.paidAt,
        };
        FirebaseSync.saveInvoice(updatedInv).catch(() => {});
        return updatedInv;
      })
    );
  };

  // Handler: Create new meeting
  const handleCreateMeeting = (data: Omit<Meeting, 'id'>) => {
    const newMeeting: Meeting = {
      ...data,
      id: `meet_${Date.now()}`,
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    FirebaseSync.saveMeeting(newMeeting).catch(() => {});
    setActiveTab('meetings');
  };

  // Handler: Update meeting attendee RSVP
  const handleUpdateAttendeeStatus = (
    meetingId: string,
    memberId: string,
    status: 'accepted' | 'declined' | 'tentative'
  ) => {
    setMeetings((prev) => {
      const updatedList = prev.map((m) => {
        if (m.id !== meetingId) return m;
        const exists = m.attendees.some((a) => a.memberId === memberId);
        const updatedAttendees = exists
          ? m.attendees.map((a) =>
              a.memberId === memberId
                ? { ...a, status, updatedAt: new Date().toISOString() }
                : a
            )
          : [
              ...m.attendees,
              {
                memberId,
                memberName: members.find((x) => x.id === memberId)?.name || 'Vorstand',
                status,
                updatedAt: new Date().toISOString(),
              },
            ];
        const updatedMeeting = { ...m, attendees: updatedAttendees };
        FirebaseSync.saveMeeting(updatedMeeting).catch(() => {});
        return updatedMeeting;
      });
      return updatedList;
    });
  };

  // Handler: Update members list
  const handleUpdateMembers = (newMembers: BoardMember[]) => {
    setMembers(newMembers);
    FirebaseSync.syncAllMembers(newMembers).catch(() => {});
  };

  // Handler: Update Security Settings
  const handleUpdateSecuritySettings = (newSettings: SecuritySettings) => {
    setSecuritySettings(newSettings);
    FirebaseSync.saveSecuritySettings(newSettings).catch(() => {});
  };

  // Handler: Update meeting MS Teams link
  const handleUpdateMeetingTeamsLink = (meetingId: string, newUrl: string) => {
    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id === meetingId) {
          const updatedMeeting = { ...m, teamsUrl: newUrl };
          FirebaseSync.saveMeeting(updatedMeeting).catch(() => {});
          return updatedMeeting;
        }
        return m;
      })
    );
  };

  // Handler: Save default Teams URL
  const handleSaveDefaultTeamsUrl = async (url: string, applyToAllMeetings: boolean) => {
    setDefaultTeamsUrl(url);
    AppStorage.saveDefaultTeamsUrl(url);
    await FirebaseSync.saveMeetingSettings({ defaultTeamsUrl: url });

    if (applyToAllMeetings) {
      setMeetings((prev) => {
        const updated = prev.map((m) => (m.isUpcoming ? { ...m, teamsUrl: url } : m));
        AppStorage.saveMeetings(updated);
        for (const m of updated) {
          if (m.isUpcoming) {
            FirebaseSync.saveMeeting(m).catch(() => {});
          }
        }
        return updated;
      });
    }

    setSystemBanner({
      type: 'success',
      title: 'MS Teams Link aktualisiert',
      message: 'Der Besprechungslink wurde erfolgreich gespeichert und synchronisiert.',
    });
    setTimeout(() => setSystemBanner(null), 4000);
  };

  // Handler: Add Email Log
  const handleAddEmailLog = (log: Omit<EmailNotificationLog, 'id' | 'sentAt'>) => {
    const newEntry: EmailNotificationLog = {
      ...log,
      id: `elog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sentAt: new Date().toISOString(),
    };
    setEmailLogs((prev) => [newEntry, ...prev]);
  };

  // Handler: Create Invoice Request
  const handleCreateInvoiceRequest = (request: Omit<InvoiceRequest, 'id' | 'createdAt'>) => {
    const newReq: InvoiceRequest = {
      ...request,
      id: `req_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setInvoiceRequests((prev) => [newReq, ...prev]);
    FirebaseSync.saveInvoiceRequest(newReq).catch(() => {});

    // Log the email notification
    handleAddEmailLog({
      type: 'invoice_request',
      recipientName: request.recipientName,
      recipientEmail: request.recipientEmail,
      subject: `[WJ Offenbach Beleg-Anforderung] ${request.projectTitle}`,
      status: 'zugestellt',
      resolutionId: request.resolutionId,
      details: `Beleg angefordert bis ${formatDate(request.deadline)} von ${currentMember.name}`,
    });

    // Dispatch In-App & Push notification
    if (notificationSettings.notifyOnInvoiceRequest) {
      addInAppAndPushNotification({
        title: `📩 Beleg-Anforderung: ${request.projectTitle}`,
        message: `Anforderung zur Einreichung an ${request.recipientName} (${request.recipientEmail}) versendet.`,
        type: 'invoice',
        targetTab: 'invoices',
      });
    }

    setSystemBanner({
      type: 'success',
      title: 'Rechnungsanforderung gespeichert & versendet',
      message: `Anforderung für "${request.projectTitle}" an ${request.recipientName} (${request.recipientEmail}) versendet.`,
    });
  };

  // Open Email Vote Modal for a resolution
  const handleOpenEmailVoteModal = (resolution: Resolution) => {
    setEmailVoteResolution(resolution);
    setIsEmailVoteModalOpen(true);
  };

  // Compute pending votes for current member (only where eligible)
  const pendingVotesCount = resolutions.filter((res) => {
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

  const upcomingMeetings = meetings.filter((m) => m.isUpcoming);
  const nextMeeting = upcomingMeetings[0] || null;
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
        upcomingMeeting={nextMeeting}
        onOpenQuickAgenda={() => setIsQuickAgendaOpen(true)}
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
            meetings={meetings}
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
            resolutions={resolutions}
            onOpenNewMeeting={() => setIsNewMeetingOpen(true)}
            onUpdateAttendeeStatus={handleUpdateAttendeeStatus}
            onSelectResolution={(resId) => {
              setSelectedResolutionId(resId);
              setActiveTab('resolutions');
            }}
            onUpdateMeetingTeamsLink={handleUpdateMeetingTeamsLink}
            onOpenTeamsSettings={() => setIsTeamsSettingsOpen(true)}
            defaultTeamsUrl={defaultTeamsUrl}
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

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        members={members}
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
        onVote={handleVoteForMember}
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
        upcomingMeetingsCount={upcomingMeetings.length}
        onOpenSettings={() => {
          setSettingsInitialTab('members');
          setIsSettingsOpen(true);
        }}
      />
    </div>
  );
}
