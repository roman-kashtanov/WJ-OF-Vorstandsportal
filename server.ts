import 'dotenv/config';
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

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
