/**
 * Rein ein Anzeige-Feld, keine Berechtigungslogik haengt an konkreten
 * Werten (das steuern die separaten Felder `isVotingMember`/
 * `isPermanentStaff` auf `BoardMember`) - deshalb bewusst `string` statt
 * eines festen Unions-Typs. Die tatsaechlich waehlbaren Werte pflegt der
 * Vorstand selbst ueber den Rollen-Katalog (siehe
 * src/data/roleCatalogue.ts, `settings/roleCatalogue` in Firestore) -
 * durch jaehrliche Neuwahlen aendert sich diese Liste.
 */
export type BoardRole = string;

export interface BoardMember {
  id: string;
  name: string;
  role: BoardRole;
  email: string;
  phone?: string;
  initials: string;
  avatarColor: string;
  isCurrentUser?: boolean;
  isPermanentStaff?: boolean; // If true, exempt from 5-digit code
  /**
   * Stimmberechtigt bei Beschluessen.
   *
   * Nicht gesetzt = Altbestand: dann gilt die frueher genutzte Regel
   * "festangestellt bedeutet kein Stimmrecht". Neu angelegte Mitglieder
   * tragen den Wert ausdruecklich, damit Befreiung vom Vorstandscode und
   * Stimmrecht unabhaengig voneinander einstellbar sind.
   */
  isVotingMember?: boolean;
  isAdmin?: boolean; // System Administrator privileges
  password?: string; // User login password
  credentialsSentAt?: string; // Timestamp when access credentials were sent via email
  authProvider?: 'google' | 'email' | 'demo';
  order?: number;
  pushSubscriptions?: any[];
}

export interface SecuritySettings {
  /** Nicht mehr verwendet - der Code wird ausschliesslich als Hash gespeichert. */
  passcode?: string; // Legacy fallback / clear representation
  passcodeHash?: string; // SHA-256 secure hash of 5-digit passcode
  exemptMemberIds: string[]; // BoardMember IDs who don't need the code
  exemptEmails: string[]; // Email addresses that bypass code
  adminMemberId?: string; // Primary system administrator ID
  adminEmail?: string; // Primary system administrator email
  /**
   * SHA-256 des Codes zum endgueltigen Loeschen archivierter Beschluesse.
   * Bewusst getrennt vom Vorstandscode: Loeschen ist unwiderruflich.
   */
  deleteCodeHash?: string;
  /** SHA-256 des Zugangscodes fuer das oeffentliche Zuschuss-Antragsformular (/antrag). */
  subsidyFormCodeHash?: string;
  lastUpdated: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  isCodeVerified: boolean;
  user: BoardMember | null;
}

export type VoteType = 'yes' | 'no' | 'abstain';

export interface Vote {
  memberId: string;
  memberName: string;
  memberRole: string;
  vote: VoteType;
  timestamp: string;
  note?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  timestamp: string;
}

export type BookkeepingStatus = 'bearbeitet' | 'nicht_bearbeitet' | 'nicht_notwendig';

export type InvoiceRecurrence = 'monatlich' | 'quartalsweise' | 'halbjaehrlich' | 'jaehrlich' | 'einmalig';

export interface InvoiceFolder {
  id: string;
  name: string; // e.g. "IONOS & Webhosting"
  description?: string;
  color?: string; // hex or tailwind color class
  icon?: string;
  recurrence?: InvoiceRecurrence;
  expectedAmount?: number;
  expectedDayOfMonth?: number; // e.g. 15
  vendor?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}

export type InvoiceCategory = 
  | 'Events & Projekte'
  | 'Marketing & PR'
  | 'IT, Web & Lizenzen'
  | 'Verwaltung & IHK'
  | 'Konferenzen (LAKO/BUKO)'
  | 'Sonstiges';

