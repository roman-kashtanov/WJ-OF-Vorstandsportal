import webPush from 'web-push';
import { getServerConfig } from './config';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface SendPushResult {
  status: number;
  body: {
    success?: boolean;
    sent?: number;
    failed?: number;
    /** Endpunkte, die der Push-Dienst als abgelaufen meldet (Geraet abgemeldet). */
    expiredEndpoints?: string[];
    error?: string;
  };
}

let vapidReady = false;

function ensureVapid(): string | null {
  const cfg = getServerConfig();
  if (!cfg.vapidPublicKey || !cfg.vapidPrivateKey) {
    return 'Keine VAPID-Schluessel hinterlegt. Bitte VAPID_PUBLIC_KEY und VAPID_PRIVATE_KEY als Umgebungsvariablen setzen.';
  }
  if (!vapidReady) {
    webPush.setVapidDetails(cfg.vapidSubject, cfg.vapidPublicKey, cfg.vapidPrivateKey);
    vapidReady = true;
  }
  return null;
}

/**
 * Verschickt eine Push-Nachricht an beliebig viele Geraete-Abos.
 * Abgelaufene Abos werden zurueckgemeldet, damit die App sie aufraeumen kann.
 */
export async function sendPush(
  subscriptions: any[],
  payload: PushPayload
): Promise<SendPushResult> {
  const configError = ensureVapid();
  if (configError) return { status: 500, body: { error: configError } };

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return { status: 200, body: { success: true, sent: 0, failed: 0, expiredEndpoints: [] } };
  }
  if (!payload || !payload.title) {
    return { status: 400, body: { error: 'Payload mit Titel wird benoetigt.' } };
  }

  const payloadString = JSON.stringify(payload);
  const expiredEndpoints: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(sub, payloadString, { TTL: 24 * 60 * 60 });
        sent++;
      } catch (err: any) {
        failed++;
        // 404/410 = Abo existiert nicht mehr (App deinstalliert, Berechtigung entzogen)
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          if (sub?.endpoint) expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  return { status: 200, body: { success: true, sent, failed, expiredEndpoints } };
}

export function getVapidPublicKey(): string {
  return getServerConfig().vapidPublicKey;
}
