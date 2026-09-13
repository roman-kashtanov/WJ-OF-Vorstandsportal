import 'dotenv/config';
import { config as loadEnvFile } from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { handleApiRequest } from './api/router';

/**
 * Lokaler Entwicklungs-Server.
 * Im Betrieb auf Netlify wird dieser Server NICHT verwendet - dort laeuft
 * dieselbe Logik als Netlify Function (netlify/functions/api.mts).
 */
const PORT = Number(process.env.PORT) || 3007;

// Nur auf diesem Rechner: Zugangsdaten des Entwickler-Kontos (nicht in Git,
// siehe .gitignore). Vite liest nur VITE_-Variablen fuer den Browser - diese
// hier bleiben bewusst ausserhalb jedes Bundles.
loadEnvFile({ path: '.env.local' });

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  /**
   * Entwickler-Login (Knopf im Anmeldefenster, nur bei `npm run dev`).
   * Gibt die Zugangsdaten des Test-Kontos aus .env.local heraus - aber nur an
   * Aufrufe von diesem Rechner und nur, wenn die Seite ueber localhost
   * geoeffnet ist (schuetzt vor Zugriffen aus dem WLAN und vor fremden
   * Webseiten, die sich als localhost ausgeben). Die Netlify-Function kennt
   * diese Route nicht - im veroeffentlichten Portal gibt es sie nicht.
   */
  app.get('/api/dev/login', (req, res) => {
    const ip = req.socket.remoteAddress || '';
    const fromThisMac = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    const viaLocalhost = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    if (process.env.NODE_ENV === 'production' || !fromThisMac || !viaLocalhost) {
      res.status(403).json({ error: 'Der Entwickler-Login ist nur lokal auf diesem Rechner verfügbar.' });
      return;
    }
    const email = process.env.DEV_LOGIN_EMAIL;
    const password = process.env.DEV_LOGIN_PASSWORD;
    if (!email || !password) {
      res.status(404).json({
        error: 'Der Entwickler-Zugang ist auf diesem Rechner nicht eingerichtet (DEV_LOGIN_EMAIL / DEV_LOGIN_PASSWORD in .env.local).',
      });
      return;
    }
    res.json({ email, password });
  });

  app.all(/^\/api\/.*/, async (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const query = new URLSearchParams(req.query as Record<string, string>);
    const result = await handleApiRequest(req.method, req.path, req.body, query, origin);

    if (result.html) {
      res.status(result.status).type('html').send(result.html);
      return;
    }
    res.status(result.status).json(result.body);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WJOF Vorstandsportal laeuft auf http://localhost:${PORT}`);
  });
}

startServer();
