import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { SepaDebtor, SepaPayment, formatIban } from './sepa';
import { buildGiroCodePayload } from './giroCode';
import { formatCurrency } from './formatters';

/**
 * Eine Seite pro Überweisung mit GiroCode (EPC-QR-Code) - zum Abfotografieren
 * mit der Banking-App ("Überweisung per Foto/QR-Scan"), für Geräte/Apps, die
 * keinen SEPA-XML-Import können. Bewusst EINE Datei mit mehreren Seiten statt
 * mehrerer Einzeldateien - vermeidet Popup-Blocker bei mehreren gleichzeitigen
 * Downloads und lässt sich trotzdem Seite für Seite einzeln scannen.
 */
export async function generateGiroCodePaymentsPdf(
  debtor: SepaDebtor,
  payments: SepaPayment[],
  /** Was ueberwiesen wird, z.B. "Zuschuesse" oder "Auslagen" - steht im Dateinamen. */
  label = 'Zahlungen'
): Promise<{ blob: Blob; fileName: string }> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 20;

  for (let i = 0; i < payments.length; i += 1) {
    const p = payments[i];
    if (i > 0) doc.addPage();

    let y = 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Überweisung per QR-Code (GiroCode)', marginX, y);
    y += 8;

    doc.setDrawColor(0, 53, 148);
    doc.setLineWidth(0.5);
    doc.line(marginX, y, 190, y);
    y += 10;

    const qrDataUrl = await QRCode.toDataURL(buildGiroCodePayload(debtor, p), {
      margin: 1,
      width: 500,
    });
    doc.addImage(qrDataUrl, 'PNG', marginX, y, 70, 70);

    let textY = y + 6;
    const textX = marginX + 80;
    const row = (label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(label, textX, textY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(value, textX, textY + 5);
      textY += 13;
    };

    row('Empfänger', p.name);
    row('IBAN', formatIban(p.iban));
    row('Betrag', formatCurrency(p.amount));
    row('Verwendungszweck', p.reference);

    y += 78;
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    const hint = doc.splitTextToSize(
      'Diesen QR-Code in der Banking-App scannen (meist unter "Überweisung per Foto/QR-Code") - IBAN, Betrag und Verwendungszweck werden automatisch übernommen. Vor dem Absenden bitte trotzdem kurz prüfen.',
      170
    );
    doc.text(hint, marginX, y);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Auftraggeber: ${debtor.name} · ${formatIban(debtor.iban)}`,
      marginX,
      285
    );
  }

  // Wie bei der SEPA-Datei: Zweck, Anzahl und Gesamtsumme im Dateinamen.
  const sum = payments.reduce((acc, p) => acc + p.amount, 0);
  const fileName = `WJOF_${label}_QR_${new Date().toISOString().slice(0, 10)}_${
    payments.length
  }-Ueberweisungen_${sum.toFixed(2).replace('.', '-')}-EUR.pdf`;
  const blob = doc.output('blob');
  return { blob, fileName };
}
