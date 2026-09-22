import { BUILDINGS, RESEARCH, LAW_BRANCHES, LAWS, EVENTS, newGame, newSocial, act, advanceHours, weather, ringOf, housing, workforce, availableWorkers, assigned, buildingHeat, heatLabel, coalPerHour, costText, lawState, lawVisibility, score, difficultyOf, difficultyName, lawFor, eventEffect, dailyFoodNeed } from './game.js';
import { audio } from './audio.js';
import { mcpClientConfig, mcpHttpConfig } from './mcp-connect.js';

const SAVE = 'ember-city-save-v1';
const RANKS = 'ember-city-ranks-v1';
const PLAYER_ID = 'ember-city-player-id-v1';
const LAST_NAME = 'ember-city-ruler-name-v1';
const app = document.querySelector('#app');
const platform = window.__EMBER_PLATFORM__ || { name: 'web', playerId: null, displayName: '' };
let playerId = localStorage.getItem(PLAYER_ID);
if (!playerId) { playerId = platform.playerId || crypto.randomUUID(); localStorage.setItem(PLAYER_ID, playerId); }
const lastName = localStorage.getItem(LAST_NAME) || platform.displayName || '';
let state;
try {
  const saved = JSON.parse(localStorage.getItem(SAVE));
  state = saved?.version === 1 && saved?.slots?.length === 24 ? saved : newGame();
} catch { state = newGame(); }
state.social ??= newSocial();
state.eventQueue ??= [];
state.lossReason ??= null;
state.difficulty ??= 'mild';
state.tutorialPromptSeen ??= true;
state.generator.finalStormOutageHours ??= 0;
if (state.mode === 'intro' && !state.playerName) state.mode = 'naming';
state.playerName ??= state.mode === 'naming' ? '' : lastName || '旧档执政者';
state.playerId ??= state.mode === 'naming' ? null : playerId;
let panel = null;
let selected = 2;
let rankingsOpen = false;
let settingsOpen = false;
let mcpGuideOpen = false;
let mcpCommand = 'node';
let mcpServerPath = '';
let mcpHttpUrl = '';
let mcpDetectedHttpUrl = '';
let mcpTransport = 'stdio';
let mcpFormat = 'json';
let mcpLocalAvailable = false;
let mcpDetectedPath = '';
let mcpCheckStatus = '';
let mcpFeedback = '';
let restartConfirm = false;
let tutorialOpen = false;
let tutorialStep = 0;
let tutorialSource = 'settings';
let lawBranch = 'survival';
let notice = '';
let noticeError = false;
let elapsed = 0;
let draftName = lastName;
let nameError = '';
const INTRO_COPY = [
  '旧世界已经死去。寒潮吞没城市与道路，幸存者终于停在这座蒸汽发电机前。',
  '这里没有援军。二十天后，超级暴风雪将抵达。谁得到温暖，谁去工作，由你决定。',
];
let introTypingTimer = null;
let introTypingProgress = 0;
let introTypingComplete = false;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = value => Number.isInteger(value) ? value : value.toFixed(1);
const pct = value => Math.max(0, Math.min(100, value));
const resName = { coal: '煤炭', wood: '木材', steel: '钢材', food: '食物' };
const effectSummary = effect => Object.entries(effect || {}).filter(([, value]) => value).map(([key, value]) => `${{...resName, population: '人口', children: '儿童', sick: '病患', hope: '希望', discontent: '不满'}[key] || key} ${value > 0 ? '+' : '−'}${Math.abs(value)}`).join(' · ');
const ringName = n => ['','第一环','第二环','第三环'][n];
const ICONS = {
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.04.08V21h-4v-.92a1.7 1.7 0 0 0-1.08-.68 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1l-.08-.04H3v-4h.92A1.7 1.7 0 0 0 4.6 8.88 1.7 1.7 0 0 0 4.26 7l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6l.04-.08V3h4v.92a1.7 1.7 0 0 0 1.08.68A1.7 1.7 0 0 0 17 4.26l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.12.39.34.74.6 1l.08.04H21v4h-.92c-.26.26-.48.61-.68.96Z"/></svg>',
  build: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11"/><path d="M8 20v-6h8v6"/></svg>',
  staff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M6 20c.6-4 2.5-6 6-6s5.4 2 6 6"/></svg>',
  laws: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>',
  city: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
  core: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/><circle cx="12" cy="12" r="2.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M12 7v10M7 12h10"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="10" width="10" height="9" rx="1"/><path d="M9 10V8a3 3 0 0 1 6 0v2"/></svg>',
};
const BUILDING_ICONS = {
  house: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11 12 5l8 6v8H4z"/><path d="M9 19v-5h6v5"/></svg>',
  coal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="m7 6 5-2 5 3 2 6-4 6H8l-3-5z"/><path d="m9 9 6 6M15 8l-6 7"/></svg>',
  saw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17 17 5"/><path d="m8 16-2-2m5-1-2-2m5-1-2-2m5-1-2-2"/><path d="M4 18h6"/></svg>',
  steel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-2 8H7z"/><path d="M8 8V6h8v2M9 12h6"/></svg>',
  hunter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="1.5"/></svg>',
  greenhouse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19h14M7 19V9l5-5 5 5v10"/><path d="M12 19v-8"/><path d="M12 13c-3 0-4-2-4-4 3 0 4 2 4 4Zm0 2c3 0 4-2 4-4-3 0-4 2-4 4Z"/></svg>',
  clinic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  workshop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"/></svg>',
  storage: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14v11H5z"/><path d="M4 5h16v3H4z"/><path d="M10 12h4"/></svg>',
  tavern: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 6h9v8a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4z"/><path d="M16 8h2a2 2 0 0 1 0 4h-2M9 21h6"/></svg>',
  shelter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11 12 5l8 6v8H4z"/><circle cx="12" cy="12" r="2"/><path d="M9 19v-2a3 3 0 0 1 6 0v2"/></svg>',
  venue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="m12 4 6 5-6 11L6 9z"/><path d="M6 9h12"/></svg>'
};
const TUTORIAL = [
  {
    code: '01 / SURVIVE',
    title: '你的目标：撑过二十天',
    text: '余烬城的核心不是把城市铺满，而是让人活着、让炉火不断。第 20 天超级风暴抵达，只要还有居民且发电机仍在运行，你就撑过去了。',
    facts: [['20 DAY', '最终风暴'], ['核心炉', '不能长时间熄火'], ['人口', '死亡或离城都会减少']]
  },
  {
    code: '02 / RESOURCES',
    title: '先看四种资源',
    text: '煤炭维持发电机，木材和钢材用于建造与研究，食物每天清晨结算。资源数字变暖色时，说明储备已经危险。',
    facts: [['煤炭', '炉火燃料'], ['木材 / 钢材', '建造与研究'], ['食物', '每天清晨消耗']]
  },
  {
    code: '03 / BUILD & STAFF',
    title: '建筑建完，还得有人工作',
    text: '点击地图空槽建造。煤矿、猎人站、工坊、医务所等建筑不会自动运行，还要在「人员」里分配工人。没有工人就没有产出。',
    facts: [['煤矿', '持续补煤'], ['猎人站', '清晨带回食物'], ['工坊', '工作时产生研究点']]
  },
  {
    code: '04 / COLD',
    title: '寒冷会变成病患',
    text: '天气会一天比一天冷。住房不足、住宅温度过低、饥饿都会增加病患。医务所必须有人值守才能治疗。',
    facts: [['住房', '人口超过容量会受冻'], ['温度', '越冷越容易生病'], ['医务所', '需要分配工人']]
  },
  {
    code: '05 / RESEARCH',
    title: '工坊决定城市能长多大',
    text: '开局只能使用第一环。工坊积累研究点后，可以研究供暖范围 II / III，开放第二、第三环；也能升级炉温、住宅保温和煤矿效率。',
    facts: [['第一环', '开局可用'], ['范围 II / III', '解锁更多建筑槽'], ['炉温 / 保温', '对抗后期低温']]
  },
  {
    code: '06 / PEOPLE',
    title: '数字背后是人',
    text: '希望过低会有人谈论离开，持续恶化会真的出走；不满过高会抗议甚至发出最后通牒。难民、疾病、住房和法令会不断改变城市状态。',
    facts: [['希望 ↓', '离城风险'], ['不满 ↑', '抗议 / 暴乱'], ['城市报告', '必须作出决定']]
  }
];
const lossTitles = { exodus: '城市解体', riot: '统治终结', population: '无人守城', survivors: '幸存者不足', socialCrisis: '城市未稳', stormOutage: '风暴断炉', generator: '炉火熄灭' };
function save() { localStorage.setItem(SAVE, JSON.stringify(state)); }
function record() {
  if (state.recorded || !['won', 'lost'].includes(state.mode)) return;
  const ranks = JSON.parse(localStorage.getItem(RANKS) || '[]');
  ranks.push({ playerId: state.playerId, playerName: state.playerName, difficulty: state.difficulty, score: score(state), survivors: state.population, day: state.day, won: state.mode === 'won', date: new Date().toLocaleDateString('zh-CN') });
  ranks.sort((a, b) => b.score - a.score);
  localStorage.setItem(RANKS, JSON.stringify(ranks.slice(0, 20)));
  state.recorded = true; save();
}
function flash(message, error = false) { notice = message; noticeError = error; render(); window.clearTimeout(flash.timer); flash.timer = window.setTimeout(() => { notice = ''; render(); }, 2800); }
const introTotalLength = () => INTRO_COPY.reduce((sum, line) => sum + line.length, 0);
function introCharAt(index) {
  for (const line of INTRO_COPY) {
    if (index < line.length) return line[index];
    index -= line.length;
  }
  return '';
}
function paintIntroTypewriter() {
  const lines = [...app.querySelectorAll('[data-intro-line]')];
  if (!lines.length) return;
  let remaining = introTypingProgress;
  let cursorPlaced = false;
  lines.forEach((node, index) => {
    const text = INTRO_COPY[index] || '';
    const shown = Math.max(0, Math.min(text.length, remaining));
    node.textContent = text.slice(0, shown);
    remaining -= shown;
    const typingHere = !introTypingComplete && !cursorPlaced && shown < text.length;
    node.classList.toggle('typing', typingHere);
    if (typingHere) cursorPlaced = true;
  });
  const button = app.querySelector('.intro-start');
  if (button) {
    button.disabled = !introTypingComplete;
    button.classList.toggle('ready', introTypingComplete);
  }
}
function finishIntroTypewriter() {
  window.clearTimeout(introTypingTimer);
  introTypingProgress = introTotalLength();
  introTypingComplete = true;
  paintIntroTypewriter();
}
function resetIntroTypewriter() {
  window.clearTimeout(introTypingTimer);
  introTypingProgress = 0;
  introTypingComplete = false;
}
function runIntroTypewriter() {
  if (state.mode !== 'intro') { window.clearTimeout(introTypingTimer); return; }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { finishIntroTypewriter(); return; }
  paintIntroTypewriter();
  if (introTypingComplete) return;
  window.clearTimeout(introTypingTimer);
  const step = () => {
    if (state.mode !== 'intro' || introTypingComplete) return;
    const current = introCharAt(introTypingProgress);
    introTypingProgress++;
    if (introTypingProgress >= introTotalLength()) introTypingComplete = true;
    paintIntroTypewriter();
    if (introTypingComplete) return;
    const delay = /[。！？]/.test(current) ? 260 : /[，、；：]/.test(current) ? 110 : 34;
    introTypingTimer = window.setTimeout(step, delay);
  };
  introTypingTimer = window.setTimeout(step, introTypingProgress ? 34 : 220);
}
function dispatch(action) {
  const response = act(state, action);
  if (action.type === 'confirmName') {
    nameError = response.ok ? '' : response.message;
    if (response.ok) { draftName = state.playerName; localStorage.setItem(LAST_NAME, draftName); resetIntroTypewriter(); save(); }
    render(); return;
  }
  if (response.ok) { save(); render(); }
  flash(response.message, !response.ok);
}
function mapHtml() {
  const rings = [6, 8, 10];
  let index = 0;
  const slots = rings.flatMap((count, ringIndex) => Array.from({ length: count }, (_, n) => {
    const id = index++;
    const angle = (-90 + (ringIndex === 1 ? 22.5 : ringIndex === 2 ? 18 : 0) + n * 360 / count) * Math.PI / 180;
    const radius = [21, 34.5, 48][ringIndex];
    const x = 50 + Math.cos(angle) * radius, y = 50 + Math.sin(angle) * radius;
    const b = state.slots[id];
    const locked = ringOf(id) > state.generator.range;
    const heat = b ? buildingHeat(state, id) : 0;
    const def = b ? BUILDINGS[b.type] : null;
    const maxWorkers = b && def.workers ? def.workers * b.level : 0;
    const criticalCold = b && heat <= -25;
    const noCrew = b && maxWorkers > 0 && b.workers === 0;
    const lowCrew = b && maxWorkers > 0 && b.workers > 0 && b.workers < Math.ceil(maxWorkers / 2);
    const status = criticalCold ? { cls: 'freeze', text: '严重失温' } : noCrew ? { cls: 'idle', text: '无人工作' } : lowCrew ? { cls: 'lowcrew', text: '人手不足' } : null;
    const label = b ? `${def.name}，${heatLabel(heat)}，${b.workers}名工人${status ? `，${status.text}` : ''}` : `${ringName(ringOf(id))}空槽${locked ? '，尚未解锁' : ''}`;
    const icon = b ? BUILDING_ICONS[b.type] : locked ? ICONS.lock : ICONS.plus;
    return `<button class="slot ${b ? (heat >= 0 ? 'warm' : 'cold') : 'empty'} ${status ? `has-status ${status.cls}` : ''} ${locked ? 'locked' : ''} ${selected === id && panel === 'slot' ? 'selected' : ''}" style="left:${x}%;top:${y}%" data-slot="${id}" aria-label="${label}" title="${label}"><span class="slot-icon">${icon}</span>${b ? `<small>${def.name}</small>` : ''}${status ? '<i class="slot-status-dot" aria-hidden="true"></i>' : ''}</button>`;
  })).join('');
  const generatorState = !state.generator.on ? '<i class="core-state offline">OFFLINE</i>' : state.generator.overdrive ? '<i class="core-state boost">OVERDRIVE</i>' : '';
  return `<div class="city-map ${state.heatmap ? 'heat' : ''} range-${state.generator.range}" role="group" aria-label="三圈城市地图，24个建筑槽"><div class="ring r1"></div><div class="ring r2"></div><div class="ring r3"></div>${slots}<button class="generator ${!state.generator.on ? 'off' : ''} ${state.generator.overdrive ? 'overdrive' : ''}" data-open="generator" aria-label="发电机，${state.generator.on ? '运行中' : '已熄火'}"><span class="core-icon">${ICONS.core}</span><small>核心炉</small>${generatorState}</button>${state.day >= 17 ? `<div class="stormveil ${state.day === 20 ? 'heavy' : ''}"></div>` : ''}</div>`;
}
function mapToolsHtml() {
  return `<div class="map-tools" role="group" aria-label="地图工具"><button class="settings-btn" data-act="settings" aria-label="设置" title="设置">${ICONS.settings}</button><button class="heat-btn ${state.heatmap ? 'active' : ''}" data-act="heat" aria-label="${state.heatmap ? '关闭热力图' : '打开热力图'}" title="热力图" aria-pressed="${state.heatmap}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Z"/><path d="M12 9v8"/></svg></button></div>`;
}
function buildCards() {
  const categories = ['居住','生产','食物','设施','社会'];
  const locked = selected < 0 || ringOf(selected) > state.generator.range;
  return `<p class="hint">${selected < 0 ? '当前供暖范围内没有空槽。可以升级供暖范围或拆除建筑。' : `当前选中：${ringName(ringOf(selected))} · ${selected + 1} 号槽${locked ? '。请先研究供暖范围。' : ''}。点击地图空槽可切换位置。`}</p>${categories.map(category => `<div class="section-label">${category}</div>${Object.entries(BUILDINGS).filter(([,b]) => b.category === category).map(([id,b]) => `<div class="card"><div class="cardline"><span class="glyph building-icon">${BUILDING_ICONS[id] || ''}</span><div class="card-main"><strong>${b.name}</strong><small>${b.note}</small><small>${costText(b.cost)}</small></div><button data-act="build" data-id="${id}" ${locked || state.slots[selected] || (b.law && !state.laws.includes(b.law)) ? 'disabled' : ''}>建造</button></div></div>`).join('')}`).join('')}`;
}
function slotPanel() {
  const b = state.slots[selected];
  if (!b) return { title: `${ringName(ringOf(selected))} · 空地`, subtitle: `${selected + 1} 号建筑槽`, body: buildCards() };
  const def = BUILDINGS[b.type];
  const heat = buildingHeat(state, selected);
  const upgradeCost = b.level < 3 ? { wood: 18 * b.level, steel: 5 * b.level } : null;
  return { title: def.name, subtitle: `${ringName(ringOf(selected))} · Lv.${b.level}`, body: `<div class="stat-grid"><div class="stat">建筑温度<b>${heatLabel(heat)} ${heat}℃</b></div><div class="stat">工人<b>${b.workers} / ${def.workers * b.level}</b></div></div><p class="hint" style="margin-top:10px">${def.note}</p>${def.workers ? `<div class="card"><div class="cardline"><div class="card-main"><strong>分配工人</strong><small>可用 ${availableWorkers(state)} 人</small></div><div class="staff-control"><button class="secondary" data-act="staff" data-delta="-1" aria-label="减少工人">−</button><b>${b.workers}</b><button data-act="staff" data-delta="1" aria-label="增加工人">+</button></div></div></div>` : ''}<div class="button-row"><button class="action" data-act="upgrade" ${upgradeCost ? '' : 'disabled'}>升级 ${upgradeCost ? costText(upgradeCost) : '已满级'}</button><button class="action danger" data-act="demolish">拆除建筑</button></div>` };
}
function staffPanel() {
  const list = state.slots.map((b, i) => b && BUILDINGS[b.type].workers ? { ...b, i } : null).filter(Boolean);
  return { title: '人员调度', subtitle: `可用 ${availableWorkers(state)} / 健康劳动力 ${workforce(state)} / 已分配 ${assigned(state)}`, body: `<div class="stat-grid"><div class="stat">总人口<b>${state.population}</b></div><div class="stat">健康劳动力<b>${workforce(state)}</b></div><div class="stat">儿童<b>${state.children}</b></div><div class="stat">病患<b>${state.sick}</b></div></div><div class="section-label">工作岗位</div>${list.length ? list.map(b => `<div class="card"><div class="cardline"><div class="card-main"><strong>${BUILDINGS[b.type].name}</strong><small>${ringName(ringOf(b.i))} · ${b.workers}/${BUILDINGS[b.type].workers * b.level} 人</small></div><div class="staff-control"><button class="secondary" data-act="staff" data-index="${b.i}" data-delta="-1" aria-label="减少${BUILDINGS[b.type].name}工人">−</button><button data-act="staff" data-index="${b.i}" data-delta="1" aria-label="增加${BUILDINGS[b.type].name}工人">+</button></div></div></div>`).join('') : '<p class="hint">先建造生产或服务建筑，才能分配工人。</p>'}` };
}
function lawsPanel() {
  const branch = LAW_BRANCHES[lawBranch] ? lawBranch : 'survival';
  const branchLaws = Object.entries(LAWS).filter(([, law]) => law.branch === branch);
  const tiers = [...new Set(branchLaws.map(([, law]) => law.tier))].sort((a,b) => a - b);
  const tabs = Object.entries(LAW_BRANCHES).map(([id, meta]) => `<button class="${branch === id ? 'active' : ''}" data-law-branch="${id}"><b>${meta.name}</b><small>${meta.note}</small></button>`).join('');
  const rows = tiers.map(tier => {
    const nodes = branchLaws.filter(([, law]) => law.tier === tier).map(([id]) => {
      const law = lawFor(state, id);
      const visibility = lawVisibility(state, id);
      if (visibility === 'hidden') return '';
      if (visibility === 'shadow') return `<div class="law-node shadow lane-${law.lane || 'center'}"><span class="law-seal">?</span><strong>未揭示法令</strong><small>签署上级法令后显示</small></div>`;
      const info = lawState(state, id);
      const affordable = !law.cost || Object.entries(law.cost).every(([key,value]) => state.resources[key] >= value);
      const disabled = info.status !== 'available' || state.lawDay === state.day || !affordable;
      const stateText = info.status === 'signed' ? '已签署' : info.status === 'blocked' ? '路线互斥' : info.status === 'available' ? (affordable ? '可签署' : '物资不足') : info.reason;
      const cost = law.cost ? `<em>${costText(law.cost)}</em>` : '';
      return `<div class="law-node ${info.status} lane-${law.lane || 'center'}"><span class="law-seal">${info.status === 'signed' ? '✓' : String(tier + 1).padStart(2,'0')}</span><strong>${law.name}</strong><small>${law.note}</small><div class="law-node-meta"><span>${stateText}</span>${cost}</div><button data-act="law" data-id="${id}" ${disabled ? 'disabled' : ''}>${info.status === 'signed' ? '已签署' : '签署'}</button></div>`;
    }).filter(Boolean).join('');
    return nodes ? `<div class="law-tier tier-${tier}">${nodes}</div>` : '';
  }).join('');
  return {
    title: '法令树',
    subtitle: state.lawDay === state.day ? '今日已签署法令 · 明日可继续' : '今日可签署一条法令',
    body: `<div class="law-tabs">${tabs}</div><div class="law-branch-head"><b>${LAW_BRANCHES[branch].name}</b><span>第 ${state.day} 天</span></div><div class="law-tree">${rows}</div><p class="law-legend"><span>● 已签署</span><span>○ 可见 / 待满足</span><span>？ 未揭示</span></p>`
  };
}
function researchPanel() {
  return { title: '工坊研究', subtitle: `研究点 ${fmt(state.researchPoints)}`, body: `<p class="hint">分配工坊工人，在工作时段积累研究点；研究还需要木材和钢材。</p>${Object.entries(RESEARCH).map(([id,t]) => `<div class="card"><div class="cardline"><div class="card-main"><strong>${t.name}</strong><small>${t.note}</small><small>${t.points} 研究点 · ${costText(t.cost)}${t.requires ? ` · 需先完成${RESEARCH[t.requires].name}` : ''}</small></div><button data-act="research" data-id="${id}" ${state.researched.includes(id) || (t.requires && !state.researched.includes(t.requires)) ? 'disabled' : ''}>${state.researched.includes(id) ? '已完成' : '研究'}</button></div></div>`).join('')}` };
}
function generatorPanel() {
  const g = state.generator;
  return { title: '中央发电机', subtitle: g.on ? '运行中 · 城市的最后热源' : '已熄火 · 请补充煤炭', body: `<div class="stat-grid"><div class="stat">功率<b>Lv.${g.power}</b></div><div class="stat">供暖范围<b>${g.range} 环</b></div><div class="stat">煤耗 / 小时<b>${fmt(coalPerHour(state))}</b></div><div class="stat">超载压力<b>${fmt(g.stress)}%</b></div></div><p class="hint" style="margin-top:10px">超载每小时压力 +${difficultyOf(state).stressGain}，关闭后每小时 −${difficultyOf(state).stressRecovery}；达到 100% 会停机。连续熄火 ${difficultyOf(state).outageLimit} 小时会失败。</p><div class="button-row"><button class="action ${g.overdrive ? 'danger' : ''}" data-act="overdrive">${g.overdrive ? '关闭超载' : '开启超载'}</button><button class="action secondary" data-act="power">${g.on ? '关闭发电机' : '启动发电机'}</button><button class="action secondary" data-open="research">进入研究</button></div>` };
}
function cityPanel() {
  const c = state.social;
  const relief = state.hope <= 20 && c.lastReliefDay !== state.day;
  const concession = c.riotDeadline !== null && c.lastConcessionDay !== state.day;
  return { title: '城市档案', subtitle: `${difficultyName(state)}模式 · 第 ${state.day} 天 · 距风暴 ${Math.max(0, 20 - state.day)} 天`, body: `<div class="stat-grid"><div class="stat">住房<b>${state.population} / ${housing(state)}</b></div><div class="stat">发电机燃料<b>${fmt(state.resources.coal)} 煤</b></div><div class="stat">离城倾向<b>${fmt(c.leavingIntent)} 人</b></div><div class="stat">每日食物需求<b>${fmt(dailyFoodNeed(state))}</b></div></div><div class="section-label">社会局势</div><p class="hint">${c.despairDeadline !== null ? `离城危机剩余 ${c.despairDeadline} 小时；将希望恢复至 15。` : c.exodusState === 'active' ? '逃亡潮：低希望可能在清晨导致居民离城。' : c.exodusState === 'warning' ? '居民正在谈论离开。' : '离城风险暂时可控。'} ${c.riotDeadline !== null ? `暴乱最后通牒剩余 ${c.riotDeadline} 小时；将不满降至 ${difficultyOf(state).riotRecovery} 以下。` : c.riotState === 'warning' ? '暴乱警告：生产效率下降。' : c.riotState === 'protest' ? '城内发生抗议。' : ''}</p><div class="button-row"><button class="action" data-act="relief" ${relief ? '' : 'disabled'}>发放救济 · 食12 木8</button><button class="action secondary" data-act="concession" ${concession ? '' : 'disabled'}>回应诉求 · 食10 木10</button></div><div class="button-row"><button class="action secondary" data-open="research">研究科技</button><button class="action secondary" data-open="generator">发电机</button></div><div class="section-label">城市纪事</div>${state.journal.slice(0, 8).map(line => `<div class="card"><small>${esc(line)}</small></div>`).join('')}` };
}
function socialAlertsHtml() {
  if (state.mode !== 'playing') return '';
  const c = state.social, alerts = [];
  if (c.riotDeadline !== null) alerts.push(`<button class="social-alert riot ${c.riotDeadline <= 6 ? 'urgent' : ''}" data-open="city"><b>⚠ 暴乱最后通牒</b><span>${c.riotDeadline} 小时 · 不满须低于 ${difficultyOf(state).riotRecovery}</span></button>`);
  else if (c.riotState === 'warning' || c.riotState === 'protest') alerts.push(`<button class="social-alert riot" data-open="city"><b>⚠ ${c.riotState === 'warning' ? '暴乱警告' : '居民抗议'}</b><span>查看城市应对</span></button>`);
  if (c.despairDeadline !== null) alerts.push(`<button class="social-alert ${c.despairDeadline <= 6 ? 'urgent' : ''}" data-open="city"><b>⚠ 离城危机</b><span>${c.despairDeadline} 小时 · 希望须达到 15</span></button>`);
  else if (c.exodusState !== 'none') alerts.push(`<button class="social-alert" data-open="city"><b>⚠ ${c.exodusState === 'active' ? '逃亡潮' : '离城传言'}</b><span>离城倾向 ${fmt(c.leavingIntent)} 人</span></button>`);
  return alerts.length ? `<div class="social-alerts" role="status">${alerts.join('')}</div>` : '';
}
function rankingPanel() {
  const ranks = JSON.parse(localStorage.getItem(RANKS) || '[]');
  return { title: '查看排名', subtitle: '本机战绩 · 联网榜单后续开放', body: ranks.length ? ranks.map((r,i) => `<div class="card"><div class="cardline"><strong>#${i + 1} · ${esc(r.playerName || '旧档执政者')}</strong><strong>${r.score} 分</strong></div><small>${difficultyName(r)} · ID ${esc(r.playerId?.slice(0, 8) || '旧记录')} · ${r.won ? '幸存' : '失败'} · 第 ${r.day} 天 · ${r.survivors} 人幸存 · ${r.date}</small></div>`).join('') : '<p class="hint">暂无本机战绩。</p>' };
}
function sheetHtml() {
  if (!panel) return '';
  const content = ({ slot: slotPanel, build: () => ({ title: '建造', subtitle: '固定地基 · 每格一座建筑', body: buildCards() }), staff: staffPanel, laws: lawsPanel, city: cityPanel, research: researchPanel, generator: generatorPanel, ranking: rankingPanel })[panel]?.();
  if (!content) return '';
  const code = ({ slot: 'SITE', build: 'BUILD', staff: 'STAFF', laws: 'LAW', city: 'CITY', research: 'TECH', generator: 'CORE', ranking: 'ARCHIVE' })[panel] || 'CITY';
  return `<section class="sheet" aria-label="${content.title}"><div class="sheet-grip" aria-hidden="true"></div><div class="sheet-head"><div><span class="sheet-kicker">${code}</span><strong>${content.title}</strong><small>${content.subtitle}</small></div><button class="close" data-act="close" aria-label="关闭面板">×</button></div><div class="sheet-body">${content.body}</div></section>`;
}
function tutorialHtml() {
  if (!tutorialOpen) return '';
  const page = TUTORIAL[tutorialStep];
  const last = tutorialStep === TUTORIAL.length - 1;
  const tutorialText = tutorialStep === 0 && state.difficulty === 'extreme' ? '极寒模式要撑过第 20 天：至少 15 人存活、发电机运行、没有暴乱或离城倒计时，且最终风暴中累计熄火不超过 1 小时。' : page.text;
  return `<div class="overlay tutorial-overlay"><section class="tutorial-card" aria-label="生存教程">
    <div class="tutorial-top"><div><span class="tutorial-code">${page.code}</span><div class="eyebrow">SURVIVAL HANDBOOK</div></div><span class="tutorial-count">${tutorialStep + 1} / ${TUTORIAL.length}</span></div>
    <div class="tutorial-progress">${TUTORIAL.map((_,i) => `<i class="${i <= tutorialStep ? 'done' : ''}"></i>`).join('')}</div>
    <h2>${page.title}</h2>
    <p>${tutorialText}</p>
    <div class="tutorial-facts">${page.facts.map(([a,b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</div>
    <div class="tutorial-actions">
      <button class="action secondary" data-act="tutorial-prev" ${tutorialStep === 0 ? 'disabled' : ''}>上一步</button>
      ${!last ? '<button class="action" data-act="tutorial-next">下一步</button>' : '<button class="action" data-act="tutorial-close">看完了</button>'}
    </div>
    <button class="tutorial-exit" data-act="tutorial-close">${tutorialSource === 'prompt' ? '返回游戏' : '返回设置'}</button>
  </section></div>`;
}
function overlayHtml() {
  if (rankingsOpen) return `<div class="overlay"><div class="report"><div class="eyebrow">LOCAL RECORDS</div><h2>本机排名</h2><p>当前仅保存本机战绩；联网排行榜属于后续版本。</p><div style="max-height:45vh;overflow:auto">${rankingPanel().body}</div><button class="action secondary" data-act="back-ranking" style="margin-top:12px;width:100%">返回结算</button></div></div>`;
  if (state.mode === 'naming') return `<div class="overlay"><div class="intro naming"><img class="naming-logo" src="./assets/logo/logo100.png" alt="余烬之城"><div class="eyebrow">THE LAST HEARTH · 00</div><h1>执政者命名</h1><p>为这次执政留下名字。</p><form id="ruler-form" novalidate><label for="ruler-name">执政者姓名</label><input id="ruler-name" name="ruler-name" type="text" maxlength="24" autocomplete="off" value="${esc(draftName)}" aria-describedby="name-hint${nameError ? ' name-error' : ''}"><small id="name-hint">2～12 个字符，可在开始前更改。</small>${nameError ? `<small id="name-error" class="name-error" role="alert">${esc(nameError)}</small>` : ''}<button class="action" type="submit">确认姓名 · 阅读开场</button></form></div></div>`;
  if (state.mode === 'intro') return `<div class="overlay"><div class="intro intro-story"><div class="eyebrow">THE LAST HEARTH · 01</div><h1>余烬城</h1><p class="ruler-identity">执政者：${esc(state.playerName)}</p><p class="intro-type-line" data-intro-line="0"></p><p class="lead intro-type-line" data-intro-line="1"></p><button class="action intro-start" data-act="start" disabled>开始执政</button><small class="intro-skip-hint">点击画面可立即显示全文</small></div></div>`;
  if (state.mode === 'difficulty') return `<div class="overlay"><div class="intro difficulty-select"><div class="eyebrow">SURVIVAL MODE · 02</div><h1>选择难度</h1><p>本局开始后无法更改难度。</p><button class="difficulty-option" data-act="select-difficulty" data-difficulty="mild"><strong>微寒模式</strong><span>推荐初次体验</span><small>资源与天气压力适中，适合熟悉余烬城的生存系统。</small></button><button class="difficulty-option extreme" data-act="select-difficulty" data-difficulty="extreme"><strong>⚠ 极寒模式</strong><span>高压生存</span><small>更少的储备、更快的降温、更严苛的社会与医疗压力。每一个决定都会留下代价。</small><small>最终需至少 15 人存活、炉火运行、没有社会危机倒计时，且风暴中累计断炉不超过 1 小时。</small></button></div></div>`;
  if (state.mode === 'playing' && state.tutorialPromptSeen === false) return `<div class="overlay"><div class="report tutorial-prompt"><div class="eyebrow">SURVIVAL HANDBOOK</div><h2>看教程？</h2><p>城市已进入${difficultyName(state)}模式，时间保持暂停。可以先查看生存手册，也可以直接开始。</p><div class="button-row"><button class="action secondary" data-act="tutorial-choice" data-need="false">不需要</button><button class="action" data-act="tutorial-choice" data-need="true">需要</button></div></div></div>`;
  if (state.event) {
    const event = EVENTS[state.event];
    const flight = state.event === 'exodus' && state.social.lastFlight;
    const refugeeOffer = state.event === 'refugees' ? state.refugees?.offer : null;
    const eventText = refugeeOffer
      ? `${refugeeOffer.count} 名幸存者抵达城门，其中 ${refugeeOffer.children} 名儿童、${refugeeOffer.sick} 名病患。他们请求进入余烬城。`
      : state.event === 'despair' ? `人们不再相信这座城市能撑过下一个夜晚。城门前聚集着带行囊的家庭。你还有 ${difficultyOf(state).despairHours} 小时挽回他们。`
      : state.event === 'riotUltimatum' ? `人群堵住了通往发电机的道路。你有 ${difficultyOf(state).riotHours} 小时将不满降至 ${difficultyOf(state).riotRecovery} 以下。`
      : state.event === 20 ? `外部生产停止。发电机煤耗变为 ${difficultyOf(state).stormCoal} 倍。请撑过接下来的二十四小时。`
      : event.text;
    const severeEvents = new Set(['riotUltimatum', 'despair', 'foodRiot', 'healthcareProtest', 'coldHomesProtest', 20]);
    const warningEvents = new Set(['protest', 'exodus', 'foodProblem', 'healthcareProblem', 'healthcareOverload', 'housingProblem', 'coldHomes', 17, 19]);
    const tone = severeEvents.has(state.event) ? 'critical' : warningEvents.has(state.event) ? 'warning' : 'normal';
    const eventCode = typeof state.event === 'number' ? `D${String(state.event).padStart(2,'0')}` : String(state.event).replace(/([a-z])([A-Z])/g, '$1-$2').toUpperCase();
    return `<div class="overlay event-overlay"><div class="report event-report ${tone}"><div class="event-head"><div><span class="event-code">${eventCode}</span><div class="eyebrow">CITY REPORT · DAY ${String(state.day).padStart(2,'0')}</div></div><span class="event-required">DECISION REQUIRED</span></div><h2>${event.title}</h2>${event.image ? `<img class="event-image" src="./assets/events/event-${event.image}.jpg" alt="" width="300" height="169">` : ''}<p class="event-text">${eventText}</p>${flight ? `<p class="flight-loss">离城 ${flight.count} 人 · 食物 −${flight.food} · 木材 −${flight.wood} · 煤炭 −${flight.coal}</p>` : ''}<div class="decision-list">${event.choices.map((choice,i) => {
       const consequence = effectSummary(eventEffect(state, state.event, i)) || choice.consequence;
      return `<button class="choice" data-act="event" data-choice="${i}"><span class="choice-no">0${i + 1}</span><span class="choice-copy"><b>${choice.label}</b><small>${consequence}</small></span><span class="choice-arrow" aria-hidden="true">›</span></button>`;
    }).join('')}</div></div></div>`;
  }
  if (state.mode === 'won' || state.mode === 'lost') return `<div class="overlay"><div class="ending"><div class="eyebrow">CITY ARCHIVE · FINAL REPORT · ${difficultyName(state)}</div><h1>${state.mode === 'won' ? '黎明仍在' : lossTitles[state.lossReason] || '城市失守'}</h1><div class="summary"><div>难度<b>${difficultyName(state)}</b></div><div>初始人口<b>${state.initialPopulation ?? 30}</b></div><div>剩余人口<b>${state.population}</b></div><div>死亡人数<b>${state.dead}</b></div><div>离城人数<b>${state.social.fled}</b></div><div>冻伤人数<b>${state.frostbite}</b></div><div>最低温度<b>${weather(state.day, state.difficulty)}℃</b></div><div>最低希望<b>${state.lowestHope}</b></div><div>最高不满<b>${state.highestDiscontent}</b></div><div>最终煤炭<b>${fmt(state.resources.coal)}</b></div>${state.difficulty === 'extreme' ? `<div>最终风暴断炉<b>${state.generator.finalStormOutageHours || 0} 小时</b></div>` : ''}<div>最终得分<b>${score(state)}</b></div></div><p class="chronicle">${state.social.massExodus ? '发生大规模离城。' : ''}${state.social.riotEver ? '曾触发暴乱最后通牒。' : ''}执政者：${esc(state.playerName)}（${state.social.rulerStatus}）。这座城市签署了 ${state.laws.length} 条法令，建起 ${state.slots.filter(Boolean).length} 座建筑。${state.mode === 'won' ? '风暴散去，仍有人守着发电机。' : `城市在第 ${state.day} 天止步。`}</p><button class="action secondary" data-act="ranking">查看排名</button><button class="action" data-act="restart">再来一局</button></div></div>`;
  return '';
}
function mcpConfig() { return mcpTransport === 'http' ? mcpHttpConfig(mcpHttpUrl) : mcpClientConfig(mcpCommand, mcpServerPath); }
function mcpCanCheck() { return mcpLocalAvailable && (mcpTransport === 'http' ? mcpHttpUrl.trim() === mcpDetectedHttpUrl : mcpServerPath.trim() === mcpDetectedPath); }
function mcpStatusText() {
  if (!mcpConfig()) return mcpTransport === 'http' ? '请填写以 http:// 或 https:// 开头的 MCP 服务 URL。' : '请填写 Node 启动命令和 mcp-server.mjs 的本机绝对路径。';
  if (mcpCanCheck()) return mcpCheckStatus || '已识别本地项目路径。可检测服务是否正常启动。';
  return '配置已生成；请在 AI 客户端中确认工具列表。远程 URL 需由服务器提供并做好访问控制。';
}
function mcpGuideHtml() {
  const config = mcpConfig();
  const preview = config ? config[mcpFormat] : (mcpTransport === 'http' ? '填写 MCP 服务 URL 后生成配置。' : '填写本机 mcp-server.mjs 的绝对路径后生成配置。');
  return `<div class="overlay settings"><section class="report settings-panel mcp-panel" aria-label="MCP 接入指南">
    <div class="eyebrow">AI CONNECTION / MCP</div><h2>连接 AI 客户端</h2>
    <p class="mcp-intro">余烬城提供标准 MCP 工具。按 AI 客户端支持的接入方式选择；无需绑定特定 AI 或账号。</p>
    <div class="mcp-tabs mcp-transport" role="group" aria-label="MCP 连接方式"><button class="${mcpTransport === 'stdio' ? 'active' : ''}" data-act="mcp-stdio" aria-pressed="${mcpTransport === 'stdio'}">本地 STDIO</button><button class="${mcpTransport === 'http' ? 'active' : ''}" data-act="mcp-http" aria-pressed="${mcpTransport === 'http'}">URL / HTTP</button></div>
    ${mcpTransport === 'stdio' ? `
    <ol class="mcp-steps"><li>下载<a href="https://github.com/Qisi3344/Emberfall_City_Qisi/archive/refs/heads/main.zip" target="_blank" rel="noopener noreferrer">项目源码</a>并安装 <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer">Node.js</a>。</li><li>确认下方 <code>mcp-server.mjs</code> 的本机绝对路径。</li><li>在任意支持 STDIO 的 AI 客户端新增 MCP 服务器：命令为 <code>node</code>，参数为脚本路径。</li><li>保存并刷新客户端，找到 <code>get_game_state</code> 和 <code>create_ruler</code> 工具。</li></ol>
    <label class="mcp-field">启动命令<input data-mcp-field="command" value="${esc(mcpCommand)}" spellcheck="false" autocomplete="off" aria-label="MCP 启动命令"></label>
    <label class="mcp-field">参数 · 本机脚本绝对路径<input data-mcp-field="path" value="${esc(mcpServerPath)}" placeholder="例如 C:\\Games\\Emberfall_City_Qisi\\mcp-server.mjs" spellcheck="false" autocomplete="off" aria-label="MCP 服务器脚本绝对路径"></label>` : `
    <ol class="mcp-steps"><li>下载<a href="https://github.com/Qisi3344/Emberfall_City_Qisi/archive/refs/heads/main.zip" target="_blank" rel="noopener noreferrer">项目源码</a>并安装 <a href="https://nodejs.org/" target="_blank" rel="noopener noreferrer">Node.js</a>。</li><li>在项目目录运行 <code>npm run dev</code>，保持终端开启。默认 MCP 地址为 <code>http://127.0.0.1:4173/mcp</code>。</li><li>在支持 Streamable HTTP 的 AI 客户端新增 MCP 服务器，粘贴下方 URL。只接受公网地址的云端 AI 需要先部署带认证的 HTTPS 服务；本机地址无法被云端访问。</li><li>连接后确认能看到 <code>get_game_state</code> 和 <code>create_ruler</code> 工具。</li></ol>
    <label class="mcp-field">MCP 服务 URL<input data-mcp-field="url" value="${esc(mcpHttpUrl)}" placeholder="http://127.0.0.1:4173/mcp" spellcheck="false" autocomplete="off" aria-label="MCP 服务 URL"></label>`}
    <p class="mcp-status" role="status">${esc(mcpStatusText())} ${esc(mcpFeedback)}</p>
    ${mcpLocalAvailable ? `<button class="action secondary" data-act="mcp-check" ${mcpCanCheck() ? '' : 'disabled'}>检测此项目 MCP 服务</button>` : ''}
    <div class="mcp-config-head"><span>复制到客户端</span><div class="mcp-tabs" role="group" aria-label="配置格式"><button class="${mcpFormat === 'json' ? 'active' : ''}" data-act="mcp-json" aria-pressed="${mcpFormat === 'json'}">JSON</button><button class="${mcpFormat === 'toml' ? 'active' : ''}" data-act="mcp-toml" aria-pressed="${mcpFormat === 'toml'}">TOML</button></div></div>
    <pre class="mcp-config" data-mcp-preview>${esc(preview)}</pre><button class="action secondary" data-act="mcp-copy" ${config ? '' : 'disabled'}>复制${mcpFormat.toUpperCase()}配置</button>
    <p class="mcp-note">${mcpTransport === 'stdio' ? '客户端会自行启动 MCP 服务。' : 'HTTP 服务默认仅监听本机；GitHub Pages 静态页面不提供 /mcp 服务。'}每个 AI 对局与当前网页存档独立，共用同一套游戏规则。</p>
    <button class="action secondary" data-act="mcp-back">返回设置</button>
  </section></div>`;
}
async function loadMcpSetup() {
  try {
    const response = await fetch('./api/mcp-setup', { cache: 'no-store' });
    if (!response.ok) return;
    const setup = await response.json();
    if (!setup.serverPath || !mcpGuideOpen) return;
    mcpLocalAvailable = true;
    mcpDetectedPath = setup.serverPath;
    mcpDetectedHttpUrl = setup.httpUrl || '';
    if (!mcpServerPath) mcpServerPath = setup.serverPath;
    if (!mcpHttpUrl) mcpHttpUrl = mcpDetectedHttpUrl;
    render();
  } catch { /* GitHub Pages has no local setup endpoint. */ }
}
async function probeMcpHttp(url) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  const init = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'ember-city-guide', version: '1.0' } } }) });
  const session = init.headers.get('mcp-session-id');
  if (!init.ok || !session) return { ok: false, message: `HTTP 初始化失败 (${init.status})` };
  try {
    const response = await fetch(url, { method: 'POST', headers: { ...headers, 'Mcp-Session-Id': session, 'Mcp-Protocol-Version': '2025-11-25' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) });
    const result = await response.json();
    const tools = result.result?.tools || [];
    return { ok: response.ok, toolCount: tools.length, hasGameTools: tools.some(tool => tool.name === 'create_ruler') && tools.some(tool => tool.name === 'get_game_state') };
  } finally { fetch(url, { method: 'DELETE', headers: { 'Mcp-Session-Id': session } }).catch(() => {}); }
}
function settingsHtml() {
  if (!settingsOpen) return '';
  if (mcpGuideOpen) return mcpGuideHtml();
  const p = audio.prefs;
  const vol = key => Math.round(p[key] * 100);
  const row = (key, label) => `<label class="set-row"><span>${label}</span><input type="range" min="0" max="100" step="1" value="${vol(key)}" data-vol="${key}" aria-label="${label}"><b data-vol-view="${key}">${vol(key)}</b></label>`;
  return `<div class="overlay settings"><div class="report settings-panel"><div class="eyebrow">SETTINGS</div><h2>设置</h2><div class="set-group">${row('master', '总音量')}${row('bgm', 'BGM 音量')}${row('sfx', '音效音量')}</div><div class="settings-list"><button class="settings-item" data-act="toggle-snow"><span class="settings-item-copy"><b>雪花粒子</b><small>场景动态效果</small></span><span class="settings-switch ${p.snow ? 'on' : ''}" aria-label="${p.snow ? '已开启' : '已关闭'}"><i></i></span></button><button class="settings-item" data-act="tutorial-settings"><span class="settings-item-copy"><b>生存手册</b><small>教程与基础生存规则</small></span><span class="settings-arrow" aria-hidden="true">›</span></button><button class="settings-item mcp-locked" data-act="settings-mcp" disabled aria-disabled="true" title="暂未开放"><span class="settings-item-copy"><b>AI / MCP 接入</b><small>远程接入准备中</small></span><span class="settings-badge">暂未开放</span></button></div><div class="settings-footer"><button class="settings-link danger-link" data-act="settings-restart">${restartConfirm ? '再次确认重新开始' : '重新开始本局'}</button><span aria-hidden="true"></span><button class="settings-link" data-act="settings-close">返回游戏</button></div></div></div>`;
}
function render() {
  record();
  const scroll = app.querySelector('.sheet-body')?.scrollTop || 0;
  const mcpScroll = app.querySelector('.mcp-panel')?.scrollTop || 0;
  const isDay = state.hour >= 6 && state.hour < 18;
  const homes = housing(state);
  const homeless = Math.max(0, state.population - homes);
  const phaseClass = state.day >= 17 ? 'late-game' : state.day >= 10 ? 'mid-game' : 'early-game';
  const weatherLabel = state.day === 20 ? '超级风暴' : state.day >= 17 ? '风暴逼近' : isDay ? '雪天' : '雪夜';
  const resources = Object.entries(state.resources).map(([key,value]) => `<div class="resource ${value < (key === 'coal' ? 30 : key === 'food' ? 15 : 10) ? 'low' : ''}"><img src="./assets/resources/${key}.png" alt="" width="26" height="26"><div class="resource-copy"><span>${resName[key]}</span><strong>${fmt(value)}</strong></div></div>`).join('');
  app.innerHTML = `<main class="app ${phaseClass}"><header class="top"><div class="brand"><span>EMBERFALL CITY / 余烬城</span><strong>20 DAYS BELOW</strong></div><div class="dayline"><div class="day-main"><span class="hud-kicker">DAY</span><strong>${String(state.day).padStart(2,'0')}</strong><small>${state.hour.toString().padStart(2,'0')}:00 · ${weatherLabel}</small></div><div class="temp ${state.day === 20 ? 'storm' : ''}"><small>TEMP</small><b>${weather(state.day, state.difficulty)}℃</b></div></div><div class="resource-row">${resources}</div><div class="population-line"><span>人口 <b>${state.population}</b><i>住房 ${homes}</i></span><span>可用 <b>${availableWorkers(state)}</b><i class="${state.sick ? 'warn-text' : ''}">病患 ${state.sick}</i>${homeless ? `<i class="danger-text">无家可归 ${homeless}</i>` : ''}</span></div><div class="mood-row"><div class="meter"><span>希望</span><div class="track"><i style="width:${pct(state.hope)}%"></i></div><b>${fmt(state.hope)}</b></div><div class="meter anger"><span>不满</span><div class="track"><i style="width:${pct(state.discontent)}%"></i></div><b>${fmt(state.discontent)}</b></div></div></header><div class="city-space"><img class="city-bg" src="${isDay ? './assets/city-day.png?v=2' : './assets/city-night.png?v=2'}" alt="" aria-hidden="true">${mapHtml()}</div><div class="bottom-controls"><div class="time-box"><span>TIME CONTROL</span><b>${state.hour.toString().padStart(2,'0')}:00</b><small>${state.mode === 'playing' ? (state.speed ? `${state.speed}× 自动推进` : '已暂停') : '等待指令'}</small></div><div class="speed-cluster"><button class="speed-btn ${state.speed === 0 ? 'active' : ''}" data-speed="0" aria-label="暂停">Ⅱ</button><button class="speed-btn ${state.speed === 1 ? 'active' : ''}" data-speed="1">1×</button><button class="speed-btn ${state.speed === 2 ? 'active' : ''}" data-speed="2">2×</button><button class="speed-btn ${state.speed === 3 ? 'active' : ''}" data-speed="3">3×</button></div><button class="time-btn" data-act="advance">+6H</button></div><nav class="nav" aria-label="主要导航">${[['build','建造'],['staff','人员'],['laws','法令'],['city','城市']].map(([id,label]) => `<button class="${panel === id ? 'active' : ''}" data-open="${id}"><span class="nav-icon">${ICONS[id]}</span><em>${label}</em></button>`).join('')}</nav>${sheetHtml()}${notice ? `<div class="notice ${noticeError ? 'error' : ''}" role="status">${esc(notice)}</div>` : ''}${overlayHtml()}${settingsHtml()}${tutorialHtml()}</main>`;
  app.querySelector('.bottom-controls').insertAdjacentHTML('beforebegin', socialAlertsHtml());
  const citySpace = app.querySelector('.city-space');
  citySpace.insertAdjacentHTML('afterbegin', mapToolsHtml());
  if (state.mode === 'naming' || state.mode === 'intro') app.querySelector('.intro')?.insertAdjacentHTML('afterbegin', `<button class="intro-settings" data-act="settings" aria-label="设置" title="设置">${ICONS.settings}</button>`);
  citySpace.classList.add(isDay ? 'day' : 'night');
  citySpace.classList.toggle('panel-open', !!panel);
  if (state.day === 20) citySpace.classList.add('storm');
  citySpace.classList.toggle('no-snow', !audio.prefs.snow);
  citySpace.style.setProperty('--snow-delay', `${-performance.now() / 1000}s`);
  app.querySelector('.dayline small').textContent = `${state.hour.toString().padStart(2, '0')}:00 · ${isDay ? '白昼' : '黑夜'} · ${state.day === 20 ? '超级风暴' : state.day >= 17 ? '风暴逼近' : isDay ? '雪天' : '雪夜'}`;
  const body = app.querySelector('.sheet-body'); if (body) body.scrollTop = scroll;
  const mcpPanel = app.querySelector('.mcp-panel'); if (mcpPanel) mcpPanel.scrollTop = mcpScroll;
  audio.observe(state);
  if (state.mode === 'intro') runIntroTypewriter();
}
function advance(count) {
  if (settingsOpen || tutorialOpen || state.tutorialPromptSeen === false) return;
  const moved = advanceHours(state, count);
  if (moved) { state.speed = state.event || state.mode !== 'playing' ? 0 : state.speed; save(); render(); }
}
app.addEventListener('click', event => {
  audio.unlock();
  const button = event.target.closest('button');
  if (state.mode === 'intro' && !introTypingComplete && !button && event.target.closest('.overlay')) { finishIntroTypewriter(); return; }
  if (!button) return;
  audio.play(button.dataset.act === 'build' ? 'place' : 'ui');
  if (button.dataset.slot !== undefined) { selected = Number(button.dataset.slot); panel = 'slot'; render(); return; }
  if (button.dataset.lawBranch) { lawBranch = button.dataset.lawBranch; panel = 'laws'; render(); return; }
  if (button.dataset.open) { panel = button.dataset.open; if (panel === 'build' && state.slots[selected]) selected = state.slots.findIndex((b,i) => !b && ringOf(i) <= state.generator.range); render(); return; }
  if (button.dataset.speed !== undefined) { state.speed = Number(button.dataset.speed); elapsed = 0; save(); render(); return; }
  const action = button.dataset.act, id = button.dataset.id;
  if (action === 'close') { panel = null; render(); return; }
  if (action === 'heat') { state.heatmap = !state.heatmap; save(); render(); return; }
  if (action === 'advance') { advance(6); return; }
  if (action === 'ranking') { rankingsOpen = true; render(); return; }
  if (action === 'back-ranking') { rankingsOpen = false; render(); return; }
  if (action === 'settings') { settingsOpen = !settingsOpen; mcpGuideOpen = false; restartConfirm = false; render(); return; }
  if (action === 'settings-close') { settingsOpen = false; mcpGuideOpen = false; restartConfirm = false; render(); return; }
  if (action === 'settings-mcp') { mcpGuideOpen = false; mcpFeedback = ''; return; }
  if (action === 'mcp-back') { mcpGuideOpen = false; render(); return; }
  if (action === 'mcp-stdio' || action === 'mcp-http') { mcpTransport = action === 'mcp-http' ? 'http' : 'stdio'; mcpCheckStatus = ''; mcpFeedback = ''; render(); return; }
  if (action === 'mcp-json' || action === 'mcp-toml') { mcpFormat = action === 'mcp-json' ? 'json' : 'toml'; mcpFeedback = ''; render(); return; }
  if (action === 'mcp-copy') {
    const config = mcpConfig();
    if (!config) return;
    navigator.clipboard.writeText(config[mcpFormat]).then(() => { mcpFeedback = '配置已复制。'; if (mcpGuideOpen) render(); })
      .catch(() => { mcpFeedback = '复制失败，请手动选中配置。'; if (mcpGuideOpen) render(); });
    return;
  }
  if (action === 'mcp-check') {
    if (!mcpCanCheck()) return;
    mcpCheckStatus = '正在检查 MCP 服务…'; mcpFeedback = ''; render();
    const check = mcpTransport === 'http' ? probeMcpHttp(mcpHttpUrl) : fetch('./api/mcp-check', { cache: 'no-store' }).then(response => response.json());
    check.then(result => {
      mcpCheckStatus = result.ok && result.hasGameTools ? `服务可启动 · 已发现 ${result.toolCount} 个工具。` : `检测失败：${result.message || '游戏工具未就绪。'}`;
      if (mcpGuideOpen) render();
    }).catch(() => { mcpCheckStatus = '检测失败：本地游戏服务不可用。'; if (mcpGuideOpen) render(); });
    return;
  }
  if (action === 'select-difficulty') { dispatch({ type: 'selectDifficulty', difficulty: button.dataset.difficulty }); return; }
  if (action === 'tutorial-choice') {
    const needsTutorial = button.dataset.need === 'true';
    const response = act(state, { type: 'tutorialChoice', needsTutorial });
    if (!response.ok) { flash(response.message, true); return; }
    if (needsTutorial) { tutorialSource = 'prompt'; tutorialStep = 0; tutorialOpen = true; }
    save(); render(); return;
  }
  if (action === 'tutorial-settings') { tutorialSource = 'settings'; tutorialStep = 0; settingsOpen = false; tutorialOpen = true; render(); return; }
  if (action === 'tutorial-prev') { tutorialStep = Math.max(0, tutorialStep - 1); render(); return; }
  if (action === 'tutorial-next') { tutorialStep = Math.min(TUTORIAL.length - 1, tutorialStep + 1); render(); return; }
  if (action === 'tutorial-close') {
    tutorialOpen = false; tutorialStep = 0;
    if (tutorialSource === 'settings') settingsOpen = true;
    render(); return;
  }
  if (action === 'toggle-snow') { audio.setSnow(!audio.prefs.snow); render(); return; }
  if (action === 'settings-restart') {
    if (!restartConfirm) { restartConfirm = true; render(); return; }
    settingsOpen = false; mcpGuideOpen = false; restartConfirm = false; tutorialOpen = false; tutorialStep = 0;
    resetIntroTypewriter(); state = newGame(); draftName = platform.displayName || localStorage.getItem(LAST_NAME) || ''; nameError = ''; panel = null; selected = 2; rankingsOpen = false; elapsed = 0; save(); render(); return;
  }
  if (action === 'restart') { tutorialOpen = false; tutorialStep = 0; resetIntroTypewriter(); state = newGame(); draftName = localStorage.getItem(LAST_NAME) || ''; nameError = ''; panel = null; selected = 2; rankingsOpen = false; elapsed = 0; save(); render(); return; }
  if (action === 'build') dispatch({ type: 'build', index: selected, building: id });
  else if (action === 'staff') dispatch({ type: 'staff', index: Number(button.dataset.index ?? selected), delta: Number(button.dataset.delta) });
  else if (action === 'upgrade' || action === 'demolish') dispatch({ type: action, index: selected });
  else if (action === 'research' || action === 'law') dispatch({ type: action, id });
  else if (action === 'event') dispatch({ type: 'event', choice: Number(button.dataset.choice) });
  else if (action === 'start' || action === 'power' || action === 'overdrive' || action === 'relief' || action === 'concession') dispatch({ type: action });
});
app.addEventListener('input', event => {
  const field = event.target.dataset?.mcpField;
  if (field) {
    if (field === 'command') mcpCommand = event.target.value;
    if (field === 'path') mcpServerPath = event.target.value;
    if (field === 'url') mcpHttpUrl = event.target.value;
    mcpFeedback = ''; mcpCheckStatus = '';
    const config = mcpConfig();
    const preview = app.querySelector('[data-mcp-preview]');
    if (preview) preview.textContent = config ? config[mcpFormat] : (mcpTransport === 'http' ? '填写 MCP 服务 URL 后生成配置。' : '填写本机 mcp-server.mjs 的绝对路径后生成配置。');
    const copy = app.querySelector('[data-act="mcp-copy"]');
    if (copy) copy.disabled = !config;
    const status = app.querySelector('.mcp-status');
    if (status) status.textContent = mcpStatusText();
    const check = app.querySelector('[data-act="mcp-check"]');
    if (check) check.disabled = !mcpCanCheck();
    return;
  }
  const key = event.target.dataset?.vol;
  if (!key) return;
  audio.setVolume(key, Number(event.target.value) / 100);
  const view = app.querySelector(`[data-vol-view="${key}"]`);
  if (view) view.textContent = event.target.value;
});
app.addEventListener('submit', event => {
  if (event.target.id !== 'ruler-form') return;
  audio.unlock();
  event.preventDefault();
  draftName = event.target.elements.namedItem('ruler-name').value;
  dispatch({ type: 'confirmName', name: draftName, playerId });
});
setInterval(() => {
  if (settingsOpen || tutorialOpen || state.tutorialPromptSeen === false || state.mode !== 'playing' || !state.speed || state.event) return;
  elapsed += 100;
  if (elapsed >= 4000 / state.speed) { elapsed = 0; advance(1); }
}, 100);
window.advanceTime = ms => { if (settingsOpen || tutorialOpen || state.tutorialPromptSeen === false || state.mode !== 'playing' || !state.speed) return; elapsed += ms; while (elapsed >= 4000 / state.speed && state.mode === 'playing' && !state.event) { elapsed -= 4000 / state.speed; advance(1); } };
window.render_game_to_text = () => JSON.stringify({ coordinateSystem: '24 slots: 0-5 inner, 6-13 middle, 14-23 outer; map percentages from top-left', mode: state.mode, difficulty: state.difficulty, tutorialPromptSeen: state.tutorialPromptSeen, playerId: state.playerId, playerName: state.playerName, day: state.day, hour: state.hour, weather: weather(state.day, state.difficulty), resources: state.resources, population: state.population, sick: state.sick, hope: state.hope, discontent: state.discontent, social: state.social, lossReason: state.lossReason, generator: state.generator, researchPoints: state.researchPoints, researched: state.researched, laws: state.laws, event: state.event, selected, panel, buildings: state.slots.map((b,i) => b ? { slot: i, ...b } : null).filter(Boolean) });
document.addEventListener('keydown', event => {
  if (event.key.toLowerCase() === 'f' && !event.repeat && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
    if (document.fullscreenElement) document.exitFullscreen(); else app.requestFullscreen?.();
  }
});
const splash = document.getElementById('splash');
function preloadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve; img.onerror = reject;
    img.src = `./assets/${file}`;
  });
}
async function boot() {
  try {
    await Promise.race([
      Promise.all(['city-day.png', 'city-night.png', 'logo/logo100.png', 'resources/coal.png', 'resources/wood.png', 'resources/steel.png', 'resources/food.png'].map(preloadImage)),
      new Promise(resolve => setTimeout(resolve, 2500)),
    ]);
  } catch { /* 网络不佳时直接进入游戏 */ }
  if (splash) { splash.classList.add('done'); setTimeout(() => splash.remove(), 450); }
  render();
}
boot();
