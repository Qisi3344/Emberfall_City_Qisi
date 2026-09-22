// 《余烬之城》MCP 游戏服务器（stdio，零依赖）。
// 核心原则：Agent 与真人玩家共用同一套规则引擎（game.js 的 act / advanceHours），
// 所有校验都发生在引擎内部，Agent 无法绕过资源消耗或直接改数值。
// 启动：node mcp-server.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { newGame, act, advanceHours, weather, score, housing, availableWorkers, assigned, EVENTS } from './game.js';

const SERVER_INFO = { name: 'ember-city-mcp', version: '0.2.0' };
const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INSTRUCTIONS = '这是余烬城的独立 MCP 对局，与浏览器存档不互通。先调用 get_game_state；若尚未开始，用 create_ruler 创建执政者。每次行动后可再次读取状态。遇到事件须用 choose_event_option 处理，再用 advance_time 推进时间。所有工具均遵守游戏规则与资源限制。';

export const TOOLS = [
  { name: 'get_game_state', description: '获取当前完整可决策状态：资源、人口、温度、希望/不满、发电机、建筑、事件与局势。', inputSchema: { type: 'object', properties: {} } },
  { name: 'create_ruler', description: '创建执政者并开始新的一局（会覆盖当前对局）；可选择微寒或极寒，默认微寒。', inputSchema: { type: 'object', properties: { name: { type: 'string', description: '执政者姓名，2～12 个字符' }, difficulty: { type: 'string', enum: ['mild', 'extreme'] } }, required: ['name'] } },
  { name: 'build', description: '在指定槽位建造建筑（需在已解锁供暖环内、资源足够）。', inputSchema: { type: 'object', properties: { index: { type: 'integer', description: '槽位 0-23：0-5 内环，6-13 中环，14-23 外环' }, building: { type: 'string', enum: ['house', 'coal', 'saw', 'steel', 'hunter', 'greenhouse', 'clinic', 'workshop', 'storage', 'tavern', 'shelter', 'venue'] } }, required: ['index', 'building'] } },
  { name: 'upgrade_building', description: '升级指定建筑（最高 3 级）。', inputSchema: { type: 'object', properties: { index: { type: 'integer' } }, required: ['index'] } },
  { name: 'demolish_building', description: '拆除指定建筑，回收少量木材。', inputSchema: { type: 'object', properties: { index: { type: 'integer' } }, required: ['index'] } },
  { name: 'assign_workers', description: '调整指定建筑的工人数，delta 为正数加人、负数减人。', inputSchema: { type: 'object', properties: { index: { type: 'integer' }, delta: { type: 'integer' } }, required: ['index', 'delta'] } },
  { name: 'research', description: '完成一项研究（消耗研究点与材料，需要工坊产出研究点）。', inputSchema: { type: 'object', properties: { id: { type: 'string', enum: ['range2', 'range3', 'power2', 'power3', 'insulation', 'coalEfficiency'] } }, required: ['id'] } },
  { name: 'sign_law', description: '签署一项法令（每天限一条，部分法令互斥）。', inputSchema: { type: 'object', properties: { id: { type: 'string', enum: ['soup', 'longShift', 'shelter', 'childWork', 'venue', 'forcedWork'] } }, required: ['id'] } },
  { name: 'choose_event_option', description: '处理当前城市报告/事件，choice 为选项序号（0 或 1）。', inputSchema: { type: 'object', properties: { choice: { type: 'integer', minimum: 0 } }, required: ['choice'] } },
  { name: 'toggle_generator', description: '开启或关闭发电机。', inputSchema: { type: 'object', properties: { on: { type: 'boolean' } }, required: ['on'] } },
  { name: 'toggle_overdrive', description: '切换发电机超载（压力满 100% 会强制停机）。', inputSchema: { type: 'object', properties: {} } },
  { name: 'issue_relief', description: '发放救济（食 12 木 8，希望 +6；每天限一次，希望 >20 时不可用）。', inputSchema: { type: 'object', properties: {} } },
  { name: 'make_concession', description: '向抗议人群让步（食 10 木 10，不满 −8；仅暴乱通牒期间可用）。', inputSchema: { type: 'object', properties: {} } },
  { name: 'advance_time', description: '推进游戏时间 1～48 小时；遇到待处理事件会自动停下。', inputSchema: { type: 'object', properties: { hours: { type: 'integer', minimum: 1, maximum: 48 } }, required: ['hours'] } },
  { name: 'get_result', description: '查看本局结算（幸存者、死亡、离城、得分），首次调用会把战绩写入与真人同格式的排行榜文件。', inputSchema: { type: 'object', properties: {} } },
];

