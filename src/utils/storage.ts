import { 
  BoardMember, 
  Resolution, 
  Invoice, 
  InvoiceFolder,
  Meeting, 
  SecuritySettings, 
  AuthSession, 
  EmailNotificationLog, 
  InvoiceRequest,
  InAppNotification,
  NotificationSettings,
  EmailServerConfig,
  AuditLogEntry,
  MeetingSeries
} from '../types';
import { INITIAL_BOARD_MEMBERS, INITIAL_RESOLUTIONS, INITIAL_INVOICES, INITIAL_INVOICE_FOLDERS, INITIAL_MEETINGS, INITIAL_SECURITY_SETTINGS } from '../data/initialData';
import { normalizeSecuritySettings } from './security';
import { SubsidyCatalogueSettings, DEFAULT_SUBSIDY_CATALOGUE_SETTINGS } from '../data/subsidyCatalogue';
import { RoleCatalogueSettings, DEFAULT_ROLE_CATALOGUE } from '../data/roleCatalogue';

const INITIAL_NOTIFICATIONS: InAppNotification[] = [];

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  notifyOnNewResolution: true,
  notifyOnVoteSubmitted: true,
  notifyOnQuorumReached: true,
  notifyOnInvoiceRequest: true,
  notifyOnUpcomingMeeting: true,
  autoRemindHoursBeforeDeadline: 24,
};

/**
 * Zugangsdaten fuer den E-Mail-Versand liegen bewusst NICHT hier:
 * Alles im Browser ist oeffentlich lesbar. Der Resend-Schluessel steht
 * ausschliesslich serverseitig in den Netlify-Umgebungsvariablen
 * (RESEND_API_KEY / RESEND_FROM) und wird von der Netlify-Function genutzt.
 */
export const DEFAULT_EMAIL_SERVER_CONFIG: EmailServerConfig = {
  provider: 'resend',
  senderEmail: '',
  senderName: 'WJ Vorstand',
  isConfigured: false,
};

const INITIAL_EMAIL_LOGS: EmailNotificationLog[] = [];

const INITIAL_INVOICE_REQUESTS: InvoiceRequest[] = [];

const STORAGE_KEYS = {
  MEMBERS: 'wj_offenbach_members_v1',
  CURRENT_MEMBER_ID: 'wj_offenbach_current_member_id_v1',
  RESOLUTIONS: 'wj_offenbach_resolutions_v1',
  INVOICES: 'wj_offenbach_invoices_v1',
  INVOICE_FOLDERS: 'wj_offenbach_invoice_folders_v1',
  MEETINGS: 'wj_offenbach_meetings_v1',
  MEETING_SERIES: 'wj_offenbach_meeting_series_v1',
  SECURITY: 'wj_offenbach_security_v1',
  AUTH_SESSION: 'wj_offenbach_auth_session_v1',
  EMAIL_LOGS: 'wj_offenbach_email_logs_v1',
  INVOICE_REQUESTS: 'wj_offenbach_invoice_requests_v1',
  NOTIFICATIONS: 'wj_offenbach_notifications_v1',
  NOTIFICATION_SETTINGS: 'wj_offenbach_notif_settings_v1',
  EMAIL_CONFIG: 'wj_offenbach_email_config_v1',
  DEFAULT_TEAMS_URL: 'wj_offenbach_default_teams_url_v1',
  SHOW_PROTOCOL_FORMAT_HINT: 'wj_offenbach_show_protocol_format_hint_v1',
  SUBSIDIES: 'wj_offenbach_subsidies_v1',
  SUBSIDY_PEOPLE: 'wj_offenbach_subsidy_people_v1',
  CLUB_ACCOUNT: 'wj_offenbach_club_account_v1',
  SUBSIDY_CATALOGUE: 'wj_offenbach_subsidy_catalogue_v1',
  ROLE_CATALOGUE: 'wj_offenbach_role_catalogue_v1',
  AUDIT_LOG: 'wj_offenbach_audit_log_v1',
};


