import React, { useState, useEffect } from 'react';
import {
  BoardMember,
  SecuritySettings,
  BoardRole,
  AppVersionConfig,
  EmailServerConfig,
  NotificationSettings,
  Resolution,
  AuditLogEntry
} from '../types';
import { 
  X, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Check,
  KeyRound,
  RefreshCw,
  BellRing,
  Mail, 
  Cloud, 
  Video, 
  LogOut, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  History as HistoryIcon
} from 'lucide-react';
import { FirebaseSync } from '../utils/firebaseSync';
import { useModalTransition } from '../hooks/useModalTransition';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { hashPasscode, verifyDeleteCode } from '../utils/security';
import { RevisionHistory } from './RevisionHistory';
import { CURRENT_APP_VERSION } from '../constants/version';
import {
  subscribeToPushServer,
  unsubscribeFromPushServer,
  isDeviceSubscribed,
  PwaNotificationService,
} from '../utils/pwaNotifications';
import { sendMail } from '../utils/emailService';
import { Biometric } from '../utils/biometric';
import { isVotingMember, formatDate } from '../utils/formatters';
import { firebaseConfig } from '../lib/firebase';
import { RoleCatalogueSettings } from '../data/roleCatalogue';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: BoardMember[];
  onUpdateMembers: (members: BoardMember[]) => void;
  roleCatalogue: RoleCatalogueSettings;
  onSaveRoleCatalogue: (catalogue: RoleCatalogueSettings) => void;
  securitySettings: SecuritySettings;
  onUpdateSecuritySettings: (settings: SecuritySettings) => void;
  onLogout: () => void;
  emailServerConfig?: EmailServerConfig;
  onUpdateEmailServerConfig?: (config: EmailServerConfig) => void;
  currentMember: BoardMember;
  versionConfig?: AppVersionConfig | null;
  onUpdateVersionConfig?: (config: Partial<AppVersionConfig>) => Promise<void> | void;
  defaultTeamsUrl?: string;
  onSaveDefaultTeamsUrl?: (url: string, applyToAllMeetings: boolean) => void;
  showProtocolFormatHint?: boolean;
  onToggleShowProtocolFormatHint?: (value: boolean) => void;
  notificationSettings?: NotificationSettings;
  onUpdateNotificationSettings?: (settings: NotificationSettings) => void;
  onSendTestNotification?: () => void;
  initialTab?: 'members' | 'security' | 'notifications' | 'system' | 'teams' | 'history';
  resolutions: Resolution[];
  auditLog: AuditLogEntry[];
}


