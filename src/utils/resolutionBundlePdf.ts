import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { Resolution, Invoice, Subsidy, SubsidyPerson } from '../types';
import { formatCurrency, formatDate, calculateVoteStats } from './formatters';
import { STATUS_LABEL as SUBSIDY_STATUS_LABEL } from './subsidies';
import { formatIban } from './sepa';

const VOTE_LABEL: Record<string, string> = { yes: 'Ja', no: 'Nein', abstain: 'Enthaltung' };

/**
 * Baut die Übersichtsseite(n) - Antrag, Abstimmung, verknüpfte Rechnungen und
 * die volle Zuschuss-Historie - als eigenes kleines PDF (jsPDF, reiner Text/
 * Tabellen-Satz). Wird anschließend mit den Original-Belegen zu einer Datei
 * zusammengeführt (siehe generateResolutionBundlePdf).
 */
function buildOverviewPdf(
  resolution: Resolution,
  totalMembersCount: number,
  invoices: Invoice[],
  subsidies: Subsidy[],
  personById: Record<string, SubsidyPerson | undefined>
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 18;
  const pageBottom = 280;
  let y = 20;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageBottom) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Beschluss ${resolution.number}`, marginX, y);
  y += 8;
  doc.setFontSize(12);
  const titleLines = doc.splitTextToSize(resolution.title, 174);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 6 + 2;

  doc.setDrawColor(0, 53, 148);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, 192, y);
  y += 8;

  const row = (label: string, value: string) => {
    ensureSpace(7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(label, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value, 120);
    doc.text(lines, marginX + 55, y);
    y += Math.max(6, lines.length * 5);
  };

  row('Kategorie', resolution.category || '–');
  row('Antragsteller', `${resolution.applicant.name} (${resolution.applicant.role || '–'})`);
  row('Erstellt am', formatDate(resolution.createdAt));
  row('Status', resolution.status === 'angenommen' ? 'Angenommen' : resolution.status === 'abgelehnt' ? 'Abgelehnt' : resolution.status);
  if (resolution.passedAt) row('Entschieden am', formatDate(resolution.passedAt));
  if (resolution.requestedBudget) row('Beantragtes Budget', formatCurrency(resolution.requestedBudget));

  y += 3;
  ensureSpace(10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Antragswortlaut', marginX, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const motionLines = doc.splitTextToSize(resolution.motionText || '–', 174);
  ensureSpace(motionLines.length * 4.5);
  doc.text(motionLines, marginX, y);
  y += motionLines.length * 4.5 + 6;

  const stats = calculateVoteStats(resolution, totalMembersCount);
  ensureSpace(8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Abstimmung', marginX, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `${stats.yesCount} Ja · ${stats.noCount} Nein · ${stats.abstainCount} Enthaltung · Quorum ${stats.isQuorumReached ? 'erreicht' : 'nicht erreicht'} (${stats.eligibleCount} stimmberechtigt)`,
    marginX,
    y
  );
  y += 6;
  Object.values(resolution.votes).forEach((v) => {
    ensureSpace(5);
    doc.text(`  ${v.memberName}: ${VOTE_LABEL[v.vote] || v.vote}`, marginX, y);
    y += 4.5;
  });
  y += 4;

  if (invoices.length > 0) {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Zugeordnete Rechnungen (${invoices.length})`, marginX, y);
    y += 7;
    invoices.forEach((inv) => {
      ensureSpace(6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${inv.vendor} – ${formatCurrency(inv.amount)}`, marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${inv.invoiceNumber} · ${formatDate(inv.date)}`, marginX + 100, y);
      y += 5.5;
    });
    y += 3;
  }

  if (subsidies.length > 0) {
    ensureSpace(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Zugeordnete Zuschüsse (${subsidies.length})`, marginX, y);
    y += 7;

    subsidies.forEach((s) => {
      const person = personById[s.personId];
      ensureSpace(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text(`${person?.name || s.personName} – ${s.eventName}`, marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(s.amount), 170, y, { align: 'right' });
      y += 5;

      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      const details: string[] = [
        `Stand: ${SUBSIDY_STATUS_LABEL[s.status]}`,
        `Beantragt: ${formatDate(s.appliedAt)}`,
      ];
      if (s.bundledAt) details.push(`Gebündelt: ${formatDate(s.bundledAt)}`);
      if (s.releasedAt) details.push(`Freigegeben: ${formatDate(s.releasedAt)}`);
      if (s.paidAt) details.push(`Ausgezahlt: ${formatDate(s.paidAt)}`);
      doc.text(details.join('  ·  '), marginX, y);
      y += 4;

      doc.text(
        `Teilnahmenachweis: ${s.proofState === 'offen' ? 'offen' : s.proofState === 'hochgeladen' ? 'hochgeladen' : 'anderweitig hinterlegt'}  ·  Kostennachweis: ${
          s.costProofState === 'offen' ? 'offen' : s.costProofState === 'hochgeladen' ? 'hochgeladen' : 'anderweitig hinterlegt'
        }`,
        marginX,
        y
      );
      y += 4;
      if (person?.iban) {
        doc.text(`Bankverbindung: ${formatIban(person.iban)}`, marginX, y);
        y += 4;
      }
      if (s.note) {
        const noteLines = doc.splitTextToSize(`Kommentar: ${s.note}`, 174);
        ensureSpace(noteLines.length * 4);
        doc.text(noteLines, marginX, y);
        y += noteLines.length * 4;
      }
      doc.setTextColor(0, 0, 0);
      y += 3;
    });
  }

  doc.setFontSize(7.5);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Erzeugt am ${formatDate(new Date().toISOString())} – Wirtschaftsjunioren Offenbach am Main e.V.`,
    marginX,
    292
  );

  return doc;
}

