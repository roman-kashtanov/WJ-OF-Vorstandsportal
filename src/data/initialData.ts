import { BoardMember, Resolution, Invoice, Meeting, SecuritySettings, InvoiceFolder } from '../types';

export const INITIAL_SECURITY_SETTINGS: SecuritySettings = {
  // Nur der SHA-256-Hash wird gespeichert - der Code selbst steht nirgends
  // im Quelltext. Startwert ist "19540"; er sollte nach der Wahl in den
  // Einstellungen geaendert werden.
  passcodeHash: '5c95e1e82813589c32e9be4efebceea96dfdca7cbbadff08f4c4c233aaee8e4a',
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


