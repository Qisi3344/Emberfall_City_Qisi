// Generic STDIO settings for clients that can launch a local MCP process.
export function isMcpServerPath(value) {
  const path = String(value || '').trim();
  return /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(path) && /(?:^|[\\/])mcp-server\.mjs$/i.test(path);
}

export function mcpClientConfig(command, serverPath) {
  const executable = String(command || '').trim();
  const path = String(serverPath || '').trim();
  if (!executable || !isMcpServerPath(path)) return null;
  return {
    command: executable,
    args: [path],
    json: JSON.stringify({ mcpServers: { 'ember-city': { command: executable, args: [path] } } }, null, 2),
    toml: `[mcp_servers.ember-city]\ncommand = ${JSON.stringify(executable)}\nargs = [${JSON.stringify(path)}]`,
  };
}
