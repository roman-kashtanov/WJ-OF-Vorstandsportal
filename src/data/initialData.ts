import { BoardMember, Resolution, Invoice, Meeting, SecuritySettings, InvoiceFolder } from '../types';

export const INITIAL_SECURITY_SETTINGS: SecuritySettings = {
  // Nur der SHA-256-Hash wird gespeichert - der Code selbst steht nirgends
  // im Quelltext. Startwert ist "11111"; unbedingt in den Einstellungen
  // aendern, sobald der erste echte Vorstand angelegt ist.
  passcodeHash: 'd17f25ecfbcc7857f7bebea469308be0b2580943e96d13a3ad98a13675c4bfc2',
  exemptMemberIds: [],
  exemptEmails: [],
  adminMemberId: '',
  adminEmail: '',
  lastUpdated: '2025-01-01T00:00:00Z',
};

// Bewusst leer: Der Vorstand wird vom Administrator in der App gepflegt.
// Die erste Google-Anmeldung legt automatisch das Admin-Konto an.
export const INITIAL_BOARD_MEMBERS: BoardMember[] = [];

export const INITIAL_RESOLUTIONS: Resolution[] = [];

// Ordner fuer wiederkehrende Rechnungen legt der Vorstand selbst an.
export const INITIAL_INVOICE_FOLDERS: InvoiceFolder[] = [];

export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_MEETINGS: Meeting[] = [];


