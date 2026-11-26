import fs from 'fs';
import path from 'path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

export function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export async function parseJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      if (!req.body.trim()) return {};
      try {
        return JSON.parse(req.body);
      } catch {
        throw new Error('Invalid JSON body');
      }
    }
  }
  if (req.readableEnded) return {};

  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    const MAX_SIZE = 2 * 1024 * 1024;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_SIZE) {
        req.destroy();
        reject(new Error('Request payload too large'));
        return;
      }
      body += chunk.toString('utf8');
    });

    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

export function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const json = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(json);
}

export function serveStaticFile(res, publicDir, urlPath) {
  const cleanPath = urlPath.split('?')[0];
  let relPath = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
  relPath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
  let targetPath = path.join(publicDir, relPath);

  if (!targetPath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    // SPA fallback for client routes
    if (!path.extname(relPath)) {
      targetPath = path.join(publicDir, 'index.html');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(targetPath).pipe(res);
}