/**
 * Entfernt Dateiinhalte vor dem Ablegen im Browser-Speicher.
 *
 * Der lokale Speicher fasst rund 5 MB je Adresse. Belege als Base64 wuerden
 * ihn nach wenigen Eintraegen sprengen - und weil das Schreiben dann
 * fehlschlaegt, gingen ALLE weiteren Aenderungen verloren, ohne dass es
 * jemand bemerkt. Die Dateien liegen ohnehin in Firestore; lokal genuegt der
 * Verweis darauf.
 */
const FILE_PAYLOAD_KEYS = ['dataUrl', 'fileUrl', 'filePreview'];

function stripFilePayloads<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (key, val) =>
      FILE_PAYLOAD_KEYS.includes(key) && typeof val === 'string' && val.startsWith('data:')
        ? undefined
        : val
    )
  );
}

/** Meldet sich, wenn der Browser-Speicher voll ist. */
let quotaWarningShown = false;
function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' || err?.name === 'NS_ERROR_DOM_QUOTA_REACHED';
    if (isQuota && !quotaWarningShown) {
      quotaWarningShown = true;
      console.warn(
        'Der lokale Zwischenspeicher ist voll. Die Daten liegen weiterhin in der Cloud.'
      );
    } else if (!isQuota) {
      console.warn('Lokales Speichern fehlgeschlagen:', err?.message);
    }
  }
}

