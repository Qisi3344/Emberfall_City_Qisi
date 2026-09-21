import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { probeMcpServer } from './mcp-probe.mjs';
import { createMcpHttpHandler } from './mcp-http.mjs';

const root = resolve(import.meta.dirname);
const port = Number(process.env.PORT || 4173);
const handleMcp = createMcpHttpHandler();
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.json': 'application/json', '.md': 'text/markdown',
};
createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname === '/mcp') { await handleMcp(req, res); return; }
  if (req.method === 'GET' && pathname === '/api/mcp-setup') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      .end(JSON.stringify({ transport: ['stdio', 'streamable-http'], command: 'node', serverPath: join(root, 'mcp-server.mjs'), httpUrl: `http://127.0.0.1:${port}/mcp` }));
    return;
  }
  if (req.method === 'GET' && pathname === '/api/mcp-check') {
    const result = await probeMcpServer(root);
    res.writeHead(result.ok ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      .end(JSON.stringify(result));
    return;
  }
  const file = resolve(join(root, pathname === '/' ? 'index.html' : pathname.slice(1)));
  const offset = relative(root, file);
  if (offset === '..' || offset.startsWith('..' + sep) || isAbsolute(offset)) {
    res.writeHead(403).end(); return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'application/octet-stream'}; charset=utf-8` }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}`));
