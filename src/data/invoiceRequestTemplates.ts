/**
 * Vorlagen fuer "Belege anfragen" (Belege → Belege anfragen). Geteilt ueber
 * das Firestore-Dokument `settings/invoiceRequestTemplates`, gleiches Muster
 * wie `settings/roleCatalogue`. Platzhalter siehe utils/invoiceRequestText.ts.
 * Der Link zum Hochladen steht nicht im Text - der Server setzt ihn als
 * Knopf unter die Nachricht.
 */
export interface InvoiceRequestTemplate {
  id: string;
  name: string;
  subject: string;
  message: string;
}

export interface InvoiceRequestTemplateSettings {
  templates: InvoiceRequestTemplate[];
}

const SIGNATURE = 'Viele Grüße\n{Absender}\nWirtschaftsjunioren Offenbach am Main e. V.';

export const DEFAULT_INVOICE_REQUEST_TEMPLATES: InvoiceRequestTemplateSettings = {
  templates: [
    {
      id: 'fehlender_beleg',
      name: 'Fehlender Beleg',
      subject: 'Bitte Beleg einreichen',
      message:
        'Hallo {Name},\n\n' +
        'für unsere Buchhaltung fehlt uns noch folgender Beleg:\n\n' +
        '- \n\n' +
        'Du kannst ihn ganz einfach über den Knopf unten hochladen – ein Foto oder PDF genügt, eine Anmeldung ist nicht nötig.\n\n' +
        `Vielen Dank!\n\n${SIGNATURE}`,
    },
    {
      id: 'veranstaltung',
      name: 'Rechnung zu einer Veranstaltung',
      subject: 'Rechnung zu unserer Veranstaltung',
      message:
        'Hallo {Name},\n\n' +
        'vielen Dank für die Unterstützung bei unserer Veranstaltung. Für die Abrechnung benötigen wir noch die Rechnung:\n\n' +
        'Veranstaltung: \nDatum: \n\n' +
        'Bitte lade die Rechnung über den Knopf unten hoch.\n\n' +
        SIGNATURE,
    },
    {
      id: 'vereinskonto',
      name: 'Beleg zu einer Zahlung vom Vereinskonto',
      subject: 'Beleg zu einer Zahlung vom Vereinskonto',
      message:
        'Hallo {Name},\n\n' +
        'zu folgender Zahlung vom Vereinskonto liegt uns noch kein Beleg vor:\n\n' +
        'Datum: \nBetrag: \nEmpfänger: \n\n' +
        'Bitte lade die Rechnung oder den Kassenbon über den Knopf unten hoch.\n\n' +
        SIGNATURE,
    },
  ],
};
