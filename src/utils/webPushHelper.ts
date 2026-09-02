import { FirebaseSync } from './firebaseSync';

export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Schickt eine echte Push-Nachricht an registrierte Geraete. Laeuft ueber die
 * Netlify-Function - dadurch erreicht die Nachricht das Smartphone auch dann,
 * wenn die App dort geschlossen ist.
 *
 * `onlyMemberIds` grenzt die Empfaenger ein: Bei einem Beschluss werden so nur
 * die Stimmberechtigten benachrichtigt, nicht der gesamte Vorstand.
 * Ohne Angabe gehen die Mitteilungen an alle (z.B. Belege, Sitzungen).
 */
export const notifyAllDevices = async (
  payload: { title: string; body: string; url?: string; tag?: string },
  excludeMemberId?: string,
  onlyMemberIds?: string[]
): Promise<{ sent: number; failed: number }> => {
  try {
    const all = await FirebaseSync.fetchPushSubscriptions();
    const targets = all.filter((s) => {
      if (excludeMemberId && s.memberId === excludeMemberId) return false;
      if (onlyMemberIds && onlyMemberIds.length > 0 && !onlyMemberIds.includes(s.memberId)) {
        return false;
      }
      return true;
    });
    if (targets.length === 0) return { sent: 0, failed: 0 };

    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptions: targets.map((t) => t.subscription),
        payload,
      }),
    });

    if (!res.ok) {
      console.warn('Push-Versand fehlgeschlagen:', res.status, await res.text().catch(() => ''));
      return { sent: 0, failed: targets.length };
    }

    const data = await res.json();
    if (data?.expiredEndpoints?.length) {
      await FirebaseSync.removeExpiredPushSubscriptions(data.expiredEndpoints);
    }
    return { sent: data?.sent ?? 0, failed: data?.failed ?? 0 };
  } catch (err) {
    console.warn('Push-Versand nicht moeglich:', err);
    return { sent: 0, failed: 0 };
  }
};

/** Kompatibilitaets-Wrapper fuer bestehende Aufrufe. */
export const sendPushNotification = async (
  subscriptions: any[],
  payload: { title: string; body: string; url?: string }
) => {
  if (!subscriptions || subscriptions.length === 0) return;
  await fetch('/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptions, payload }),
  }).catch(() => {});
};
