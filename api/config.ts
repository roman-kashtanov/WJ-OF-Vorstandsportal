/**
 * Serverseitige Konfiguration.
 * Alle Werte kommen aus Umgebungsvariablen (Netlify -> Environment variables
 * bzw. lokal aus einer .env-Datei). Nichts davon landet im Browser.
 */
export function getServerConfig() {
  const e = process.env;

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

    // --- E-Mail ueber Resend (Alternative, benoetigt verifizierte Domain) --
    resendApiKey: e.RESEND_API_KEY || '',
    resendFrom: e.RESEND_FROM || 'WJ Offenbach Vorstand <onboarding@resend.dev>',

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
