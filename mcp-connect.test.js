import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mcpClientConfig } from './mcp-connect.js';
import { probeMcpServer } from './mcp-probe.mjs';

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