export const AppStorage = {
  getMembers(): BoardMember[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      return data ? JSON.parse(data) : INITIAL_BOARD_MEMBERS;
    } catch {
      return INITIAL_BOARD_MEMBERS;
    }
  },

  saveMembers(members: BoardMember[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    } catch (e) {
      console.error('Error saving members', e);
    }
  },

  getCurrentMemberId(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_MEMBER_ID) || 'mem_1';
    } catch {
      return 'mem_1';
    }
  },

  saveCurrentMemberId(id: string) {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_MEMBER_ID, id);
    } catch (e) {
      console.error('Error saving current member id', e);
    }
  },

  getSecuritySettings(): SecuritySettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SECURITY);
      if (!data) return INITIAL_SECURITY_SETTINGS;
      return normalizeSecuritySettings(JSON.parse(data) as SecuritySettings);
    } catch {
      return INITIAL_SECURITY_SETTINGS;
    }
  },

  saveSecuritySettings(settings: SecuritySettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SECURITY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving security settings', e);
    }
  },

  isExemptFromCode(memberOrEmail: BoardMember | string, settings: SecuritySettings): boolean {
    if (typeof memberOrEmail === 'string') {
      const email = memberOrEmail.toLowerCase().trim();
      return settings.exemptEmails.some((e) => e.toLowerCase().trim() === email);
    }
    if (memberOrEmail.isPermanentStaff) return true;
    if (settings.exemptMemberIds.includes(memberOrEmail.id)) return true;
    if (settings.exemptEmails.some((e) => e.toLowerCase().trim() === memberOrEmail.email.toLowerCase().trim())) return true;
    return false;
  },

  getAuthSession(): AuthSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveAuthSession(session: AuthSession | null) {
    try {
      if (!session) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
      } else {
        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
      }
    } catch (e) {
      console.error('Error saving auth session', e);
    }
  },

  getResolutions(): Resolution[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESOLUTIONS);
      if (!data) return [];
      const list: Resolution[] = JSON.parse(data);
      // Filter out legacy mock data if present
      return list.filter((r) => r.id !== 'res_1');
    } catch {
      return [];
    }
  },

  saveResolutions(resolutions: Resolution[]) {
    safeSet(STORAGE_KEYS.RESOLUTIONS, stripFilePayloads(resolutions));
  },

  getInvoices(): Invoice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      if (!data) return [];
      const list: Invoice[] = JSON.parse(data);
      // Filter out legacy mock data if present
      return list.filter((i) => i.id !== 'inv_1');
    } catch {
      return [];
    }
  },

  saveInvoices(invoices: Invoice[]) {
    safeSet(STORAGE_KEYS.INVOICES, stripFilePayloads(invoices));
  },

  getInvoiceFolders(): InvoiceFolder[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICE_FOLDERS);
      return data ? JSON.parse(data) : INITIAL_INVOICE_FOLDERS;
    } catch {
      return INITIAL_INVOICE_FOLDERS;
    }
  },

  saveInvoiceFolders(folders: InvoiceFolder[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICE_FOLDERS, JSON.stringify(folders));
    } catch (e) {
      console.error('Error saving invoice folders', e);
    }
  },

  getMeetings(): Meeting[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEETINGS);
      if (!data) return [];
      const list: Meeting[] = JSON.parse(data);
      // Filter out legacy mock data if present
      return list.filter((m) => m.id !== 'meet_1');
    } catch {
      return [];
    }
  },

  saveMeetings(meetings: Meeting[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.MEETINGS, JSON.stringify(meetings));
    } catch (e) {
      console.error('Error saving meetings', e);
    }
  },

  getMeetingSeries(): MeetingSeries[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEETING_SERIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveMeetingSeriesList(series: MeetingSeries[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.MEETING_SERIES, JSON.stringify(series));
    } catch (e) {
      console.error('Error saving meeting series', e);
    }
  },

  getDefaultTeamsUrl(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.DEFAULT_TEAMS_URL) || 'https://teams.microsoft.com';
    } catch {
      return 'https://teams.microsoft.com';
    }
  },

  saveDefaultTeamsUrl(url: string) {
    try {
      localStorage.setItem(STORAGE_KEYS.DEFAULT_TEAMS_URL, url.trim());
    } catch (e) {
      console.error('Error saving default teams url', e);
    }
  },

  /** Rein lokale Anzeige-Einstellung (kein Firestore-Sync noetig, jedes
   *  Vorstandsmitglied entscheidet selbst auf seinem Geraet). */
  getShowProtocolFormatHint(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SHOW_PROTOCOL_FORMAT_HINT);
      return data === null ? true : data === 'true';
    } catch {
      return true;
    }
  },

  saveShowProtocolFormatHint(value: boolean) {
    try {
      localStorage.setItem(STORAGE_KEYS.SHOW_PROTOCOL_FORMAT_HINT, String(value));
    } catch (e) {
      console.error('Error saving protocol format hint visibility', e);
    }
  },

  getEmailLogs(): EmailNotificationLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EMAIL_LOGS);
      return data ? JSON.parse(data) : INITIAL_EMAIL_LOGS;
    } catch {
      return INITIAL_EMAIL_LOGS;
    }
  },

  saveEmailLogs(logs: EmailNotificationLog[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.EMAIL_LOGS, JSON.stringify(logs));
    } catch (e) {
      console.error('Error saving email logs', e);
    }
  },

  addEmailLog(log: Omit<EmailNotificationLog, 'id' | 'sentAt'>) {
    const newLog: EmailNotificationLog = {
      ...log,
      id: `eml_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sentAt: new Date().toISOString(),
    };
    const current = this.getEmailLogs();
    const updated = [newLog, ...current];
    this.saveEmailLogs(updated);
    return updated;
  },

  getInvoiceRequests(): InvoiceRequest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICE_REQUESTS);
      return data ? JSON.parse(data) : INITIAL_INVOICE_REQUESTS;
    } catch {
      return INITIAL_INVOICE_REQUESTS;
    }
  },

  saveInvoiceRequests(requests: InvoiceRequest[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICE_REQUESTS, JSON.stringify(requests));
    } catch (e) {
      console.error('Error saving invoice requests', e);
    }
  },

  addInvoiceRequest(request: Omit<InvoiceRequest, 'id' | 'createdAt'>) {
    const newReq: InvoiceRequest = {
      ...request,
      id: `req_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const current = this.getInvoiceRequests();
    const updated = [newReq, ...current];
    this.saveInvoiceRequests(updated);
    return updated;
  },

  getNotifications(): InAppNotification[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      return data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  saveNotifications(notifications: InAppNotification[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (e) {
      console.error('Error saving notifications', e);
    }
  },

  getAuditLog(): AuditLogEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveAuditLog(entries: AuditLogEntry[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(entries));
    } catch (e) {
      console.error('Error saving audit log', e);
    }
  },

  addNotification(notif: Omit<InAppNotification, 'id' | 'timestamp' | 'isRead'> & { id?: string; timestamp?: string; isRead?: boolean }): InAppNotification[] {
    const newEntry: InAppNotification = {
      id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: notif.timestamp || new Date().toISOString(),
      isRead: notif.isRead || false,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      targetTab: notif.targetTab,
      targetId: notif.targetId,
      actionUrl: notif.actionUrl,
      iconType: notif.iconType,
    };
    const current = this.getNotifications();
    const updated = [newEntry, ...current];
    this.saveNotifications(updated);
    return updated;
  },

  getNotificationSettings(): NotificationSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      return data ? JSON.parse(data) : DEFAULT_NOTIFICATION_SETTINGS;
    } catch {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  },

  saveNotificationSettings(settings: NotificationSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving notification settings', e);
    }
  },

  getEmailServerConfig(): EmailServerConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EMAIL_CONFIG);
      return data ? JSON.parse(data) : DEFAULT_EMAIL_SERVER_CONFIG;
    } catch {
      return DEFAULT_EMAIL_SERVER_CONFIG;
    }
  },

  saveEmailServerConfig(config: EmailServerConfig) {
    try {
      localStorage.setItem(STORAGE_KEYS.EMAIL_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving email server config', e);
    }
  },

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEYS.MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_MEMBER_ID);
    localStorage.removeItem(STORAGE_KEYS.RESOLUTIONS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem(STORAGE_KEYS.MEETINGS);
    localStorage.removeItem(STORAGE_KEYS.SECURITY);
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    localStorage.removeItem(STORAGE_KEYS.EMAIL_LOGS);
    localStorage.removeItem(STORAGE_KEYS.INVOICE_REQUESTS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.EMAIL_CONFIG);
  },
  /** Admin-editierbare Vorstandsrollen (aendern sich durch jaehrliche Neuwahlen). */
  getRoleCatalogue(): RoleCatalogueSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ROLE_CATALOGUE);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_ROLE_CATALOGUE;
  },
  saveRoleCatalogue(settings: RoleCatalogueSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.ROLE_CATALOGUE, JSON.stringify(settings));
    } catch {}
  },
};

