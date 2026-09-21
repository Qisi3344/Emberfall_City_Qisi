// Streamable HTTP MCP endpoint. Each HTTP client receives its own game session.
import { randomUUID } from 'node:crypto';
import { createApi, TOOLS } from './mcp-server.mjs';

const PROTOCOL_VERSION = '2025-11-25';
const SUPPORTED_VERSIONS = new Set(['2025-03-26', '2025-06-18', PROTOCOL_VERSION]);
const SERVER_INFO = { name: 'ember-city-mcp', version: '0.3.0' };
const INSTRUCTIONS = '这是余烬城的独立 MCP 对局。先调用 get_game_state，之后用 create_ruler 创建执政者。每个客户端会话有独立存档。';
const SESSION_TTL = 6 * 60 * 60 * 1000;
const MAX_SESSIONS = 100;
const MAX_BODY = 1024 * 1024;

function sendJson(res, status, value, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
}
function rpc(id, result) { return { jsonrpc: '2.0', id, result }; }
function fail(res, status, message, id = null) {
  sendJson(res, status, { jsonrpc: '2.0', id, error: { code: -32600, message } });
}
async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) throw new Error('请求内容过大');
  }
  return JSON.parse(body);
}

export function createMcpHttpHandler({ hostname = '127.0.0.1', apiFactory = createApi } = {}) {
  const sessions = new Map();
  const allowedHosts = new Set([hostname, '127.0.0.1', 'localhost']);
  return async (req, res) => {
    // Reject browser requests from other sites, including DNS rebinding attempts.
    const host = req.headers.host?.split(':')[0]?.replace(/^\[|\]$/g, '');
    if (!allowedHosts.has(host)) { fail(res, 403, 'Invalid Host'); return; }
    const origin = req.headers.origin;
    if (origin) {
      if (origin !== `http://${req.headers.host}`) { fail(res, 403, 'Invalid Origin'); return; }
    }
    if (req.method === 'GET') { res.writeHead(405, { Allow: 'POST, DELETE' }).end(); return; }
    if (req.method === 'DELETE') {
      const id = req.headers['mcp-session-id'];
      if (!id || !sessions.delete(id)) { fail(res, 404, 'Unknown session'); return; }
      res.writeHead(204).end(); return;
    }
    if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST, DELETE' }).end(); return; }
    if (!req.headers['content-type']?.startsWith('application/json')) { fail(res, 415, 'Content-Type must be application/json'); return; }
    const accept = req.headers.accept || '';
    if (!accept.includes('application/json') || !accept.includes('text/event-stream')) { fail(res, 406, 'Accept must include application/json and text/event-stream'); return; }
    let message;
    try { message = await readBody(req); } catch { fail(res, 400, 'Invalid JSON'); return; }
    if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || Array.isArray(message)) {
      fail(res, 400, 'Invalid JSON-RPC message', message?.id ?? null); return;
    }
    const { id, method, params } = message;
    if (method === 'initialize') {
      for (const [key, entry] of sessions) if (Date.now() - entry.touched > SESSION_TTL) sessions.delete(key);
      if (id === undefined || sessions.size >= MAX_SESSIONS) { fail(res, 400, 'Cannot create session', id ?? null); return; }
      const sessionId = randomUUID();
      const version = SUPPORTED_VERSIONS.has(params?.protocolVersion) ? params.protocolVersion : PROTOCOL_VERSION;
      sessions.set(sessionId, { api: apiFactory(), touched: Date.now(), queue: Promise.resolve(), version });
      sendJson(res, 200, rpc(id, { protocolVersion: version, capabilities: { tools: {} }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS }), { 'Mcp-Session-Id': sessionId });
      return;
    }
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId) { fail(res, 400, 'Mcp-Session-Id is required', id ?? null); return; }
    const session = sessions.get(sessionId);
    if (!session || Date.now() - session.touched > SESSION_TTL) {
      sessions.delete(sessionId); fail(res, 404, 'Unknown session', id ?? null); return;
    }
    const version = req.headers['mcp-protocol-version'];
    if (version && version !== session.version) { fail(res, 400, 'Unsupported MCP protocol version', id ?? null); return; }
    session.touched = Date.now();
    if (id === undefined) { res.writeHead(202).end(); return; }
    // Serialize tool calls so a client cannot race two state-changing actions.
    const run = async () => {
      if (method === 'ping') return rpc(id, {});
      if (method === 'tools/list') return rpc(id, { tools: TOOLS });
      if (method === 'tools/call') {
        if (!TOOLS.some(tool => tool.name === params?.name)) return rpc(id, { isError: true, content: [{ type: 'text', text: `未知工具 ${params?.name}` }] });
        try { return rpc(id, await session.api.call(params.name, params.arguments || {})); }
        catch (error) { return rpc(id, { isError: true, content: [{ type: 'text', text: String(error) }] }); }
      }
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
    };
    const pending = session.queue.then(run);
    session.queue = pending.catch(() => {});
    sendJson(res, 200, await pending);
  };
}