export type InvoiceStatus = 'eingereicht' | 'geprueft' | 'freigegeben' | 'ausgezahlt';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  vendor: string;
  amount: number;
  date: string;
  category: InvoiceCategory;
  status: InvoiceStatus;
  hasResolution: boolean;
  resolutionId?: string;
  resolutionNumber?: string;
  resolutionTitle?: string;
  folderId?: string; // Folder for recurring or non-resolution invoices
  recurrence?: InvoiceRecurrence;
  bookkeepingStatus?: BookkeepingStatus; // 'bearbeitet' | 'nicht_bearbeitet' | 'nicht_notwendig'
  isBookkeepingRecorded?: boolean; // legacy compatibility
  bookkeepingRecordedAt?: string; // Zeitstempel der Erfassung
  bookkeepingRecordedBy?: string; // Wer hat es erfasst (z.B. Schatzmeister)
  submittedBy: {
    id: string;
    name: string;
    role: string;
  };
  fileUrl?: string; // Data URL or Image URL
  fileName?: string;
  fileSize?: string;
  fileType?: 'image' | 'pdf';
  notes?: string;
  createdAt: string;
  paidAt?: string;
  reviewedBy?: string;
}

export type ResolutionStatus = 'in_abstimmung' | 'angenommen' | 'abgelehnt' | 'entwurf';

export type ResolutionCategory = 
  | 'Finanzen & Budget'
  | 'Veranstaltungen & Projekte'
  | 'Marketing & PR'
  | 'Satzung & Verband'
  | 'Kooperationen & Sponsoring'
  | 'Mitglieder & Ehrungen'
  | 'Sonstiges';

export interface ResolutionAttachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'excel' | 'word' | 'image' | 'powerpoint' | 'other';
  mimeType?: string;
  dataUrl?: string; // base64 or blob URL
  uploadedAt: string;
}

export interface Resolution {
  id: string;
  number: string; // e.g. "VB-2025-004"
  title: string;
  description: string;
  motionText: string; // Antragswortlaut: "Der Vorstand beschließt..."
  category?: ResolutionCategory;
  applicant: {
    id: string;
    name: string;
    role: string;
  };
  requestedBudget?: number;
  deadline?: string;
  status: ResolutionStatus;
  requiredQuorum: number; // Minimal percentage or number of votes needed (default 50% / simple majority)
  eligibleVoterIds?: string[]; // Stimmberechtigte Vorstandsmitglieder (IDs). Wenn nicht angegeben, alle Mitglieder mit Stimmrecht.
  votes: Record<string, Vote>; // memberId -> Vote
  comments: Comment[];
  linkedInvoiceIds: string[];
  attachments?: ResolutionAttachment[];
  bookkeepingStatus?: BookkeepingStatus; // 'bearbeitet' | 'nicht_bearbeitet' | 'nicht_notwendig'
  bookkeepingNote?: string;
  /** Archiviert: aus der laufenden Liste ausgeblendet, aber vollstaendig erhalten. */
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  passedAt?: string;
}

export interface AgendaItem {
  id: string;
  topNumber: string;
  title: string;
  presenter: string;
  durationMin: number;
  resolutionId?: string;
  resolutionNumber?: string;
  notes?: string;
}

export interface MeetingAttendee {
  memberId: string;
  memberName: string;
  status: 'accepted' | 'declined' | 'tentative';
  updatedAt: string;
}

export type MeetingType =
  | 'Reguläre Vorstandssitzung'
  | 'Außerordentliche Sitzung'
  | 'Klausurtagung'
  | 'Jour Fixe';

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  teamsUrl: string;
  description: string;
  agenda: AgendaItem[];
  attendees: MeetingAttendee[];
  protocol?: string;
  isUpcoming: boolean;
  /** Gehört dieser Termin zu einer wiederkehrenden Serie? (MeetingSeries.id) */
  seriesId?: string;
  /** Hochgeladenes Sitzungsprotokoll (Datei) - unabhängig vom Altfeld `protocol`. */
  protocolFile?: MeetingAttachment;
  /** Hochgeladene Agenda-Datei - zusätzlich zur strukturierten `agenda`-TOP-Liste. */
  agendaFile?: MeetingAttachment;
  /** Sitzung abgesagt, ohne sie zu löschen (Protokoll/Agenda bleiben erhalten). */
  cancelled?: boolean;
}

