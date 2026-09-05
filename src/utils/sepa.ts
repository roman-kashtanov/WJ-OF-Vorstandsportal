/**
 * SEPA-Sammelüberweisung als XML (pain.001.001.03).
 *
 * Dieses Format lesen die Online-Banking-Portale von Sparkasse und
 * Volksbank/VR-Bank ein ("SEPA-Datei einreichen" bzw. "Datei-Upload").
 * Aus einer Datei werden dort alle enthaltenen Überweisungen erzeugt; die
 * Freigabe erfolgt wie gewohnt mit TAN.
 */

export interface SepaPayment {
  /** Empfänger (Kontoinhaber) */
  name: string;
  iban: string;
  bic?: string;
  amount: number;
  /** Verwendungszweck */
  reference: string;
  /** Eindeutige Kennung der einzelnen Überweisung */
  endToEndId: string;
}

export interface SepaDebtor {
  /** Verein als Auftraggeber */
  name: string;
  iban: string;
  bic?: string;
}

/** Prüft eine IBAN über die Prüfsumme nach ISO 13616 (Modulo 97). */
export function isValidIban(input: string): boolean {
  const iban = (input || '').replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;

  // Die ersten vier Zeichen ans Ende, Buchstaben zu Zahlen (A=10 … Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

  // Stückweise rechnen, weil die Zahl für einen Number-Wert zu groß wird
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

export function formatIban(input: string): string {
  const iban = (input || '').replace(/\s+/g, '').toUpperCase();
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Entfernt Zeichen, die im SEPA-Zeichensatz nicht zulässig sind.
 * Umlaute werden umschrieben, statt sie zu verlieren.
 */
export function sanitizeSepaText(input: string): string {
  return (input || '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9/\-?:().,'+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Betrag mit genau zwei Nachkommastellen, ohne Tausendertrennung. */
const money = (n: number) => n.toFixed(2);

export interface SepaResult {
  xml: string;
  fileName: string;
  count: number;
  sum: number;
}

/**
 * Erzeugt die XML-Datei für eine Sammelüberweisung.
 *
 * @param executionDate Ausführungstag (JJJJ-MM-TT). Banken weisen ein Datum in
 *        der Vergangenheit ab; ohne Angabe wird der morgige Tag verwendet.
 */
/**
 * Schema pain.001.001.09 (nicht .03) - so exportiert es auch das
 * Online-Banking-Portal der Sparkasse Offenbach selbst (Nutzer hat ein
 * Beispiel bereitgestellt). Wichtigste Unterschiede zur alten .03-Version
 * hier im Code: das BIC-Element heisst <BICFI> statt <BIC>, und
 * <ReqdExctnDt> braucht ein verschachteltes <Dt>-Element statt das Datum
 * direkt als Text zu tragen - ohne diese zwei Aenderungen lehnte die
 * Banking-App die Datei beim Einspielen ab.
 */
export function buildSepaCreditTransfer(
  debtor: SepaDebtor,
  payments: SepaPayment[],
  executionDate?: string
): SepaResult {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const msgId = `WJOF${stamp}`;

  const exec =
    executionDate ||
    new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const sum = payments.reduce((acc, p) => acc + p.amount, 0);

  const transactions = payments
    .map((p) => {
      const cdtrAgt = p.bic
        ? `\n          <CdtrAgt><FinInstnId><BICFI>${escapeXml(p.bic.toUpperCase())}</BICFI></FinInstnId></CdtrAgt>`
        : '';
      return `        <CdtTrfTxInf>
          <PmtId><EndToEndId>${escapeXml(sanitizeSepaText(p.endToEndId).slice(0, 35))}</EndToEndId></PmtId>
          <Amt><InstdAmt Ccy="EUR">${money(p.amount)}</InstdAmt></Amt>${cdtrAgt}
          <Cdtr><Nm>${escapeXml(sanitizeSepaText(p.name).slice(0, 70))}</Nm></Cdtr>
          <CdtrAcct><Id><IBAN>${escapeXml(p.iban.replace(/\s+/g, '').toUpperCase())}</IBAN></Id></CdtrAcct>
          <RmtInf><Ustrd>${escapeXml(sanitizeSepaText(p.reference).slice(0, 140))}</Ustrd></RmtInf>
        </CdtTrfTxInf>`;
    })
    .join('\n');

  // Anders als beim Kreditor (CdtrAgt, seit 2016 optional) ist DbtrAgt im
  // Schema pflicht (minOccurs=1) - ohne dieses Element gilt die Datei als
  // ungueltig. Deshalb hier IMMER ein Element schreiben, notfalls mit dem
  // Standard-Platzhalter NOTPROVIDED statt es ganz wegzulassen.
  const dbtrAgt = debtor.bic
    ? `<DbtrAgt><FinInstnId><BICFI>${escapeXml(debtor.bic.toUpperCase())}</BICFI></FinInstnId></DbtrAgt>`
    : `<DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09 pain.001.001.09.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${now.toISOString().slice(0, 19)}</CreDtTm>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${money(sum)}</CtrlSum>
      <InitgPty><Nm>${escapeXml(sanitizeSepaText(debtor.name).slice(0, 70))}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}-1</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>${payments.length}</NbOfTxs>
      <CtrlSum>${money(sum)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt><Dt>${exec}</Dt></ReqdExctnDt>
      <Dbtr><Nm>${escapeXml(sanitizeSepaText(debtor.name).slice(0, 70))}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${escapeXml(debtor.iban.replace(/\s+/g, '').toUpperCase())}</IBAN></Id></DbtrAcct>
      ${dbtrAgt}
      <ChrgBr>SLEV</ChrgBr>
${transactions}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

  return {
    xml,
    fileName: `WJOF_Zuschuesse_${exec}_${payments.length}_Ueberweisungen.xml`,
    count: payments.length,
    sum,
  };
}

/** Bietet die erzeugte Datei zum Herunterladen an. */
export function downloadSepaFile(result: SepaResult): void {
  const blob = new Blob([result.xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
