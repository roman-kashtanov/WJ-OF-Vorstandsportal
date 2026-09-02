import type { Config, Context } from '@netlify/functions';
import { handleApiRequest } from '../../api/router';

/**
 * Ein einziger Function-Endpunkt fuer alle /api/*-Aufrufe der App.
 * Netlify leitet /api/* hierher weiter (siehe netlify.toml).
 */
export default async (req: Request, _context: Context): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname;

  let payload: any = null;
  if (req.method === 'POST') {
    payload = await req.json().catch(() => ({}));
  }

  const result = await handleApiRequest(req.method, path, payload);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

export const config: Config = {
  path: '/api/*',
};
