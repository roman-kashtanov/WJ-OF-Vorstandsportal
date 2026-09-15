import { BookkeepingStatus, Invoice } from '../types';

/**
 * Belege kennen zwei Bereiche (v3.27.0):
 * - Offen: eingereicht, noch keinem Beschluss zugeordnet und in der
 *   Buchhaltung noch nicht bearbeitet.
 * - Archiv: einem Beschluss zugeordnet ODER in der Buchhaltung erledigt
 *   ("bearbeitet" oder "nicht notwendig") - analog zu den Beschluessen.
 */

export type InvoiceSectionKey = 'offen' | 'archiv';

/** Buchhaltungsstand eines Belegs - aeltere Belege kennen nur das Haekchen. */
export const bookkeepingOf = (inv: Invoice): BookkeepingStatus =>
  inv.bookkeepingStatus || (inv.isBookkeepingRecorded ? 'bearbeitet' : 'nicht_bearbeitet');

export const hasInvoiceResolution = (inv: Invoice) => inv.hasResolution || !!inv.resolutionId;

export const invoiceSectionOf = (inv: Invoice): InvoiceSectionKey =>
  hasInvoiceResolution(inv) || bookkeepingOf(inv) !== 'nicht_bearbeitet' ? 'archiv' : 'offen';

export const countOpenInvoices = (invoices: Invoice[]) =>
  invoices.filter((inv) => invoiceSectionOf(inv) === 'offen').length;
