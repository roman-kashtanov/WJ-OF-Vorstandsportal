/**
 * Serverseitige Konfiguration.
 * Alle Werte kommen aus Umgebungsvariablen (Netlify -> Environment variables
 * bzw. lokal aus einer .env-Datei). Nichts davon landet im Browser.
 */
export function getServerConfig() {
  const e = process.env;
  return {
    resendApiKey: e.RESEND_API_KEY || '',
    // Absender. Solange keine eigene Domain bei Resend verifiziert ist,
    // funktioniert nur "onboarding@resend.dev".
    resendFrom: e.RESEND_FROM || 'WJ Offenbach Vorstand <onboarding@resend.dev>',
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
