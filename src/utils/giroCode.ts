import { SepaDebtor, SepaPayment } from './sepa';

/**
 * GiroCode / EPC-QR-Code (EPC069-12): der in Deutschland/Österreich
 * verbreitete Standard fürs "Überweisung per Foto/QR-Scan" in Banking-Apps
 * (u.a. alle Sparkassen-Apps) - genau dafür gedacht, wenn eine Banking-App
 * (typischerweise die mobile App, im Gegensatz zum Online-Banking im
 * Browser) keinen SEPA-XML-Datei-Import unterstützt.
 *
 * Feste Zeilenreihenfolge, jede Zeile ein Feld - siehe EPC-Spezifikation.
 * Optionale Felder bleiben leer, dürfen aber nur am Ende der Nachricht
 * ganz wegfallen (nicht mittendrin), deshalb hier über einen Array-Aufbau
 * mit anschließendem Abschneiden trailing-leerer Zeilen gelöst.
 */
export function buildGiroCodePayload(debtor: SepaDebtor, payment: SepaPayment): string {
  const lines = [
    'BCD',
    '002',
    '1',
    'SCT',
    (payment.bic || '').toUpperCase(),
    payment.name.slice(0, 70),
    payment.iban.replace(/\s+/g, '').toUpperCase(),
    `EUR${payment.amount.toFixed(2)}`,
    '',
    '',
    payment.reference.slice(0, 140),
  ];
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}