export interface MeetingAttachment {
  id: string;
  name: string;
  size: string;
  mimeType?: string;
  dataUrl?: string;
  uploadedAt: string;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Wiederholungsregel für Termin-Serien (Outlook-artig). Je nach
 * `frequency` sind nur die passenden Zusatzfelder relevant - siehe
 * src/utils/recurrence.ts für die Auswertung.
 */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** "alle X Tage/Wochen/Monate/Jahre" */
  interval: number;
  /** Nur bei 'weekly': welche Wochentage (0=So..6=Sa). */
  weekdays?: number[];
  /** Nur bei 'monthly'/'yearly': fester Tag im Monat, oder Nter Wochentag. */
  monthlyMode?: 'dayOfMonth' | 'weekday';
  /** 1-31, bei monthlyMode='dayOfMonth'. */
  dayOfMonth?: number;
  /** 1.-4. Wochentag im Monat, oder -1 für den letzten. */
  weekdayOrdinal?: 1 | 2 | 3 | 4 | -1;
  /** 0=So..6=Sa, bei monthlyMode='weekday'. */
  weekday?: number;
  /** 1-12, nur bei 'yearly'. */
  month?: number;
  endMode: 'never' | 'onDate' | 'afterCount';
  endDate?: string;
  count?: number;
}

/**
 * Vorlage für eine wiederkehrende Termin-Serie. Beim Anlegen/Ändern
 * werden daraus konkrete `Meeting`-Datensätze generiert (`seriesId`
 * gesetzt) - jeder danach unabhängig editierbar, siehe useMeetings.ts.
 */
export interface MeetingSeries {
  id: string;
  title: string;
  type: MeetingType;
  startTime: string;
  endTime: string;
  location: string;
  teamsUrl: string;
  description: string;
  recurrence: RecurrenceRule;
  /** Anker-Datum der Serie (erster Termin), YYYY-MM-DD. */
  seriesStartDate: string;
  createdAt: string;
}

export type ActiveTab = 'dashboard' | 'resolutions' | 'invoices' | 'meetings' | 'subsidies' | 'email-center' | 'storage-guide';

export interface EmailNotificationLog {
  id: string;
  type: 'resolution_vote' | 'invoice_request' | 'resolution_result' | 'meeting_invite' | 'user_credentials' | 'admin_transferred';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  sentAt: string;
  status: 'gesendet' | 'zugestellt' | 'abgestimmt';
  relatedId?: string; // resolutionId or invoiceRequestId
  resolutionId?: string;
  relatedNumber?: string; // e.g. "VB-2025-004"
  actionTaken?: string; // e.g. "Ja-Stimme erfasst", "Rechnung eingereicht"
  details?: string;
}

export interface InvoiceRequest {
  id: string;
  recipientName: string;
  recipientEmail: string;
  projectTitle: string;
  expectedAmount?: number;
  deadline: string;
  notes?: string;
  resolutionId?: string;
  resolutionNumber?: string;
  requestedBy: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  status: 'offen' | 'erledigt';
}

export type NotificationType = 'resolution' | 'vote' | 'invoice' | 'meeting' | 'system' | 'subsidy';

export interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
  targetTab?: ActiveTab;
  targetId?: string;
  actionUrl?: string;
  iconType?: 'vote' | 'invoice' | 'meeting' | 'mail' | 'shield' | 'check' | 'bell';
}

/**
 * Revisionshistorie: kurze, lesbare Ereignisse ("Status auf 'Geprüft'
 * gesetzt", "Anna stimmte: Ja") statt vollständiger Feld-Diffs - je ein
 * Eintrag pro wichtiger Änderung an einem Beschluss/einer Rechnung/einem
 * Zuschuss. Wird sowohl direkt an der jeweiligen Ansicht angezeigt
 * (RevisionHistory.tsx) als auch gesammelt in den Einstellungen unter
 * "Historie" (dort speziell für Beschlüsse, Löschcode-gesperrt).
 */
export interface AuditLogEntry {
  id: string;
  entityType: 'resolution' | 'invoice' | 'subsidy';
  entityId: string;
  /** Bezeichnung des Datensatzes zum Zeitpunkt des Eintrags, fürs Anzeigen ohne Nachschlagen */
  entityLabel: string;
  action: string;
  actorName: string;
  actorId?: string;
  timestamp: string;
}

export interface NotificationSettings {
  pushNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  notifyOnNewResolution: boolean;
  notifyOnVoteSubmitted: boolean;
  notifyOnQuorumReached: boolean;
  notifyOnInvoiceRequest: boolean;
  notifyOnUpcomingMeeting: boolean;
  autoRemindHoursBeforeDeadline: number; // e.g. 24
}

export interface EmailServerConfig {
  provider: 'resend' | 'smtp' | 'browser_mailto';
  /** Nicht mehr im Browser gespeichert - der Schluessel liegt auf dem Server. */
  resendApiKey?: string;
  senderEmail: string;
  senderName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  isConfigured: boolean;
}