// --- Zuschuesse -------------------------------------------------------------

export const SubsidyStorage = {
  getSubsidies(): any[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSIDIES) || '[]');
    } catch {
      return [];
    }
  },
  saveSubsidies(list: any[]) {
    safeSet(STORAGE_KEYS.SUBSIDIES, stripFilePayloads(list));
  },
  getPeople(): any[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSIDY_PEOPLE) || '[]');
    } catch {
      return [];
    }
  },
  savePeople(list: any[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSIDY_PEOPLE, JSON.stringify(list));
    } catch {}
  },
  /** Auftraggeberkonto fuer die Sammelueberweisung. */
  getClubAccount(): { name: string; iban: string; bic?: string } {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CLUB_ACCOUNT);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { name: 'Wirtschaftsjunioren Offenbach am Main e.V.', iban: '', bic: '' };
  },
  saveClubAccount(account: { name: string; iban: string; bic?: string }) {
    try {
      localStorage.setItem(STORAGE_KEYS.CLUB_ACCOUNT, JSON.stringify(account));
    } catch {}
  },
  /** Admin-editierbarer Zuschuss-Katalog (Veranstaltungen + Jahres-Obergrenzen). */
  getCatalogueSettings(): SubsidyCatalogueSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SUBSIDY_CATALOGUE);
      if (raw) return JSON.parse(raw);
    } catch {}
    return DEFAULT_SUBSIDY_CATALOGUE_SETTINGS;
  },
  saveCatalogueSettings(settings: SubsidyCatalogueSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSIDY_CATALOGUE, JSON.stringify(settings));
    } catch {}
  },
};
