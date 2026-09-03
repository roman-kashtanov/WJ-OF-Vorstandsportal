import { jsPDF } from 'jspdf';
import { Resolution, ResolutionAttachment, Subsidy, SubsidyPerson } from '../types';
import { formatCurrency, formatDate } from './formatters';
import { formatIban } from './sepa';

/** Maskiert eine IBAN bis auf die letzten vier Stellen, fuer ein oeffentliches Dokument. */
function maskIban(iban?: string): string {
  if (!iban) return '–';
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (clean.length <= 4) return clean;
  return `${clean.slice(0, 4)} **** **** ${clean.slice(-4)}`;
}

/**
 * Erzeugt eine Nachweis-Zusammenfassung als PDF fuer einen bezahlten Zuschuss.
 *
 * Bewusst reiner Text: das eigentliche Nachweisfoto haengt bereits separat
 * als eigener Anhang am selben Beschluss (aus dem Buendeln) - ein zweites
 * Mal eingebettet wuerde nur unnoetig das Speicherbudget belasten.
 */
export function generateSubsidyReceiptPdf(
  subsidy: Subsidy,
  person: SubsidyPerson | undefined,
  resolution: Resolution
): ResolutionAttachment {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 20;
  let y = 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Nachweis-Zusammenfassung Zuschuss', marginX, y);
  y += 10;

  doc.setDrawColor(0, 53, 148);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, 190, y);
  y += 10;

  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(label, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, marginX + 55, y);
    y += 8;
  };

  row('Person', person?.name || subsidy.personName);
  row('Veranstaltung', subsidy.eventName);
  if (subsidy.eventDate) row('Datum der Veranstaltung', formatDate(subsidy.eventDate));
  row('Zuschuss', formatCurrency(subsidy.amount));
  if (subsidy.actualCost) row('Tatsächliche Kosten', formatCurrency(subsidy.actualCost));
  row('Bankverbindung', maskIban(person?.iban));
  row('Beantragt am', formatDate(subsidy.appliedAt));
  if (subsidy.bundledAt) row('Gebündelt am', formatDate(subsidy.bundledAt));
  if (subsidy.releasedAt) row('Zahlung freigegeben am', formatDate(subsidy.releasedAt));
  if (subsidy.paidAt) row('Ausgezahlt am', formatDate(subsidy.paidAt));
  row('Beschluss', `${resolution.number} – ${resolution.title}`);

  if (subsidy.note) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Kommentar', marginX, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(subsidy.note, 170);
    doc.text(lines, marginX, y);
    y += lines.length * 5.5;
  }

  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Automatisch erzeugt am ${formatDate(new Date().toISOString())} – Wirtschaftsjunioren Offenbach am Main e.V.`,
    marginX,
    285
  );

  const dataUrl = doc.output('datauristring');
  const sizeBytes = Math.round((dataUrl.length * 3) / 4);

  return {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: `Nachweis-${subsidy.eventName}-${person?.name || subsidy.personName}.pdf`.replace(
      /[/\\]/g,
      '-'
    ),
    size: sizeBytes > 1024 * 1024 ? `${(sizeBytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(sizeBytes / 1024)} KB`,
    type: 'pdf',
    mimeType: 'application/pdf',
    dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}