export interface AppVersionConfig {
  latestVersion: string;
  minRequiredVersion: string;
  forceUpdateEnabled: boolean;
  releaseNotes?: string;
  updatedAt: string;
  updatedBy?: string;
}



// ---------------------------------------------------------------------------
// Zuschüsse (Academy-, Trainings- und Konferenzzuschüsse)
// Grundlage: Zuschuss-Richtlinie 01.2026
// ---------------------------------------------------------------------------

export type SubsidyCategory = 'academy' | 'training' | 'konferenz' | 'sonstiges';

/** § 2 und § 3 der Richtlinie: Interessenten nur per Einzelfallbeschluss. */
export type SubsidyPersonType = 'mitglied' | 'foerdermitglied' | 'interessent';

export interface SubsidyPerson {
  id: string;
  name: string;
  type: SubsidyPersonType;
  email?: string;
  /** Bankverbindung für die Auszahlung */
  iban?: string;
  bic?: string;
  /** Nur nötig, wenn abweichend vom Namen */
  accountHolder?: string;
  isActive?: boolean;
  note?: string;
  createdAt: string;
}

/**
 * Ampel-Kette bis zur Auszahlung. "bestaetigt" (Anzeige: "Geprueft") heisst nur
 * "inhaltlich korrekt, Nachweise vollstaendig" - noch KEINE Zahlungsfreigabe.
 * Erst wenn ein daran gebundener Vorstandsbeschluss angenommen ist, wechselt
 * ein gebuendelter Zuschuss automatisch von "im_beschluss" auf
 * "zur_zahlung_freigegeben"; nur dieser Status darf ausgezahlt werden.
 */
export type SubsidyStatus =
  | 'beantragt'
  | 'bestaetigt'
  | 'im_beschluss'
  | 'zur_zahlung_freigegeben'
  | 'nicht_stattgefunden'
  | 'bezahlt'
  | 'abgelehnt';

/** Wie liegt der Teilnahme-/Zahlungsnachweis vor? */
export type SubsidyProofState = 'offen' | 'hochgeladen' | 'anderweitig';

export interface SubsidyProofFile {
  name: string;
  size: string;
  mimeType?: string;
  dataUrl?: string;
  uploadedAt: string;
}

export interface Subsidy {
  id: string;
  personId: string;
  /** Mitgeführt, damit Listen ohne Nachschlagen lesbar bleiben */
  personName: string;
  category: SubsidyCategory;
  /** Schlüssel aus dem Katalog der Richtlinie, falls zutreffend */
  eventKey?: string;
  eventName: string;
  eventDate?: string;
  /** Gewährter Zuschuss */
  amount: number;
  /** Tatsächlich gezahlte Kosten - § 9: der Zuschuss darf sie nicht übersteigen */
  actualCost?: number;
  status: SubsidyStatus;
  /** § 4 Abs. 5: Anträge werden in der Reihenfolge des Eingangs entschieden */
  appliedAt: string;
  approvedAt?: string;
  paidAt?: string;
  /** Vorstandsbeschluss, in den dieser Zuschuss gebündelt wurde (Zahlungsfreigabe). */
  resolutionId?: string;
  /** Wann in einen Beschluss gebündelt wurde. */
  bundledAt?: string;
  /** Wann der zugehörige Beschluss angenommen wurde (Zahlung damit freigegeben). */
  releasedAt?: string;
  /** Woher der Antrag kam - nur zur Anzeige, keine Logik hängt daran. */
  source?: 'public' | 'admin';
  /** Teilnahmenachweis (z. B. Teilnahmebestätigung, Zertifikat, Foto). */
  proofState: SubsidyProofState;
  /** Pflicht, wenn der Nachweis anderweitig abgelegt ist */
  proofNote?: string;
  proofFile?: SubsidyProofFile;
  /**
   * Kostennachweis (Rechnung) - § 9 der Richtlinie: der Zuschuss darf die
   * tatsächlichen Kosten nie übersteigen, daher unabhängig vom
   * Teilnahmenachweis verfolgt.
   */
  costProofState: SubsidyProofState;
  costProofNote?: string;
  costProofFile?: SubsidyProofFile;
  note?: string;
  /** Haushaltsjahr - das Budget verfällt zum 01.01. */
  year: number;
  createdAt: string;
}