export function createApi({ ranksPath } = {}) {
  const ranksFile = ranksPath || join(fileURLToPath(new URL('.', import.meta.url)), 'output', 'agent-ranks.json');
  let state = null;
  const live = () => { if (!state) state = newGame(); return state; };
  const apply = action => {
    const s = live();
    const response = act(s, action);
    return { ok: response.ok, message: response.message };
  };
  const brief = () => ({ mode: state.mode, day: state.day, hour: state.hour, event: state.event, hope: state.hope, discontent: state.discontent });
  async function recordIfNeeded() {
    if (state.recorded) return;
    state.recorded = true;
    const entry = { playerId: state.playerId, playerName: state.playerName, difficulty: state.difficulty, score: score(state), survivors: state.population, day: state.day, won: state.mode === 'won', date: new Date().toLocaleDateString('zh-CN') };
    let ranks = [];
    try { ranks = JSON.parse(await readFile(ranksFile, 'utf8')); } catch { /* 首次写入 */ }
    ranks.push(entry);
    ranks.sort((a, b) => b.score - a.score);
    await mkdir(dirname(ranksFile), { recursive: true });
    await writeFile(ranksFile, JSON.stringify(ranks.slice(0, 20), null, 2), 'utf8');
  }
  const handlers = {
    get_game_state() { return gameState(live()); },
    create_ruler({ name, difficulty = 'mild' }) {
      state = newGame();
      const named = act(state, { type: 'confirmName', name, playerId: 'mcp-agent' });
      if (!named.ok) return { ok: false, message: named.message };
      act(state, { type: 'start' });
      const selected = act(state, { type: 'selectDifficulty', difficulty });
      if (!selected.ok) return selected;
      act(state, { type: 'tutorialChoice', needsTutorial: false });
      return { ok: true, message: `执政者 ${state.playerName} 已上任，第 ${state.day} 天开始。` };
    },
    build: ({ index, building }) => apply({ type: 'build', index, building }),
    upgrade_building: ({ index }) => apply({ type: 'upgrade', index }),
    demolish_building: ({ index }) => apply({ type: 'demolish', index }),
    assign_workers: ({ index, delta }) => apply({ type: 'staff', index, delta }),
    research: ({ id }) => apply({ type: 'research', id }),
    sign_law: ({ id }) => apply({ type: 'law', id }),
    choose_event_option: ({ choice }) => apply({ type: 'event', choice }),
    toggle_generator: ({ on }) => apply({ type: 'power', on }),
    toggle_overdrive: () => apply({ type: 'overdrive' }),
    issue_relief: () => apply({ type: 'relief' }),
    make_concession: () => apply({ type: 'concession' }),
    advance_time({ hours }) {
      const count = Math.max(1, Math.min(48, Math.floor(Number(hours))));
      const moved = advanceHours(live(), count);
      return { ok: moved > 0, message: moved ? `推进了 ${moved} 小时。` : '时间没有推进：本局已结束或有待处理的城市报告。', ...brief() };
    },
    async get_result() {
      const s = live();
      if (s.mode !== 'won' && s.mode !== 'lost') return { status: 'playing', difficulty: s.difficulty, day: s.day, hour: s.hour, message: '本局尚未结束，请查看游戏状态中的难度与胜利条件。' };
      await recordIfNeeded();
      return {
        status: s.mode, difficulty: s.difficulty, won: s.mode === 'won', lossReason: s.lossReason || null, rulerStatus: s.social.rulerStatus,
        score: score(s), survivors: s.population, dead: s.dead, fled: s.social.fled, frostbite: s.frostbite,
        day: s.day, lowestHope: s.lowestHope, highestDiscontent: s.highestDiscontent, finalCoal: s.resources.coal, finalFood: s.resources.food,
        message: s.mode === 'won' ? '风暴散去，炉火仍在燃烧。' : '城市在第 ' + s.day + ' 天止步。',
      };
    },
  };
  function gameState(s) {
    return {
      mode: s.mode, difficulty: s.difficulty, playerId: s.playerId, playerName: s.playerName,
      day: s.day, hour: s.hour, temperature: weather(s.day, s.difficulty),
      resources: { ...s.resources }, storageLimit: 300 + s.slots.filter(b => b?.type === 'storage').length * 200,
      population: { total: s.population, children: s.children, sick: s.sick, available: availableWorkers(s), assigned: assigned(s), housing: housing(s) },
      hope: s.hope, discontent: s.discontent,
      social: s.social, lossReason: s.lossReason,
      generator: s.generator, researchPoints: s.researchPoints, researched: s.researched, laws: s.laws, lawDay: s.lawDay,
      event: s.event ? { id: s.event, title: EVENTS[s.event]?.title, text: EVENTS[s.event]?.text, choices: EVENTS[s.event]?.choices } : null,
      buildings: s.slots.map((b, i) => b ? { index: i, ...b } : null).filter(Boolean),
      journal: s.journal.slice(0, 10), message: s.message,
    };
  }
  return {
    listTools: () => TOOLS,
    ranksFile,
    _state: () => live(), // 测试钩子：Agent 工具永远走 act()，不允许直接改数值
    async call(name, args = {}) {
      const handler = handlers[name];
      if (!handler) return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: `未知工具 ${name}` }) }] };
      const result = await handler(args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    },
    gameStateOf: () => state ? gameState(state) : null,
  };
}

export function startServer(api = createApi()) {
  const send = message => process.stdout.write(JSON.stringify(message) + '\n');
  async function handle(msg) {
    const { id, method, params } = msg;
    if (method === 'initialize') {
      send({ jsonrpc: '2.0', id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO, instructions: SERVER_INSTRUCTIONS } });
      return;
    }
    if (method === 'ping') { send({ jsonrpc: '2.0', id, result: {} }); return; }
    if (method === 'tools/list') { send({ jsonrpc: '2.0', id, result: { tools: api.listTools() } }); return; }
    if (method === 'tools/call') {
      try { send({ jsonrpc: '2.0', id, result: await api.call(params?.name, params?.arguments || {}) }); }
      catch (error) { send({ jsonrpc: '2.0', id, result: { isError: true, content: [{ type: 'text', text: String(error?.stack || error) }] } }); }
      return;
    }
    if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      handle(msg);
    }
  });
  process.stdin.on('end', () => process.exit(0));
  process.stderr.write(`[ember-city-mcp] ${SERVER_INFO.name} v${SERVER_INFO.version} ready\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) startServer();
