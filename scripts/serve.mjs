import http from 'node:http';
import https from 'node:https';
import { readFile, realpath, stat } from 'node:fs/promises';
import { createReadStream, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

export function staticHandler(directory) {
  const root = path.resolve(directory);
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    if (req.socket.encrypted) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    try {
      const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) {
        res.writeHead(403); res.end(); return;
      }
      let file = path.resolve(root, `.${pathname}`);
      if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
      if (pathname === '/' || !path.extname(pathname)) file = path.join(root, 'index.html');
      const resolved = await realpath(file);
      const realRoot = await realpath(root);
      if (!resolved.startsWith(realRoot + path.sep)) { res.writeHead(403); res.end(); return; }
      const info = await stat(resolved);
      if (!info.isFile()) { res.writeHead(404); res.end(); return; }
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      res.setHeader('Content-Length', info.size);
      res.writeHead(200);
      if (req.method === 'HEAD') res.end();
      else createReadStream(resolved).on('error', () => res.destroy()).pipe(res);
    } catch (err) {
      res.writeHead(err instanceof URIError ? 400 : 404);
      res.end();
    }
  };
}

export function createStaticServer({ directory, cert, key }) {
  const handler = staticHandler(directory);
  return cert && key ? https.createServer({ cert, key }, handler) : http.createServer(handler);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(fileURLToPath(new URL('../dist', import.meta.url)));
  const lan = process.argv.includes('--lan');
  const host = process.env.HOST || (lan ? '0.0.0.0' : '127.0.0.1');
  const port = Number(process.env.PORT || 8080);
  const certPath = process.env.TLS_CERT;
  const keyPath = process.env.TLS_KEY;
  if (!existsSync(path.join(root, 'index.html'))) throw new Error('Execute npm run build antes de iniciar.');
  if (Boolean(certPath) !== Boolean(keyPath)) throw new Error('Configure TLS_CERT e TLS_KEY juntos.');
  if (!lan && !['localhost', '127.0.0.1', '::1'].includes(host) && !certPath) throw new Error('Acesso externo requer TLS_CERT e TLS_KEY. Para teste na rede local use npm run start:lan.');
  const server = createStaticServer({ directory: root, cert: certPath && readFileSync(certPath), key: keyPath && readFileSync(keyPath) });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.listen(port, host, () => {
    const protocol = certPath ? 'https' : 'http';
    console.log(`Controle de Tarefas: ${protocol}://${host}:${port}`);
    if (host === '0.0.0.0') for (const addresses of Object.values(os.networkInterfaces())) for (const item of addresses || []) {
      if (item.family === 'IPv4' && !item.internal) console.log(`Rede local: ${protocol}://${item.address}:${port}`);
    }
  });
  // Read renewed certificates without interrupting active requests.
  const renewal = certPath && setInterval(async () => {
    try { const [cert, key] = await Promise.all([readFile(certPath), readFile(keyPath)]); server.setSecureContext({ cert, key }); }
    catch (err) { console.error('Falha ao recarregar certificado TLS:', err.message); }
  }, 60000);
  const stop = () => { if (renewal) clearInterval(renewal); server.close(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
