import type { Config } from '@netlify/functions';
import { runSubsidyReminders } from '../../api/reminders';

/**
 * Taeglich laufende Funktion: erinnert Antragsteller an fehlende
 * Zuschuss-Unterlagen (api/reminders.ts).
 *
 * Netlify plant Aufgaben in UTC. Damit trotz Sommer- und Winterzeit genau
 * ein Lauf auf 20 Uhr deutscher Zeit faellt, laeuft sie um 18 und 19 Uhr UTC;
 * `runSubsidyReminders` verschickt nur beim Lauf um 20 Uhr Ortszeit etwas.
 */
export default async (): Promise<Response> => {
  const appUrl =
    process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://app.vorstandsportal.cloud';
  const result = await runSubsidyReminders(appUrl);
  // Im Netlify-Protokoll nachvollziehbar, was der Lauf getan hat
  console.log('Zuschuss-Erinnerungen:', JSON.stringify(result.body));
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

export const config: Config = {
  schedule: '0 18,19 * * *',
};
