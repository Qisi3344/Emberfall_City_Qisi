import { spawn } from 'node:child_process';
import { join } from 'node:path';

export function probeMcpServer(root, timeoutMs = 5000) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [join(root, 'mcp-server.mjs')], {
      cwd: root, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
    });
    let settled = false;
    let buffer = '';
    let errorText = '';
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, message: 'MCP 服务启动超时。' }), timeoutMs);
    child.on('error', error => finish({ ok: false, message: error.message }));
    child.on('exit', code => finish({ ok: false, message: errorText.trim() || `MCP 服务退出（${code}）。` }));
    child.stderr.on('data', chunk => { errorText += chunk.toString(); });
    child.stdout.on('data', chunk => {
      buffer += chunk.toString();
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 1);
        if (!line) continue;
        let message;
        try { message = JSON.parse(line); } catch { return finish({ ok: false, message: 'MCP 服务返回了无效 JSON。' }); }
        if (message.id === 1 && message.result?.serverInfo) {
          child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
          child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) + '\n');
        } else if (message.id === 2 && Array.isArray(message.result?.tools)) {
          const tools = message.result.tools;
          return finish({ ok: true, serverName: 'ember-city', toolCount: tools.length,
            hasGameTools: tools.some(tool => tool.name === 'get_game_state') && tools.some(tool => tool.name === 'create_ruler') });
        } else if (message.error) return finish({ ok: false, message: message.error.message || 'MCP 握手失败。' });
      }
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'ember-city-check', version: '1.0.0' } } }) + '\n');
  });
}
