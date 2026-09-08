/**
 * Serverseitige Konfiguration.
 * Alle Werte kommen aus Umgebungsvariablen (Netlify -> Environment variables
 * bzw. lokal aus einer .env-Datei). Nichts davon landet im Browser.
 */
export function getServerConfig() {
  const e = process.env;

  /**
   * Welcher Versandweg genutzt wird: 'smtp', 'resend' oder leer (automatisch).
   *
   * Automatisch heisst: ein vollstaendig eingerichteter Resend-Zugang hat
   * Vorrang vor SMTP. Grund ist die Zustellbarkeit gegenueber dem grossen
   * Empfaengerkreis (Zuschuss-/Auslagenantraege kommen aus der ganzen
   * Mitgliedschaft): ueber Resend wird mit einer eigenen, per DKIM
   * signierten Absenderdomain verschickt. Ein Gmail-Postfach kann nicht fuer
   * den Verein signiert werden, und anders als beim fuenfkoepfigen Vorstand
   * laesst sich bei rund 100 Mitgliedern nicht jedes Postfach einmalig per
   * "Kein Spam" anlernen.
   */
  const mailProvider = (e.MAIL_PROVIDER || '').toLowerCase();

  const smtpUser = e.SMTP_USER || '';
  const smtpPassword = e.SMTP_PASSWORD || '';

  return {
    // --- E-Mail ueber SMTP (z.B. das Gmail-Konto des Vereins) --------------
    // Bevorzugter Weg: Es wird keine eigene Domain benoetigt, der Absender
    // ist schlicht das vorhandene Postfach.
    smtpHost: e.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: Number(e.SMTP_PORT) || 465,
    smtpUser,
    smtpPassword,
    /**
     * Gmail laesst nur den angemeldeten Account (oder eine dort bestaetigte
     * Alias-Adresse) als Absender zu - ein abweichender Wert wuerde ohnehin
     * ueberschrieben. Deshalb ist der SMTP-Benutzer die Vorgabe.
     */
    smtpFrom: e.MAIL_FROM || (smtpUser ? `WJ Offenbach Vorstand <${smtpUser}>` : ''),
    isSmtpConfigured: !!(smtpUser && smtpPassword),
    /**
     * Antwortadresse und Abmelde-Kontakt. Beides sind Signale, an denen
     * Spamfilter echte Absender von Massenmail unterscheiden: eine Mail
     * ohne funktionierende Antwortmoeglichkeit wirkt automatisiert.
     * Standard ist das versendende Postfach selbst.
     */
    mailReplyTo: e.MAIL_REPLY_TO || smtpUser || '',
    mailProvider,

    // --- E-Mail ueber Resend (Alternative, benoetigt verifizierte Domain) --
    // Bewusst OHNE Standard-Absender: frueher stand hier
    // "onboarding@resend.dev". Mit dieser Test-Adresse nimmt Resend nur
    // Mails an das eigene Postfach an und meldet sonst einen langen
    // englischen Fehler - genau das war fuer den Vorstand sichtbar, obwohl
    // Resend gar nicht eingerichtet war. Ohne verifizierte Absenderadresse
    // wird der Weg deshalb gar nicht erst versucht (siehe email.ts).
    resendApiKey: e.RESEND_API_KEY || '',
    resendFrom: e.RESEND_FROM || '',

    // --- Push-Benachrichtigungen ------------------------------------------
    vapidPublicKey: e.VAPID_PUBLIC_KEY || e.VITE_VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: e.VAPID_PRIVATE_KEY || '',
    vapidSubject: e.VAPID_SUBJECT || 'mailto:vorstand@wj-offenbach.de',
  };
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
