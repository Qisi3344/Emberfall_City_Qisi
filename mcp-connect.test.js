import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mcpClientConfig, mcpHttpConfig } from './mcp-connect.js';
import { probeMcpServer } from './mcp-probe.mjs';
import { createMcpHttpHandler } from './mcp-http.mjs';

test('generic MCP snippets preserve absolute paths and escaped separators', () => {
  const windows = mcpClientConfig('node', 'C:\\Games\\Emberfall City\\mcp-server.mjs');
  assert.deepEqual(JSON.parse(windows.json).mcpServers['ember-city'].args, ['C:\\Games\\Emberfall City\\mcp-server.mjs']);
  assert.match(windows.toml, /C:\\\\Games/);
  assert.ok(mcpClientConfig('node', '/home/player/Emberfall City/mcp-server.mjs'));
  assert.equal(mcpClientConfig('node', 'mcp-server.mjs'), null);
  assert.equal(mcpClientConfig('node', '/tmp/other.js'), null);
});

test('a real STDIO client can initialize the MCP server and list game tools', async () => {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const result = await probeMcpServer(root);
  assert.equal(result.ok, true, result.message);
  assert.ok(result.toolCount >= 15);
  assert.equal(result.hasGameTools, true);
});

test('HTTP snippets use a server URL', () => {
  const config = mcpHttpConfig('http://127.0.0.1:4173/mcp');
  assert.equal(JSON.parse(config.json).mcpServers['ember-city'].url, config.url);
  assert.match(config.toml, /url = "http:\/\/127\.0\.0\.1:4173\/mcp"/);
  assert.equal(mcpHttpConfig('file:///tmp/mcp'), null);
  assert.equal(mcpHttpConfig('https://user:pass@example.com/mcp'), null);
});

test('Streamable HTTP clients receive isolated game sessions and Origin protection', async t => {
  const handler = createMcpHttpHandler();
  const server = createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/mcp`;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  const send = (id, method, params, session) => fetch(url, { method: 'POST', headers: { ...headers, ...(session ? { 'Mcp-Session-Id': session, 'Mcp-Protocol-Version': '2025-11-25' } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) });
  const initA = await send(1, 'initialize', { protocolVersion: '2025-11-25' });
  const initB = await send(1, 'initialize', { protocolVersion: '2025-11-25' });
  assert.equal(initA.status, 200);
  const a = initA.headers.get('mcp-session-id');
  const b = initB.headers.get('mcp-session-id');
  assert.ok(a && b && a !== b);
  const list = await (await send(2, 'tools/list', {}, a)).json();
  assert.ok(list.result.tools.some(tool => tool.name === 'create_ruler'));
  const created = await (await send(3, 'tools/call', { name: 'create_ruler', arguments: { name: '银狼' } }, a)).json();
  assert.equal(JSON.parse(created.result.content[0].text).ok, true);
  const stateA = await (await send(4, 'tools/call', { name: 'get_game_state' }, a)).json();
  const stateB = await (await send(4, 'tools/call', { name: 'get_game_state' }, b)).json();
  assert.equal(JSON.parse(stateA.result.content[0].text).playerName, '银狼');
  assert.notEqual(JSON.parse(stateB.result.content[0].text).playerName, '银狼');
  const forbidden = await fetch(url, { method: 'POST', headers: { ...headers, Origin: 'https://evil.example' }, body: JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'ping' }) });
  assert.equal(forbidden.status, 403);
  const otherLocalSite = await fetch(url, { method: 'POST', headers: { ...headers, Origin: 'http://127.0.0.1:9999' }, body: JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'ping' }) });
  assert.equal(otherLocalSite.status, 403);
  assert.equal((await fetch(url, { method: 'GET', headers: { Accept: 'text/event-stream' } })).status, 405);
  assert.equal((await fetch(url, { method: 'DELETE', headers: { 'Mcp-Session-Id': a } })).status, 204);
  assert.equal((await send(6, 'ping', {}, a)).status, 404);
});