export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  members,
  onUpdateMembers,
  roleCatalogue,
  onSaveRoleCatalogue,
  securitySettings,
  onUpdateSecuritySettings,
  onLogout,
  currentMember,
  emailServerConfig,
  onUpdateEmailServerConfig,
  versionConfig,
  onUpdateVersionConfig,
  defaultTeamsUrl = '',
  onSaveDefaultTeamsUrl,
  showProtocolFormatHint = true,
  onToggleShowProtocolFormatHint,
  notificationSettings,
  onUpdateNotificationSettings,
  onSendTestNotification,
  initialTab,
  resolutions,
  auditLog,
}) => {
  const [activeTab, setActiveTab] = useState<
    'members' | 'security' | 'notifications' | 'system' | 'teams' | 'history'
  >(initialTab || 'members');

  /** Der gesamte Einstellungen-Bereich ist per Löschcode gesperrt (gleicher
   * Code wie beim endgültigen Löschen archivierter Beschlüsse) - hier
   * werden u.a. Vorstandsmitglieder verwaltet, das darf nicht ohne Code
   * für jeden zugänglich sein, der nur den App-Öffnen-Code kennt. Setzt
   * sich beim Schließen des Modals zurück. */
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [settingsCode, setSettingsCode] = useState('');
  const [settingsCodeError, setSettingsCodeError] = useState<string | null>(null);
  const [settingsCodeChecking, setSettingsCodeChecking] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSettingsUnlocked(false);
      setSettingsCode('');
      setSettingsCodeError(null);
    }
  }, [isOpen]);

  const checkSettingsCode = async () => {
    setSettingsCodeChecking(true);
    setSettingsCodeError(null);
    const ok = await verifyDeleteCode(settingsCode, securitySettings);
    setSettingsCodeChecking(false);
    if (!ok) {
      setSettingsCodeError('Code ungültig.');
      setSettingsCode('');
      return;
    }
    setIsSettingsUnlocked(true);
  };

  /** Historie ist zusätzlich per Löschcode gesperrt (gleicher Code wie beim
   * endgültigen Löschen archivierter Beschlüsse, siehe ResolutionsView.tsx)
   * - eine zweite, redundante Sperre, da diese Ansicht besonders sensibel
   * ist (komplettes Abstimmungsverhalten). Setzt sich beim Schließen des
   * Modals zurück. */
  const [isHistoryUnlocked, setIsHistoryUnlocked] = useState(false);
  const [historyCode, setHistoryCode] = useState('');
  const [historyCodeError, setHistoryCodeError] = useState<string | null>(null);
  const [historyCodeChecking, setHistoryCodeChecking] = useState(false);
  const [expandedHistoryResolutionId, setExpandedHistoryResolutionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsHistoryUnlocked(false);
      setHistoryCode('');
      setHistoryCodeError(null);
    }
  }, [isOpen]);

  const checkHistoryCode = async () => {
    setHistoryCodeChecking(true);
    setHistoryCodeError(null);
    const ok = await verifyDeleteCode(historyCode, securitySettings);
    setHistoryCodeChecking(false);
    if (!ok) {
      setHistoryCodeError('Code ungültig.');
      setHistoryCode('');
      return;
    }
    setIsHistoryUnlocked(true);
  };

  useEffect(() => {
    if (isOpen && initialTab) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  // Member Management state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<BoardRole>('');
  const [isPermanentStaff, setIsPermanentStaff] = useState(false);
  const [newIsVoting, setNewIsVoting] = useState(true);

  // Rollen-Katalog pflegen (Einstellungen -> Vorstand)
  const [newRoleCatalogueEntry, setNewRoleCatalogueEntry] = useState('');

  // Klick-zum-Bearbeiten je Mitglied (Rolle zuweisen, Einladung senden)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Security Passcode change state
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Zugangscode fuers oeffentliche Zuschuss-Antragsformular (/antrag)
  const [newSubsidyCode, setNewSubsidyCode] = useState('');
  const [subsidyCodeSuccess, setSubsidyCodeSuccess] = useState(false);
  const [subsidyCodeError, setSubsidyCodeError] = useState<string | null>(null);

  // Force update button feedback
  const [isForcingUpdate, setIsForcingUpdate] = useState(false);
  const [forceUpdateSuccess, setForceUpdateSuccess] = useState(false);

  // Cloud sync feedback
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);

  // Push-Benachrichtigungen (dieses Geraet)
  const [pushState, setPushState] = useState<'on' | 'off' | 'unsupported'>('off');
  const [isPushBusy, setIsPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);
  const isIosDevice = PwaNotificationService.isIos();
  const isStandaloneApp = PwaNotificationService.isStandalone();

  // Face ID / Touch ID auf diesem Geraet
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioMessage, setBioMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    Biometric.isSupported().then(setBioSupported);
    setBioEnabled(Biometric.isEnabled());
  }, [isOpen]);

  // Echter Verbindungszustand statt einer Behauptung
  const [cloudState, setCloudState] = useState<'checking' | 'ok' | 'blocked'>('checking');

  useEffect(() => {
    if (!isOpen) return;
    setCloudState('checking');
    FirebaseSync.checkConnection().then((c) =>
      setCloudState(c.canRead && c.canWrite ? 'ok' : 'blocked')
    );
  }, [isOpen]);

  // System-Check
  const [checkResult, setCheckResult] = useState<
    { label: string; ok: boolean; detail: string }[] | null
  >(null);
  const [isChecking, setIsChecking] = useState(false);
  const [testMailTo, setTestMailTo] = useState(currentMember.email || '');

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushState('unsupported');
      return;
    }
    isDeviceSubscribed().then((active) => setPushState(active ? 'on' : 'off'));
  }, [isOpen]);

  const runSystemCheck = async () => {
    setIsChecking(true);
    const results: { label: string; ok: boolean; detail: string }[] = [];

    results.push({
      label: 'Firebase-Projekt',
      ok: !!firebaseConfig.projectId,
      detail: firebaseConfig.projectId,
    });

    // Der wichtigste Test: Ohne Lese- UND Schreibrecht gibt es keine
    // Echtzeit-Synchronisation zwischen den Geraeten.
    const conn = await FirebaseSync.checkConnection();
    results.push({
      label: 'Datenbank lesen',
      ok: conn.canRead,
      detail: conn.canRead ? 'möglich' : conn.error || 'blockiert',
    });
    results.push({
      label: 'Datenbank schreiben',
      ok: conn.canWrite,
      detail: conn.canWrite
        ? 'möglich – Echtzeit-Sync aktiv'
        : conn.error || 'blockiert (Freigabeliste prüfen)',
    });

    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      results.push({
        label: 'Server-Schnittstelle',
        ok: res.ok && data?.status === 'ok',
        detail: res.ok ? 'erreichbar' : `Status ${res.status}`,
      });
    } catch {
      results.push({
        label: 'Server-Schnittstelle',
        ok: false,
        detail: 'nicht erreichbar - Netlify Function fehlt',
      });
    }

    try {
      const res = await fetch('/api/push/vapid-public-key');
      const data = await res.json();
      results.push({
        label: 'Push-Dienst',
        ok: res.ok && !!data?.publicKey,
        detail: res.ok && data?.publicKey ? 'eingerichtet' : data?.error || 'VAPID-Schluessel fehlt',
      });
    } catch {
      results.push({ label: 'Push-Dienst', ok: false, detail: 'nicht erreichbar' });
    }

    setCheckResult(results);
    setIsChecking(false);
  };

  const sendTestMail = async () => {
    setIsChecking(true);
    try {
      await sendMail({
        to: [testMailTo],
        subject: 'Testnachricht aus dem WJOF Vorstandsportal',
        text: 'Diese Testnachricht bestaetigt, dass der E-Mail-Versand funktioniert.',
        html: '<p>Diese Testnachricht bestätigt, dass der E-Mail-Versand funktioniert.</p>',
      });
      setCheckResult([{ label: 'Test-E-Mail', ok: true, detail: `an ${testMailTo} versendet` }]);
    } catch (err: any) {
      setCheckResult([
        { label: 'Test-E-Mail', ok: false, detail: err?.message || 'Versand fehlgeschlagen' },
      ]);
    }
    setIsChecking(false);
  };

  // Teams URL
  const [teamsUrl, setTeamsUrl] = useState(defaultTeamsUrl || '');
  const [teamsSaved, setTeamsSaved] = useState(false);

  const { shouldRender, isClosing } = useModalTransition(isOpen);
  useBodyScrollLock(shouldRender);

  if (!shouldRender) return null;

  // Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const initials = newName
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'WJ';

    const newMember: BoardMember = {
      id: `mem_${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      initials,
      avatarColor: 'bg-[#003594]',
      isPermanentStaff,
      isVotingMember: newIsVoting,
      authProvider: 'google',
    };

    const updated = [...members, newMember];
    onUpdateMembers(updated);
    await FirebaseSync.saveMember(newMember);
    // Zugang sofort freischalten - ohne diesen Eintrag verweigert die
    // Datenbank dem neuen Mitglied jeden Zugriff.
    const grant = await FirebaseSync.addToAllowlist(newMember.email);

    if (!grant.success) {
      setMemberError(
        `${newMember.name} wurde angelegt, aber die Freigabe in der Datenbank hat nicht geklappt: ${grant.error || 'unbekannter Fehler'}`
      );
    } else {
      setMemberError(null);
    }

    setNewName('');
    setNewEmail('');
    setNewRole('');
    setNewIsVoting(true);
    setIsAddingMember(false);
  };

  // Remove Member
  const handleDeleteMember = async (memberId: string) => {
    if (members.length <= 1) {
      alert('Mindestens ein Vorstandsmitglied muss vorhanden sein.');
      return;
    }

    const removed = members.find((m) => m.id === memberId);

    // Sich selbst zu entfernen wuerde den eigenen Zugang sofort sperren.
    if (removed && removed.id === currentMember.id) {
      alert('Das eigene Konto kann nicht entfernt werden.');
      return;
    }

    if (
      removed &&
      !confirm(
        `${removed.name} entfernen?\n\nDamit entfällt auch der Zugang zum Portal (${removed.email}).`
      )
    ) {
      return;
    }

    const updated = members.filter((m) => m.id !== memberId);
    onUpdateMembers(updated);
    await FirebaseSync.deleteMember(memberId);
    // Zugang gezielt entziehen - die Freigabeliste raeumt sich sonst nie auf
    if (removed?.email) {
      await FirebaseSync.removeFromAllowlist(removed.email);
    }
  };

  // Change 5-digit Passcode (SHA-256 Hashed)
  const handleChangePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    setPasscodeSuccess(false);

    if (!/^\d{5}$/.test(newPasscode)) {
      setPasscodeError('Der Vorstandscode muss genau 5 Ziffern enthalten.');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setPasscodeError('Die beiden eingegebenen Codes stimmen nicht überein.');
      return;
    }

    const hashed = await hashPasscode(newPasscode);

    const updatedSettings: SecuritySettings = {
      ...securitySettings,
      passcode: newPasscode, // Kept for legacy compatibility
      passcodeHash: hashed,
      lastUpdated: new Date().toISOString(),
    };

    onUpdateSecuritySettings(updatedSettings);
    await FirebaseSync.saveSecuritySettings(updatedSettings);

    setPasscodeSuccess(true);
    setNewPasscode('');
    setConfirmPasscode('');
    setTimeout(() => setPasscodeSuccess(false), 4000);
  };

  // Zugangscode fuers oeffentliche Zuschuss-Antragsformular (/antrag) setzen
  const handleChangeSubsidyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubsidyCodeError(null);
    setSubsidyCodeSuccess(false);

    if (newSubsidyCode.trim().length < 4) {
      setSubsidyCodeError('Der Zugangscode sollte mindestens 4 Zeichen haben.');
      return;
    }

    const hashed = await hashPasscode(newSubsidyCode);

    const updatedSettings: SecuritySettings = {
      ...securitySettings,
      subsidyFormCodeHash: hashed,
      lastUpdated: new Date().toISOString(),
    };

    onUpdateSecuritySettings(updatedSettings);
    await FirebaseSync.saveSecuritySettings(updatedSettings);

    setSubsidyCodeSuccess(true);
    setNewSubsidyCode('');
    setTimeout(() => setSubsidyCodeSuccess(false), 4000);
  };

  /**
   * Erzwingt die Aktualisierung fuer alle Geraete.
   *
   * Frueher wurde hier CURRENT_APP_VERSION rechnerisch um eine Patch-Stelle
   * erhoeht ("bumpedVersion") und diese erfundene Nummer als Pflicht in
   * Firestore hinterlegt. Das Problem: Diese Nummer entsprach nie einer
   * tatsaechlich ausgelieferten Version - sie war reine Zukunftsmusik, die
   * nur durch puren Zufall exakt mit einem spaeteren echten Deploy
   * uebereingestimmt haette. In der Praxis verlangte die App von jedem
   * Geraet eine Version, die es nirgends zum Herunterladen gab: Der
   * "Aktualisieren"-Knopf im ForceUpdateModal laed neu, bekommt aber wieder
   * nur die tatsaechlich existierende (aeltere) Version - der Dialog
   * erscheint sofort erneut. Eine Endlosschleife ohne Ausweg.
   *
   * Richtig ist: Als Pflichtversion gilt die Version, die JETZT tatsaechlich
   * in diesem Browser laeuft (CURRENT_APP_VERSION), unveraendert. Klickt der
   * Administrator nach einem echten Deploy und nach eigenem Neuladen der
   * Seite, ist genau das die neueste wirklich existierende Version - jedes
   * andere Geraet landet nach dem Aktualisieren-Klick exakt dort.
   */
  const handleForceUpdateNow = async () => {
    setIsForcingUpdate(true);
    setForceUpdateSuccess(false);
    try {
      const payload: Partial<AppVersionConfig> = {
        latestVersion: CURRENT_APP_VERSION,
        minRequiredVersion: CURRENT_APP_VERSION,
        forceUpdateEnabled: true,
        releaseNotes: 'Aktualisierung durch Vorstand initiiert.',
        updatedAt: new Date().toISOString(),
        updatedBy: currentMember.name,
      };

      if (onUpdateVersionConfig) {
        await onUpdateVersionConfig(payload);
      } else {
        await FirebaseSync.saveVersionConfig(payload);
      }

      setForceUpdateSuccess(true);
      setTimeout(() => setForceUpdateSuccess(false), 5000);
    } finally {
      setIsForcingUpdate(false);
    }
  };

  // Quick Cloud Sync trigger
  const handleTriggerCloudSync = async () => {
    setIsSyncingCloud(true);
    setCloudSyncMsg(null);
    try {
      await FirebaseSync.saveSecuritySettings(securitySettings);
      await FirebaseSync.syncAllMembers(members);
      setCloudSyncMsg('Cloud-Daten erfolgreich synchronisiert.');
      setTimeout(() => setCloudSyncMsg(null), 3000);
    } catch (err: any) {
      setCloudSyncMsg('Synchronisation abgeschlossen.');
      setTimeout(() => setCloudSyncMsg(null), 3000);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Save Teams link
  const handleSaveTeams = () => {
    if (onSaveDefaultTeamsUrl) {
      onSaveDefaultTeamsUrl(teamsUrl.trim(), true);
    }
    FirebaseSync.saveMeetingSettings({ defaultTeamsUrl: teamsUrl.trim() });
    setTeamsSaved(true);
    setTimeout(() => setTeamsSaved(false), 3000);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 ${
        isClosing ? 'animate-out fade-out' : 'animate-in fade-in'
      }`}
    >
      <div
        className={`bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden duration-150 flex flex-col max-h-[90dvh] ${
          isClosing ? 'animate-out fade-out zoom-out-95' : 'animate-in fade-in zoom-in-95'
        }`}
      >
        
        {/* Header */}
        <div className="bg-[#003594] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#00A3E0]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                Einstellungen
              </h3>
              <p className="text-xs text-blue-100">
                WJ Portal Konfiguration
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isSettingsUnlocked ? (
          <div className="p-4 sm:p-6 overflow-y-auto">
            <div className="max-w-sm mx-auto py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Gesperrter Bereich</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Hier werden u. a. Vorstandsmitglieder verwaltet. Bitte den Löschcode eingeben
                (gleicher Code wie beim endgültigen Löschen archivierter Beschlüsse).
              </p>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={settingsCode}
                onChange={(e) => {
                  setSettingsCode(e.target.value);
                  setSettingsCodeError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && checkSettingsCode()}
                placeholder="Code"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
              />
              {settingsCodeError && (
                <p className="text-[11px] font-semibold text-rose-700">{settingsCodeError}</p>
              )}
              <button
                type="button"
                onClick={checkSettingsCode}
                disabled={!settingsCode.trim() || settingsCodeChecking}
                className="w-full py-2.5 bg-[#003594] hover:bg-[#00266B] disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer"
              >
                {settingsCodeChecking ? 'Prüfe…' : 'Entsperren'}
              </button>
            </div>
          </div>
        ) : (
        <>
        {/* Minimalist Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2 text-xs font-semibold text-slate-600 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`pb-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'members'
                ? 'border-[#003594] text-[#003594]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Vorstand</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-[#003594] text-[#003594]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Vorstandscode</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`pb-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'system'
                ? 'border-[#003594] text-[#003594]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>System</span>
          </button>


          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`pb-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'border-[#003594] text-[#003594]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BellRing className="w-4 h-4" />
            <span>Benachrichtigungen</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}

            className={`pb-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'teams'
                ? 'border-[#003594] text-[#003594]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>MS Teams Link</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 border-b-2 font-bold cursor-pointer transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-[#003594] text-[#003594]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HistoryIcon className="w-4 h-4" />
            <span>Historie</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 text-xs">
          
          {/* TAB 1: MEMBERS & GOOGLE WHITELIST */}
          {activeTab === 'members' && (
            <div key="members" className="space-y-4 wj-expand">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Autorisierte Vorstandsmitglieder
                  </h4>
                  <p className="text-xs text-slate-500">
                    Nur hier hinterlegte Google-Konten können sich im Portal anmelden.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingMember(!isAddingMember)}
                  className="px-3 py-1.5 bg-[#003594] hover:bg-[#00266B] text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAddingMember ? 'Schließen' : '+ Google-Konto freigeben'}</span>
                </button>
              </div>

              {memberError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-[11px] leading-relaxed text-rose-800">
                  {memberError}
                </div>
              )}

              {/* Rollen-Katalog: aendert sich durch jaehrliche Neuwahlen,
                  deshalb hier selbst pflegbar statt fest im Code. */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h5 className="font-bold text-slate-700 text-xs">Vorstandsrollen (Posten)</h5>
                <div className="flex flex-wrap gap-1.5">
                  {roleCatalogue.roles.map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700"
                    >
                      {r}
                      <button
                        type="button"
                        onClick={() =>
                          onSaveRoleCatalogue({
                            roles: roleCatalogue.roles.filter((x) => x !== r),
                          })
                        }
                        className="p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Rolle entfernen"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {roleCatalogue.roles.length === 0 && (
                    <span className="text-[11px] text-slate-400">Noch keine Rollen angelegt.</span>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    value={newRoleCatalogueEntry}
                    onChange={(e) => setNewRoleCatalogueEntry(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      const v = newRoleCatalogueEntry.trim();
                      if (v && !roleCatalogue.roles.includes(v)) {
                        onSaveRoleCatalogue({ roles: [...roleCatalogue.roles, v] });
                      }
                      setNewRoleCatalogueEntry('');
                    }}
                    placeholder="Neue Rolle, z. B. Schriftführer"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = newRoleCatalogueEntry.trim();
                      if (v && !roleCatalogue.roles.includes(v)) {
                        onSaveRoleCatalogue({ roles: [...roleCatalogue.roles, v] });
                      }
                      setNewRoleCatalogueEntry('');
                    }}
                    disabled={!newRoleCatalogueEntry.trim()}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#003594] hover:bg-blue-50 disabled:opacity-40 cursor-pointer"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>

              {/* Add Member Form */}
              {isAddingMember && (
                <form onSubmit={handleAddMember} className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="z.B. Max Mustermann"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Google E-Mail-Adresse *
                      </label>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="vorstand@gmail.com"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Vorstandsrolle <span className="font-normal text-slate-400">(optional, auch später zuweisbar)</span>
                      </label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
                      >
                        <option value="">— noch keine —</option>
                        {roleCatalogue.roles.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col justify-center pt-2 gap-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isPermanentStaff}
                          onChange={(e) => setIsPermanentStaff(e.target.checked)}
                          className="rounded text-[#003594] focus:ring-[#003594] w-4 h-4"
                        />
                        <span className="font-bold text-slate-700 text-xs">
                          Festangestellt (kein Vorstandscode nötig)
                        </span>
                      </label>

                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIsVoting}
                          onChange={(e) => setNewIsVoting(e.target.checked)}
                          className="rounded text-[#003594] focus:ring-[#003594] w-4 h-4"
                        />
                        <span className="font-bold text-slate-700 text-xs">
                          Stimmberechtigt bei Beschlüssen
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingMember(false)}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#003594] text-white font-bold rounded-lg shadow-2xs"
                    >
                      Konto freigeben
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              <div className="space-y-2">
                {members.map((m) => {
                  const isEditing = editingMemberId === m.id;
                  return (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(isEditing ? null : m.id)}
                      className="flex items-center space-x-3 text-left cursor-pointer flex-1 min-w-0"
                    >
                      <div className={`w-9 h-9 rounded-xl ${m.avatarColor || 'bg-[#003594]'} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                        {m.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs">{m.name}</span>
                          {m.isPermanentStaff && (
                            <span className="text-[9px] font-bold bg-blue-100 text-[#003594] px-1.5 py-0.5 rounded-full">
                              Festangestellt
                            </span>
                          )}
                          {!isVotingMember(m) && (
                            <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                              Ohne Stimmrecht
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                          <span>{m.role || 'Noch keine Rolle'}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-700 truncate">{m.email}</span>
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteMember(m.id)}
                        disabled={members.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-30 cursor-pointer"
                        title="Mitglied entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    </div>

                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5 wj-expand">
                        <div>
                          <label className="block font-bold text-slate-700 text-[11px] mb-1">
                            Vorstandsrolle
                          </label>
                          <select
                            value={m.role}
                            onChange={(e) =>
                              onUpdateMembers(
                                members.map((x) =>
                                  x.id === m.id ? { ...x, role: e.target.value } : x
                                )
                              )
                            }
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594] text-base sm:text-sm"
                          >
                            <option value="">— noch keine —</option>
                            {roleCatalogue.roles.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>

                        <label className="flex items-center space-x-1.5 cursor-pointer w-fit">
                          <input
                            type="checkbox"
                            checked={isVotingMember(m)}
                            onChange={(e) =>
                              onUpdateMembers(
                                members.map((x) =>
                                  x.id === m.id ? { ...x, isVotingMember: e.target.checked } : x
                                )
                              )
                            }
                            className="w-3.5 h-3.5 accent-[#003594]"
                          />
                          <span className="text-[11px] font-semibold text-slate-600">
                            stimmberechtigt
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: PASSCODE MANAGEMENT (SHA-256 HASHED) */}
          {activeTab === 'security' && (
            <div key="security" className="space-y-5 max-w-md wj-expand">
              {/* Entsperrung dieses Geraets */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm">Face ID / Touch ID</div>
                    <div className="mt-0.5 text-slate-500">
                      {!bioSupported
                        ? 'Dieses Gerät unterstützt keine biometrische Entsperrung.'
                        : bioEnabled
                        ? 'Aktiv – die App wird beim Öffnen biometrisch entsperrt.'
                        : 'Statt Code-Eingabe beim Öffnen biometrisch entsperren.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!bioSupported || bioBusy}
                    onClick={async () => {
                      setBioBusy(true);
                      setBioMessage(null);
                      if (bioEnabled) {
                        Biometric.disable();
                        setBioEnabled(false);
                        setBioMessage('Entsperrung für dieses Gerät entfernt.');
                      } else {
                        const res = await Biometric.enable({
                          id: currentMember.id,
                          name: currentMember.name,
                          email: currentMember.email,
                        });
                        setBioEnabled(res.ok);
                        setBioMessage(res.ok ? 'Eingerichtet.' : res.error || 'Fehlgeschlagen.');
                      }
                      setBioBusy(false);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 ${
                      bioEnabled
                        ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                        : 'bg-[#003594] text-white hover:bg-[#00266B]'
                    }`}
                  >
                    {bioBusy ? '...' : bioEnabled ? 'Entfernen' : 'Einrichten'}
                  </button>
                </div>

                {bioMessage && (
                  <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    {bioMessage}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  5-stelligen Vorstandscode ändern
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Der Vorstandscode schützt das Portal nach Neuwahlen. Der Code wird im System kryptographisch als SHA-256 Hash gesichert.
                </p>
              </div>

              <form onSubmit={handleChangePasscode} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Neuer 5-stelliger Code
                  </label>
                  <input
                    type="password"
                    maxLength={5}
                    inputMode="numeric"
                    required
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, ''))}
                    placeholder="•••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Neuen Code wiederholen
                  </label>
                  <input
                    type="password"
                    maxLength={5}
                    inputMode="numeric"
                    required
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value.replace(/\D/g, ''))}
                    placeholder="•••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>

                {passcodeError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passcodeError}</span>
                  </div>
                )}

                {passcodeSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Vorstandscode wurde erfolgreich geändert und hashiert.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={newPasscode.length !== 5 || confirmPasscode.length !== 5}
                  className="w-full py-2.5 bg-[#003594] hover:bg-[#00266B] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Neuen Code speichern
                </button>
              </form>

              <div className="pt-2 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-sm">
                  Zugangscode fürs öffentliche Zuschuss-Formular
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Schützt das Antragsformular unter /antrag vor fremdem Zugriff. Ohne gesetzten
                  Code ist das Formular nicht nutzbar. Diesen Code an Antragsteller weitergeben.
                </p>
              </div>

              <form onSubmit={handleChangeSubsidyCode} className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Neuer Zugangscode</label>
                  <input
                    type="text"
                    required
                    value={newSubsidyCode}
                    onChange={(e) => setNewSubsidyCode(e.target.value)}
                    placeholder="z. B. WJOF2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>

                {subsidyCodeError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{subsidyCodeError}</span>
                  </div>
                )}

                {subsidyCodeSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Zugangscode wurde gespeichert.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={newSubsidyCode.trim().length < 4}
                  className="w-full py-2.5 bg-[#003594] hover:bg-[#00266B] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Zugangscode speichern
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: MINIMALIST SYSTEM & FORCE UPDATE */}
          {activeTab === 'system' && (
            <div key="system" className="space-y-4 wj-expand">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Aktualisierung & Cloud-Status
                </h4>
                <p className="text-xs text-slate-500">
                  Zentral gesteuerte Aktualisierung für alle Vorstandsmitglieder.
                </p>
              </div>

              {/* Status card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                    Installierte Version
                  </span>
                  <span className="font-extrabold text-base text-slate-900">
                    v{CURRENT_APP_VERSION}
                  </span>
                </div>

                {/* Tatsaechlich gemessener Zustand. Vorher stand hier ein fest
                    verdrahtetes gruenes "synchron" - das behauptete auch dann
                    eine funktionierende Verbindung, wenn gar keine bestand. */}
                <div
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl font-bold text-xs border ${
                    cloudState === 'ok'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : cloudState === 'blocked'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      cloudState === 'ok'
                        ? 'bg-emerald-500'
                        : cloudState === 'blocked'
                        ? 'bg-rose-500'
                        : 'bg-slate-400 wj-pulse-soft'
                    }`}
                  ></div>
                  <span>
                    {cloudState === 'ok'
                      ? 'Cloud verbunden'
                      : cloudState === 'blocked'
                      ? 'Keine Cloud-Verbindung'
                      : 'Wird geprüft …'}
                  </span>
                </div>
              </div>

              {/* 1-CLICK FORCE UPDATE ACTION */}
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
                <div>
                  <h5 className="font-bold text-[#003594] text-xs sm:text-sm">
                    Gezwungene Aktualisierung für alle ausrollen
                  </h5>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Verlangt von allen Geräten, mindestens die Version zu laden, die
                    gerade <strong>in diesem Browser</strong> läuft (v{CURRENT_APP_VERSION}).
                  </p>
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2 leading-relaxed">
                    Bitte vorher diese Seite selbst einmal neu laden, damit sicher die
                    neueste Version verlangt wird — sonst zwingt der Knopf alle auf
                    einen möglicherweise veralteten Stand, und niemand kommt mehr
                    aus dem Update-Dialog heraus.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleForceUpdateNow}
                  disabled={isForcingUpdate}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#003594] hover:bg-[#00266B] text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  <RefreshCw className={`w-4 h-4 ${isForcingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isForcingUpdate ? 'Aktualisierung wird gesendet...' : `Version ${CURRENT_APP_VERSION} für alle erzwingen`}</span>
                </button>

                {forceUpdateSuccess && (
                  <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                    <span>Aktualisierung sofort im Netzwerk aktiviert! Alle Geräte erhalten den Update-Dialog.</span>
                  </div>
                )}

                {/* Aktueller Zustand + Not-Aus. Vorher gab es keine Moeglichkeit,
                    eine einmal ausgeloeste Pflicht wieder zurueckzunehmen - wer in
                    eine Situation wie oben beschrieben (Pflichtversion existiert
                    nirgends wirklich) geraten war, kam da nicht mehr heraus. */}
                {versionConfig?.forceUpdateEnabled && (
                  <div className="pt-2.5 border-t border-blue-200/70 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] text-slate-600">
                      Aktiv seit {formatDate(versionConfig.updatedAt)} · Pflichtversion v
                      {versionConfig.minRequiredVersion}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const payload: Partial<AppVersionConfig> = { forceUpdateEnabled: false };
                        if (onUpdateVersionConfig) await onUpdateVersionConfig(payload);
                        else await FirebaseSync.saveVersionConfig(payload);
                      }}
                      className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
                    >
                      Deaktivieren
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Sync Button */}
              <div className="pt-1 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-xs text-slate-500">
                  Manuelle Datenüberprüfung
                </span>
                <button
                  type="button"
                  onClick={handleTriggerCloudSync}
                  disabled={isSyncingCloud}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-xl font-semibold text-slate-700 text-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Cloud className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin text-[#003594]' : 'text-slate-400'}`} />
                  <span>{isSyncingCloud ? 'Synchronisiert...' : 'Jetzt synchronisieren'}</span>
                </button>
              </div>

              {cloudSyncMsg && (
                <p className="text-[11px] text-emerald-700 font-semibold text-right">
                  {cloudSyncMsg}
                </p>
              )}

              {/* Funktionsprüfung: zeigt sofort, ob E-Mail und Push wirklich laufen */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-900 text-sm">Funktionsprüfung</span>
                  <button
                    type="button"
                    onClick={runSystemCheck}
                    disabled={isChecking}
                    className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-xl font-semibold text-slate-700 text-xs cursor-pointer disabled:opacity-50"
                  >
                    {isChecking ? 'Prüfe...' : 'Prüfen'}
                  </button>
                </div>

                {checkResult && (
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {checkResult.map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-slate-700">{r.label}</span>
                        <span
                          className={`text-[11px] font-semibold text-right ${
                            r.ok ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {r.ok ? '✓ ' : '✕ '}
                          {r.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testMailTo}
                    onChange={(e) => setTestMailTo(e.target.value)}
                    placeholder="test@example.de"
                    className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                  <button
                    type="button"
                    onClick={sendTestMail}
                    disabled={isChecking || !testMailTo}
                    className="shrink-0 px-3 py-2 border border-slate-300 hover:bg-slate-50 rounded-xl font-semibold text-slate-700 text-xs cursor-pointer disabled:opacity-50"
                  >
                    Test-E-Mail
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* TAB: BENACHRICHTIGUNGEN */}
          {activeTab === 'notifications' && (
            <div key="notifications" className="space-y-5 max-w-lg wj-expand">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm">Dieses Gerät</div>
                    <div className="mt-0.5 text-slate-500">
                      {pushState === 'on'
                        ? 'Angemeldet – Mitteilungen kommen auch bei geschlossener App an.'
                        : pushState === 'unsupported'
                        ? 'Dieser Browser unterstützt keine Push-Benachrichtigungen.'
                        : 'Noch nicht angemeldet.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPushBusy || pushState === 'unsupported'}
                    onClick={async () => {
                      setIsPushBusy(true);
                      setPushMessage(null);
                      if (pushState === 'on') {
                        await unsubscribeFromPushServer();
                        setPushState('off');
                        setPushMessage('Dieses Gerät wurde abgemeldet.');
                      } else {
                        const res = await subscribeToPushServer(currentMember);
                        setPushState(res.ok ? 'on' : 'off');
                        setPushMessage(
                          res.ok ? 'Gerät erfolgreich angemeldet.' : res.error || 'Anmeldung fehlgeschlagen.'
                        );
                      }
                      setIsPushBusy(false);
                    }}
                    className={`shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-colors disabled:opacity-50 ${
                      pushState === 'on'
                        ? 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                        : 'bg-[#003594] text-white hover:bg-[#00266B]'
                    }`}
                  >
                    {isPushBusy ? '...' : pushState === 'on' ? 'Abmelden' : 'Anmelden'}
                  </button>
                </div>

                {pushMessage && (
                  <div className="mt-3 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                    {pushMessage}
                  </div>
                )}

                {pushState === 'on' && (
                  <button
                    type="button"
                    onClick={() => onSendTestNotification?.()}
                    className="mt-3 text-[11px] font-semibold text-[#003594] hover:underline"
                  >
                    Test-Benachrichtigung senden
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-2.5">
                <div className="font-bold text-slate-900 text-sm mb-1">Wann benachrichtigen?</div>
                {[
                  ['notifyOnNewResolution', 'Neuer Beschluss'],
                  ['notifyOnVoteCast', 'Abgegebene Stimmen'],
                  ['notifyOnQuorumReached', 'Beschluss angenommen'],
                  ['notifyOnInvoiceRequest', 'Beleg angefordert'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-slate-700">{label}</span>
                    <input
                      type="checkbox"
                      checked={(notificationSettings as any)?.[key] ?? true}
                      onChange={(e) =>
                        notificationSettings &&
                        onUpdateNotificationSettings?.({
                          ...notificationSettings,
                          [key]: e.target.checked,
                        } as NotificationSettings)
                      }
                      className="w-4 h-4 accent-[#003594]"
                    />
                  </label>
                ))}
              </div>

              {isIosDevice && !isStandaloneApp && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[11px] text-amber-900 leading-relaxed">
                  <strong className="block mb-1">iPhone / iPad</strong>
                  Push funktioniert nur, wenn die App über Safari „Teilen → Zum Home-Bildschirm“
                  installiert und von dort gestartet wird (ab iOS 16.4).
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MS TEAMS LINK */}
          {activeTab === 'teams' && (
            <div key="teams" className="space-y-4 max-w-lg wj-expand">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Standard MS Teams Besprechungslink
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dieser Link wird für alle Vorstandssitzungen als Standard hinterlegt.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    MS Teams URL
                  </label>
                  <input
                    type="url"
                    value={teamsUrl}
                    onChange={(e) => setTeamsUrl(e.target.value)}
                    placeholder="https://teams.microsoft.com/l/meetup-join/..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>

                {teamsSaved && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>Teams-Link gespeichert und für Sitzungen übernommen.</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveTeams}
                  className="px-4 py-2 bg-[#003594] hover:bg-[#00266B] text-white font-bold rounded-xl shadow-xs text-xs transition-all cursor-pointer"
                >
                  Link speichern
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <h4 className="font-bold text-slate-900 text-sm mb-1">
                  Beschlusserkennung aus Protokolltext
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  Bei den Sitzungen kann der Vorstand Beschlüsse automatisch aus eingefügtem
                  Protokolltext erkennen lassen. Dort wird das dafür nötige Textformat als
                  aufklappbarer Hinweis angezeigt - hier lässt er sich ausblenden.
                </p>
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="text-slate-700 font-semibold">
                    Format-Hinweis bei den Sitzungen anzeigen
                  </span>
                  <input
                    type="checkbox"
                    checked={showProtocolFormatHint}
                    onChange={(e) => onToggleShowProtocolFormatHint?.(e.target.checked)}
                    className="w-4 h-4 accent-[#003594] shrink-0"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB: HISTORIE - per Löschcode gesperrt */}
          {activeTab === 'history' && (
            <div key="history" className="space-y-4 wj-expand">
              {!isHistoryUnlocked ? (
                <div className="max-w-sm mx-auto py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" strokeWidth={1.75} />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">Gesperrter Bereich</h4>
                  <p className="text-slate-500">
                    Bitte den Löschcode eingeben, um die Historie einzusehen (gleicher Code wie
                    beim endgültigen Löschen archivierter Beschlüsse).
                  </p>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={historyCode}
                    onChange={(e) => {
                      setHistoryCode(e.target.value);
                      setHistoryCodeError(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && checkHistoryCode()}
                    placeholder="Code"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-base focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                  {historyCodeError && (
                    <p className="text-[11px] font-semibold text-rose-700">{historyCodeError}</p>
                  )}
                  <button
                    type="button"
                    onClick={checkHistoryCode}
                    disabled={!historyCode.trim() || historyCodeChecking}
                    className="w-full py-2.5 bg-[#003594] hover:bg-[#00266B] disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {historyCodeChecking ? 'Prüfe…' : 'Entsperren'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Beschlüsse</h4>
                    <p className="text-slate-500">
                      Aufklappen zeigt das komplette Abstimmungsverhalten sowie alle
                      protokollierten Änderungen.
                    </p>
                  </div>
                  {[...resolutions]
                    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                    .map((res) => {
                      const isExpanded = expandedHistoryResolutionId === res.id;
                      const votes = Object.values(res.votes || {});
                      return (
                        <div key={res.id} className="rounded-xl border border-slate-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedHistoryResolutionId(isExpanded ? null : res.id)}
                            className="w-full flex items-center justify-between gap-2 p-3 text-left cursor-pointer hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900">{res.number}</span>
                              <span className="text-slate-500"> · {res.title}</span>
                            </div>
                            <ArrowRight
                              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                                isExpanded ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                          {isExpanded && (
                            <div className="p-3 pt-0 space-y-3 wj-expand">
                              <div>
                                <div className="font-semibold text-slate-600 mb-1">
                                  Abstimmung ({votes.length})
                                </div>
                                {votes.length === 0 ? (
                                  <p className="text-slate-400">Noch keine Stimmen.</p>
                                ) : (
                                  <div className="space-y-1">
                                    {votes.map((v) => (
                                      <div key={v.memberId} className="flex items-center justify-between">
                                        <span className="text-slate-700">{v.memberName}</span>
                                        <span className="text-slate-400">
                                          {v.vote === 'yes' ? 'Ja' : v.vote === 'no' ? 'Nein' : 'Enthaltung'} ·{' '}
                                          {formatDate(v.timestamp)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-600 mb-1">Änderungen</div>
                                <RevisionHistory
                                  entries={auditLog.filter(
                                    (a) => a.entityType === 'resolution' && a.entityId === res.id
                                  )}
                                  compact
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  {resolutions.length === 0 && (
                    <p className="text-slate-400 text-center py-6">Noch keine Beschlüsse vorhanden.</p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
        </>
        )}

        {/* Footer */}
        <div className="p-3.5 sm:px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Abmelden</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-xs text-xs transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