/** Bettet ein einzelnes Anhang-Datenobjekt (PDF oder Bild) als Seite(n) in das Ziel-PDF ein. */
async function embedAttachment(
  merged: PDFDocument,
  dataUrl: string | undefined,
  mimeType: string | undefined,
  label: string
): Promise<void> {
  if (!dataUrl) return;
  try {
    const bytes = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
    const isPdf = (mimeType || '').includes('pdf') || dataUrl.startsWith('data:application/pdf');

    if (isPdf) {
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
      return;
    }

    const isPng = (mimeType || '').includes('png') || dataUrl.startsWith('data:image/png');
    const image = isPng ? await merged.embedPng(bytes) : await merged.embedJpg(bytes);
    const page = merged.addPage([595.28, 841.89]);
    const { width: pw, height: ph } = page.getSize();
    const margin = 40;
    const maxW = pw - margin * 2;
    const maxH = ph - margin * 2;
    const scale = Math.min(maxW / image.width, maxH / image.height, 1);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  } catch {
    // Format nicht einbettbar (z.B. HEIC) - Seite mit Hinweis statt Abbruch,
    // der Beleg bleibt weiterhin einzeln im Portal abrufbar.
    const page = merged.addPage([595.28, 841.89]);
    page.drawText(`Anhang "${label}" konnte nicht eingebettet werden (Dateiformat).`, {
      x: 40,
      y: 800,
      size: 11,
    });
  }
}

export interface ResolutionBundleInput {
  resolution: Resolution;
  totalMembersCount: number;
  linkedInvoices: Invoice[];
  linkedSubsidies: Subsidy[];
  subsidyPeople: SubsidyPerson[];
}

/**
 * Fasst einen Beschluss für die Buchhaltung zu EINER Datei zusammen: Antrag +
 * Abstimmung + Zuschuss-Historie als Text/Tabelle, plus alle Original-Belege
 * (Rechnungen, Nachweisfotos, bereits am Beschluss hängende Anhänge) als
 * eingebettete Seiten - ein einziger Beleg zum Ablegen statt vieler Einzeldateien.
 */
export async function generateResolutionBundlePdf(
  input: ResolutionBundleInput
): Promise<{ blob: Blob; fileName: string }> {
  const { resolution, totalMembersCount, linkedInvoices, linkedSubsidies, subsidyPeople } = input;
  const personById = Object.fromEntries(subsidyPeople.map((p) => [p.id, p]));

  const overview = buildOverviewPdf(resolution, totalMembersCount, linkedInvoices, linkedSubsidies, personById);
  const merged = await PDFDocument.load(overview.output('arraybuffer'));

  for (const inv of linkedInvoices) {
    await embedAttachment(merged, inv.fileUrl, inv.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg', inv.invoiceNumber || inv.vendor);
  }

  for (const s of linkedSubsidies) {
    if (s.proofFile) await embedAttachment(merged, s.proofFile.dataUrl, s.proofFile.mimeType, `${s.eventName} – Teilnahmenachweis`);
    if (s.costProofFile) await embedAttachment(merged, s.costProofFile.dataUrl, s.costProofFile.mimeType, `${s.eventName} – Kostennachweis`);
  }

  for (const att of resolution.attachments || []) {
    await embedAttachment(merged, att.dataUrl, att.mimeType, att.name);
  }

  const bytes = await merged.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const safeTopic = (resolution.title || resolution.number).replace(/[/\\:*?"<>|]/g, '-').slice(0, 80);
  const fileName = `Beschluss ${resolution.number} - ${safeTopic} inkl. Rechnung.pdf`;
  return { blob, fileName };
}
