/**
 * Platzhalter in "Belege anfragen"-Texten fuellen - gemeinsam genutzt von
 * der Vorschau im Portal und vom Server beim Versand (api/invoice.ts),
 * damit beide exakt dasselbe ergeben.
 *
 * {Name}     → Name des Empfaengers; ohne Namen faellt der Platzhalter samt
 *              Leerzeichen davor weg ("Hallo {Name}," → "Hallo,")
 * {Absender} → Name des angemeldeten Vorstandsmitglieds
 */
export const INVOICE_REQUEST_PLACEHOLDERS = ['{Name}', '{Absender}'];

export function fillInvoiceRequestText(text: string, values: { name?: string; sender?: string }): string {
  const name = (values.name || '').trim();
  const sender = (values.sender || '').trim();
  return String(text || '')
    .replace(/( ?)\{Name\}/g, (_match, space: string) => (name ? `${space}${name}` : ''))
    .replace(/\{Absender\}/g, sender || 'Der Vorstand');
}
