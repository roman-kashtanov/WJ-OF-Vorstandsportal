import { sendEmail } from './email';
import { sendPush, getVapidPublicKey } from './push';

export interface ApiResponse {
  status: number;
  body: unknown;
}

/**
 * Gemeinsames Routing fuer den lokalen Dev-Server (server.ts) und die
 * Netlify-Function (netlify/functions/api.mts). So gibt es die Logik nur einmal.
 */
export async function handleApiRequest(
  method: string,
  path: string,
  payload: any
): Promise<ApiResponse> {
  const route = path.replace(/^\/?(\.netlify\/functions\/api)?\/?(api\/)?/, '').replace(/\/$/, '');

  if (method === 'GET' && route === 'health') {
    return { status: 200, body: { status: 'ok' } };
  }

  if (method === 'GET' && route === 'push/vapid-public-key') {
    const key = getVapidPublicKey();
    if (!key) {
      return { status: 500, body: { error: 'VAPID_PUBLIC_KEY ist nicht gesetzt.' } };
    }
    return { status: 200, body: { publicKey: key } };
  }

  if (method === 'POST' && route === 'push/send') {
    const result = await sendPush(payload?.subscriptions, payload?.payload);
    return { status: result.status, body: result.body };
  }

  if (method === 'POST' && route === 'email/send') {
    const result = await sendEmail(payload || {});
    return { status: result.status, body: result.body };
  }

  return { status: 404, body: { error: `Unbekannter Endpunkt: ${method} /${route}` } };
}
