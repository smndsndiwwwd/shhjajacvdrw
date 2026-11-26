import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import db from '../src/database/db.js';
import { loadAcademies } from '../src/game/academies.js';
import { loadCustomItems } from '../src/game/equipment.js';
import { loadEmojis } from '../src/game/emojis.js';
import { ensureDefaultAdmin } from './lib/auth.js';
import { sendJson, serveStaticFile, getClientIp } from './lib/http.js';
import { handleAuthRoutes } from './routes/auth.js';
import { handlePlayerRoutes } from './routes/player.js';
import { handleModeRoutes } from './routes/modes.js';
import { handleAdminRoutes } from './routes/admin.js';
import { recordSystemLog } from '../src/game/systemLog.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

let bootstrapPromise = null;

export async function ensureAppReady() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await db.ensureReady();
      await Promise.all([loadAcademies(), loadCustomItems(), loadEmojis()]);
      await ensureDefaultAdmin();
    })().catch((err) => {
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}

export async function handleWebRequest(req, res, { serveStatic = true } = {}) {
  try {
    await ensureAppReady();

    const parsed = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = parsed.pathname;
    const query = parsed.searchParams;

    if (pathname.startsWith('/api/')) {
      if (pathname.startsWith('/api/auth/')) {
        const handled = await handleAuthRoutes(req, res, pathname, query);
        if (handled !== false) return;
      }
      if (pathname.startsWith('/api/admin/')) {
        const handled = await handleAdminRoutes(req, res, pathname, query);
        if (handled !== false) return;
      }
      if (
        pathname.startsWith('/api/match/') ||
        pathname.startsWith('/api/tournament/') ||
        pathname.startsWith('/api/franchise/') ||
        pathname.startsWith('/api/challenge/')
      ) {
        const handled = await handleModeRoutes(req, res, pathname, query);
        if (handled !== false) return;
      }
      const handledPlayer = await handlePlayerRoutes(req, res, pathname, query);
      if (handledPlayer !== false) return;

      return sendJson(res, 404, { error: 'API endpoint not found' });
    }

    if (serveStatic) {
      serveStaticFile(res, PUBLIC_DIR, pathname, req);
    } else {
      sendJson(res, 404, { error: 'Not found' });
    }
  } catch (err) {
    console.error('Web server request error:', err);
    await recordSystemLog({
      level: 'ERROR',
      category: 'System',
      actor: 'web-server',
      title: 'Unhandled Web Request Error',
      details: err.stack || err.message,
      ip: getClientIp(req)
    });
    if (!res.headersSent) {
      sendJson(res, 500, { error: err.message || 'Internal Server Error' });
    }
  }
}

export async function startWebServer(port = Number(process.env.WEB_PORT || process.env.PORT || 3000)) {
  await ensureAppReady();

  const server = http.createServer((req, res) => {
    handleWebRequest(req, res, { serveStatic: true });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Web portal port ${port} already in use.`);
    } else {
      console.error('Web server error:', err);
    }
  });

  server.listen(port, '0.0.0.0', async () => {
    console.log(`🌐 Cricket Ascend Web Portal live at http://localhost:${port}`);
    await recordSystemLog({
      level: 'INFO',
      category: 'System',
      actor: 'web-server',
      title: `Web Portal Started on Port ${port}`
    });
  });

  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startWebServer();
}
