export const BUILDINGS = {
  house: { name: '住宅', glyph: '⌂', category: '居住', cost: { wood: 24 }, workers: 0, note: '容纳 10 / 15 / 20 人；升级改善保温' },
  coal: { name: '煤矿', glyph: '◆', category: '生产', cost: { wood: 30, steel: 4 }, workers: 10, note: '工作时产煤；极端风暴停工' },
  saw: { name: '锯木场', glyph: '╱', category: '生产', cost: { wood: 20 }, workers: 10, note: '工作时产木材；极端风暴停工' },
  steel: { name: '钢厂', glyph: '▰', category: '生产', cost: { wood: 34, steel: 6 }, workers: 10, note: '工作时产钢材；极端风暴停工' },
  hunter: { name: '猎人站', glyph: '⌖', category: '食物', cost: { wood: 22 }, workers: 10, note: '每日清晨带回食物；风暴中停工' },
  greenhouse: { name: '温室', glyph: '✣', category: '食物', cost: { wood: 38, steel: 12 }, workers: 5, note: '工作时稳定产出食物，需要供暖' },
  clinic: { name: '医务所', glyph: '✚', category: '设施', cost: { wood: 26, steel: 5 }, workers: 5, note: '每日治疗病患，必须分配工人' },
  workshop: { name: '工坊', glyph: '⚙', category: '设施', cost: { wood: 30, steel: 8 }, workers: 5, note: '工作时产出研究点' },
  storage: { name: '仓库', glyph: '▣', category: '设施', cost: { wood: 24, steel: 5 }, workers: 0, note: '提高资源储备上限' },
  tavern: { name: '酒馆', glyph: '♜', category: '社会', cost: { wood: 28, steel: 4 }, workers: 3, note: '每日降低不满' },
  shelter: { name: '儿童庇护所', glyph: '✦', category: '社会', cost: { wood: 26, steel: 4 }, workers: 0, law: 'shelter', note: '需要先签署儿童庇护法令；每日提升希望' },
  venue: { name: '夜间会所', glyph: '◈', category: '社会', cost: { wood: 30, steel: 8 }, workers: 3, law: 'venue', note: '需要先签署公共娱乐法令；降低不满' },
};

export const RESEARCH = {
  range2: { name: '供暖范围 II', points: 12, cost: { wood: 25, steel: 8 }, note: '开放第二环的 8 个槽位' },
  range3: { name: '供暖范围 III', points: 28, cost: { wood: 40, steel: 16 }, requires: 'range2', note: '开放第三环的 10 个槽位' },
  power2: { name: '发电机功率 II', points: 15, cost: { wood: 18, steel: 12 }, note: '供热提高，煤耗增加' },
  power3: { name: '发电机功率 III', points: 32, cost: { wood: 28, steel: 22 }, requires: 'power2', note: '更高供热，煤耗明显增加' },
  insulation: { name: '住宅保温', points: 18, cost: { wood: 22, steel: 8 }, note: '所有住宅温度提高' },
  coalEfficiency: { name: '采煤改良', points: 20, cost: { wood: 18, steel: 10 }, note: '煤矿产量提高 30%' },
};

export const LAWS = {
  soup: { name: '节粮汤', note: '食物消耗减少 20%，每日增加不满', hope: -2, discontent: 4 },
  longShift: { name: '延长工时', note: '工作时间增加至 06:00—20:00，日增不满', hope: -3, discontent: 6 },
  shelter: { name: '儿童庇护', note: '解锁儿童庇护所，提升希望', hope: 7, discontent: 0, excludes: 'childWork' },
  childWork: { name: '儿童劳动', note: '最多让 3 名儿童加入劳动力；每日希望 −1、不满 +1，严寒时儿童更易生病', hope: -10, discontent: 5, excludes: 'shelter' },
  venue: { name: '公共娱乐', note: '解锁夜间会所', hope: 0, discontent: -3 },
  forcedWork: { name: '强制劳动', note: '生产提高 10%；希望大降，长期增加不满', hope: -14, discontent: -8 },
};

export const EVENTS = {
  refugees: { title: '城门外的脚步', image: 'survivors', text: '一队幸存者抵达城门，请求进入余烬城。', choices: [
    { label: '打开城门', consequence: '接纳这批幸存者', effect: {} },
    { label: '只能祝他们好运', consequence: '拒绝他们入城', effect: {} },
  ] },
  10: { title: '加班事故', image: 'accident', text: '工人从高处摔落。城市要求你决定是否停工检修。', choices: [
    { label: '停工救治', consequence: '木材 −15，病患 −3，希望 +4', effect: { wood: -15, sick: -3, hope: 4 } },
    { label: '维持生产', consequence: '病患 +3，不满 +6', effect: { sick: 3, discontent: 6 } },
  ] },
  14: { title: '漫长的夜', image: 'dinner', text: '连续低温让居民疲惫。有人提议举行一次集体晚餐。', choices: [
    { label: '拨出食物', consequence: '食物 −20，希望 +9，不满 −5', effect: { food: -20, hope: 9, discontent: -5 } },
    { label: '保存口粮', consequence: '希望 −4', effect: { hope: -4 } },
  ] },
  17: { title: '超级风暴确认', image: 'storm-warning', text: '观测员确认三天后将出现前所未有的暴风雪。所有人都望向发电机。', choices: [
    { label: '公布完整预报', consequence: '希望 −5，储备意识提升', effect: { hope: -5 } },
    { label: '先稳定人心', consequence: '不满 +5', effect: { discontent: 5 } },
  ] },
  19: { title: '最后的狩猎', image: 'last-hunt', text: '动物踪迹消失，城外能见度极低。猎人请求提前回城。', choices: [
    { label: '准许归城', consequence: '希望 +3', effect: { hope: 3 } },
    { label: '再试最后一次', consequence: '食物 +12，病患 +4', effect: { food: 12, sick: 4 } },
  ] },
  20: { title: '风暴降临', image: 'final-storm', text: '外部生产全部停止。煤炭消耗加倍。请撑过接下来的二十四小时。', choices: [
    { label: '守住炉火', consequence: '进入最终倒计时', effect: {} },
  ] },
  foodProblem: { title: '口粮见底', image: 'hunger', text: '配给队报告，库存已经不足以覆盖所有人的一天口粮。饥饿还没有演变成骚乱，但抱怨正在增加。', choices: [
    { label: '优先保证基本配给', consequence: '希望 +2，不满 −1', effect: { hope: 2, discontent: -1 } },
    { label: '维持现有配给', consequence: '不满 +4', effect: { discontent: 4 } },
  ] },
  foodRiot: { title: '饥饿正在变成愤怒', image: 'hunger', text: '连续缺粮让人群聚到仓库前。现在他们要的不是解释，而是食物。', choices: [
    { label: '公开配给账目并优先供餐', consequence: '希望 +2，不满 −5', effect: { hope: 2, discontent: -5 } },
    { label: '驱散人群', consequence: '希望 −4，不满 +7', effect: { hope: -4, discontent: 7 } },
  ] },
  healthcareProblem: { title: '病患无人安置', image: 'medical', text: '病患人数持续增加，而城里还没有可用的医务所。临时照料已经快撑不住了。', choices: [
    { label: '调整资源，优先筹建医疗', consequence: '希望 +2', effect: { hope: 2 } },
    { label: '先维持现状', consequence: '不满 +4', effect: { discontent: 4 } },
  ] },
  healthcareOverload: { title: '医疗能力不足', image: 'medical', text: '医务所已经存在，但病患仍在增加。床位与值守人员都开始吃紧。', choices: [
    { label: '优先医疗调度', consequence: '病患 −1，希望 +1', effect: { sick: -1, hope: 1 } },
    { label: '让医疗系统自行周转', consequence: '不满 +4', effect: { discontent: 4 } },
  ] },
  healthcareProtest: { title: '病患家属的抗议', image: 'medical', text: '医疗问题迟迟没有缓解。病患家属聚在炉边，要求城市立刻增加治疗能力。', choices: [
    { label: '重新调整岗位与供暖', consequence: '不满 −4', effect: { discontent: -4 } },
    { label: '拒绝改变当前安排', consequence: '希望 −4，不满 +6', effect: { hope: -4, discontent: 6 } },
  ] },
  housingProblem: { title: '有人没有住处', image: 'cold', text: '夜里仍有人睡在公共区域。住房容量已经低于当前人口，寒风开始钻进临时铺位。', choices: [
    { label: '优先安排临时床位', consequence: '希望 +1，不满 −2', effect: { hope: 1, discontent: -2 } },
    { label: '暂时忍耐', consequence: '希望 −2，不满 +3', effect: { hope: -2, discontent: 3 } },
  ] },
  coldHomes: { title: '住宅正在失温', image: 'cold', text: '越来越多住宅降到危险温度。问题不是某一座建筑，而是整片居住区正在变冷。', choices: [
    { label: '优先保证居民区供暖', consequence: '希望 +2', effect: { hope: 2 } },
    { label: '生产优先', consequence: '不满 +4', effect: { discontent: 4 } },
  ] },
  coldHomesProtest: { title: '他们受够了寒冷', image: 'cold', text: '住宅持续失温，居民开始公开质问供暖安排。寒冷已经从生存问题变成了社会问题。', choices: [
    { label: '重新调整供暖优先级', consequence: '不满 −4', effect: { discontent: -4 } },
    { label: '拒绝调整', consequence: '希望 −4，不满 +6', effect: { hope: -4, discontent: 6 } },
  ] },
  leavingTalk: { title: '有人开始谈论离开', image: 'leaving-talk', text: '昨夜，外墙边留下了一句话：“这里不会有春天。”越来越多人开始收拾行李。', choices: [
    { label: '开放议事与配给', consequence: '食物 −8，希望 +5', effect: { food: -8, hope: 5 } },
    { label: '让传言自行消散', consequence: '希望 −2', effect: { hope: -2 } },
  ] },
  protest: { title: '城中的抗议', image: 'riot', text: '居民聚集在炉火旁，要求你解释饥寒与加班。', choices: [
    { label: '听取诉求并开放口粮', consequence: '食物 −12，不满 −6', effect: { food: -12, discontent: -6 } },
    { label: '要求他们返回岗位', consequence: '不满 +4', effect: { discontent: 4 } },
  ] },
  despair: { title: '他们准备离开这里', image: 'exodus', text: '人们不再相信这座城市能撑过下一个夜晚。城门前聚集着带着行囊的家庭。你还有一天挽回他们。', choices: [
    { label: '动用最后储备作出承诺', consequence: '煤 −10、木 −20、食 −20；希望 +15', effect: { coal: -10, wood: -20, food: -20, hope: 15 } },
    { label: '公开事实，请求再给一天', consequence: '希望 +6，不满 +8', effect: { hope: 6, discontent: 8 } },
  ] },
  riotUltimatum: { title: '城市拒绝继续服从', image: 'riot', text: '人群堵住了通往发电机的道路。他们给你两天：必须将不满降至 75 以下。', choices: [
    { label: '开仓让步', consequence: '食物 −18、木材 −10；不满 −12', effect: { food: -18, wood: -10, discontent: -12 } },
    { label: '承诺调查', consequence: '不满 −7，希望 +2', effect: { discontent: -7, hope: 2 } },
  ] },
  exodus: { title: '一批人离开了', image: 'exodus', text: '天亮前，他们打开城门。没有争吵，也没有告别，只带走了能背动的食物与燃料。', choices: [
    { label: '将他们记入城史', consequence: '继续执政', effect: {} },
  ] },
};

const cap = (v, low = 0, high = 100) => Math.max(low, Math.min(high, v));
const round = v => Math.round(v * 10) / 10;
const costText = cost => Object.entries(cost).map(([key, value]) => `${{ coal: '煤', wood: '木', steel: '钢', food: '食' }[key]} ${value}`).join(' · ');
export { costText };

export const newSocial = () => ({ leavingIntent: 0, lowHopeHours: 0, exodusState: 'none', despairDeadline: null, riotState: 'none', riotDeadline: null, aftermathHours: 0, fled: 0, massExodus: false, riotEver: false, rulerStatus: '继续执政', lastFlight: null, lastReliefDay: 0, lastConcessionDay: 0 });

export function weather(day) {
  if (day <= 2) return -20;
  if (day <= 5) return -30;
  if (day <= 8) return -40;
  if (day <= 11) return -50;
  if (day <= 14) return -60;
  return [-70, -70, -80, -90, -100, -120][Math.min(5, day - 15)];
}

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const weightedRefugeeCount = () => Math.round((randInt(2, 10) + randInt(2, 10)) / 2);
function makeRefugeePlan() {
  const totalWaves = randInt(1, 3);
  const waves = [{ earliest: randInt(5, 8), latest: 8, required: true, done: false }];
  if (totalWaves >= 2) waves.push({ earliest: randInt(10, 12), latest: 14, required: false, done: false });
  if (totalWaves >= 3) waves.push({ earliest: randInt(14, 16), latest: 18, required: false, done: false });
  return { waves, arrivals: 0, offer: null };
}
function ensureRefugees(s) {
  s.refugees ??= makeRefugeePlan();
  s.refugees.waves ??= makeRefugeePlan().waves;
  s.refugees.arrivals ??= 0;
  s.refugees.offer ??= null;
  return s.refugees;
}
function cityCanAttractRefugees(s) {
  return s.generator.on && s.population > 0 && s.hope >= 25 && s.discontent < 85;
}
function makeRefugeeOffer() {
  const count = weightedRefugeeCount();
  const children = Math.min(count - 1, Math.max(0, Math.round(count * (randInt(10, 30) / 100))));
  const sick = Math.min(count - children, randInt(0, Math.min(3, count - children)));
  const foodCost = Math.max(4, Math.round(count * 1.4));
  return { count, children, sick, foodCost };
}
function maybeQueueRefugees(s) {
  const r = ensureRefugees(s);
  if (r.offer || s.event === 'refugees' || s.eventQueue.includes('refugees')) return;
  const wave = r.waves.find(w => !w.done && s.day >= w.earliest && s.day <= w.latest);
  if (!wave) {
    for (const w of r.waves) if (!w.done && s.day > w.latest) w.done = true;
    return;
  }
  if (!wave.required && !cityCanAttractRefugees(s)) {
    if (s.day >= wave.latest) wave.done = true;
    return;
  }
  wave.done = true;
  r.offer = makeRefugeeOffer();
  queueEvent(s, 'refugees');
}

export function newGame() {
  const slots = Array.from({ length: 24 }, () => null);
  slots[0] = { type: 'house', level: 2, workers: 0 };
  slots[1] = { type: 'house', level: 2, workers: 0 };
  const population = randInt(22, 28);
  const children = Math.max(3, Math.min(population - 1, Math.round(population * (randInt(15, 25) / 100))));
  const sick = randInt(0, 2);
  return {
    version: 1, mode: 'naming', playerId: null, playerName: '', day: 1, hour: 6, speed: 0, heatmap: false,
    resources: { coal: 130, wood: 170, steel: 36, food: 78 },
    initialPopulation: population, population, children, sick, dead: 0, frostbite: 0,
    hope: 68, discontent: 21, lowestHope: 68, highestDiscontent: 21,
    generator: { on: true, manualOff: false, power: 1, range: 1, overdrive: false, stress: 0, outage: 0 },
    slots, researchPoints: 0, researched: [], laws: [], lawDay: 0,
    event: null, eventQueue: [], eventState: { seen: [], foodShortageDays: 0, untreatedSickDays: 0, coldHomesDays: 0, homelessDays: 0 }, refugees: makeRefugeePlan(), journal: ['第 1 天，发电机重新点火。'],
    social: newSocial(), lossReason: null,
    message: '先建煤矿、猎人站与工坊，分配工人。',
  };
}

export const ringOf = index => index < 6 ? 1 : index < 14 ? 2 : 3;
export const housing = s => s.slots.reduce((n, b) => n + (b?.type === 'house' ? [0, 10, 15, 20][b.level] : 0), 0);
export const assigned = s => s.slots.reduce((n, b) => n + (b?.workers || 0), 0);
export const childLaborers = s => s.laws.includes('childWork') ? Math.min(3, Math.max(0, s.children)) : 0;
export const workforce = s => Math.max(0, s.population - s.children - s.sick + childLaborers(s));
export const availableWorkers = s => Math.max(0, workforce(s) - assigned(s));

// 人口减少、生病或离城后，旧岗位分配可能超过当前健康劳动力。
// 自动释放超额岗位，避免出现“所有建筑都减到 0 仍无法重新派人”的软锁。
function normalizeStaffing(s) {
  let excess = Math.max(0, assigned(s) - workforce(s));
  if (!excess) return;
  for (let i = s.slots.length - 1; i >= 0 && excess > 0; i--) {
    const b = s.slots[i];
    if (!b?.workers) continue;
    const release = Math.min(b.workers, excess);
    b.workers -= release;
    excess -= release;
  }
}
export const storageLimit = s => 300 + s.slots.filter(b => b?.type === 'storage').length * 200;
export const buildingHeat = (s, index) => weather(s.day) + (s.generator.on ? s.generator.power * 23 + (s.generator.overdrive ? 16 : 0) : 0) + [0, 10, 3, -4][ringOf(index)] + (s.slots[index]?.type === 'house' ? (s.slots[index].level - 1) * 5 + (s.researched.includes('insulation') ? 8 : 0) : 0);
export function heatLabel(value) {
  return value >= 8 ? '舒适' : value >= 0 ? '宜居' : value >= -12 ? '微冷' : value >= -25 ? '寒冷' : value >= -40 ? '严寒' : '极寒';
}
export const coalPerHour = s => (s.generator.on ? [0, 1, 1.8, 2.8][s.generator.power] * (s.day === 20 ? 2 : 1) + (s.generator.overdrive ? 0.3 : 0) : 0);

function canPay(s, cost) { return Object.entries(cost).every(([key, value]) => s.resources[key] >= value); }
function pay(s, cost) { for (const [key, value] of Object.entries(cost)) s.resources[key] = round(s.resources[key] - value); }
function note(s, message) { s.message = message; s.journal.unshift(`第 ${s.day} 天：${message}`); s.journal.length = Math.min(20, s.journal.length); }
function updateExtremes(s) { s.hope = cap(round(s.hope)); s.discontent = cap(round(s.discontent)); s.lowestHope = Math.min(s.lowestHope, s.hope); s.highestDiscontent = Math.max(s.highestDiscontent, s.discontent); }
function result(ok, message) { return { ok, message }; }
const eventPriority = { riotUltimatum: 0, despair: 1, exodus: 2, foodRiot: 3, healthcareProtest: 3, coldHomesProtest: 3, protest: 4, refugees: 5, foodProblem: 5, healthcareProblem: 5, healthcareOverload: 5, housingProblem: 5, coldHomes: 5, leavingTalk: 6 };
function eventState(s) {
  s.eventState ??= { seen: [], foodShortageDays: 0, untreatedSickDays: 0, coldHomesDays: 0, homelessDays: 0 };
  s.eventState.seen ??= [];
  return s.eventState;
}
function seenEvent(s, id) { return eventState(s).seen.includes(id); }
function queueOnce(s, id) {
  if (seenEvent(s, id)) return;
  eventState(s).seen.push(id);
  queueEvent(s, id);
}
function queueEvent(s, id) { if (s.event !== id && !s.eventQueue.includes(id)) s.eventQueue.push(id); }
function showNextEvent(s, allowPaused = false) {
  if (s.event || s.mode !== 'playing' || (!allowPaused && s.speed === 0)) return;
  s.eventQueue = s.eventQueue.filter(id => id !== 'despair' || s.social.despairDeadline !== null).filter(id => id !== 'riotUltimatum' || s.social.riotDeadline !== null).filter(id => id !== 'leavingTalk' || s.social.exodusState !== 'none').filter(id => id !== 'protest' || s.discontent >= 80);
  s.eventQueue.sort((a, b) => (eventPriority[a] ?? 5) - (eventPriority[b] ?? 5));
  s.event = s.eventQueue.shift() ?? null;
}
function syncSocial(s) {
  const c = s.social;
  if (c.riotDeadline !== null && s.discontent < 75) {
    c.riotDeadline = null; c.aftermathHours = 24; note(s, '居民撤回最后通牒，城中仍留有余波。');
  }
  if (c.despairDeadline !== null && s.hope >= 15) {
    c.despairDeadline = null; note(s, '离城的人群暂时放下了行囊。');
  }
  if (s.discontent >= 100 && c.riotDeadline === null && c.aftermathHours === 0) {
    c.riotDeadline = 48; c.riotEver = true; queueEvent(s, 'riotUltimatum'); note(s, '城市发出 48 小时最后通牒！');
  }
  const previousRiot = c.riotState;
  c.riotState = c.riotDeadline !== null ? 'ultimatum' : s.discontent >= 95 ? 'warning' : s.discontent >= 80 ? 'protest' : 'none';
  if (previousRiot === 'none' && (c.riotState === 'protest' || c.riotState === 'warning')) queueEvent(s, 'protest');
  if (s.hope === 0 && c.despairDeadline === null && !c.massExodus) {
    c.despairDeadline = 24; queueEvent(s, 'despair'); note(s, '城门前出现离城人群，只有 24 小时可以挽回。');
  }
  const previousExodus = c.exodusState;
  c.exodusState = c.despairDeadline !== null ? 'despair' : c.lowHopeHours >= 6 && s.hope <= 10 ? 'active' : c.lowHopeHours >= 6 && s.hope < 20 ? 'warning' : 'none';
  if (previousExodus === 'none' && (c.exodusState === 'warning' || c.exodusState === 'active')) {
    c.leavingIntent = Math.min(s.population, Math.max(c.leavingIntent, Math.ceil(s.population * 0.1)));
    queueEvent(s, 'leavingTalk');
  }
}
function flee(s, count) {
  count = Math.min(s.population, Math.max(0, Math.floor(count)));
  if (!count) return;
  const before = s.population;
  const carried = {
    food: Math.min(round(s.resources.food * 0.15), round(count * 0.8)),
    wood: Math.min(round(s.resources.wood * 0.1), round(count * 0.3)),
    coal: Math.min(round(s.resources.coal * 0.05), round(count * 0.5)),
  };
  for (const [key, value] of Object.entries(carried)) s.resources[key] = round(s.resources[key] - value);
  s.population -= count;
  s.children = Math.max(0, s.children - Math.round(s.children * count / before));
  s.sick = Math.min(s.population, Math.max(0, s.sick - Math.round(s.sick * count / before)));
  normalizeStaffing(s);
  s.social.fled += count;
  s.social.leavingIntent = Math.max(0, round(s.social.leavingIntent - count));
  s.social.lastFlight = { count, ...carried };
  note(s, `${count} 人离开城市，带走了食物 ${carried.food}、木材 ${carried.wood}、煤炭 ${carried.coal}。`);
  queueEvent(s, 'exodus');
}
function tickSocial(s) {
  const c = s.social;
  if (c.aftermathHours > 0) c.aftermathHours--;
  if (c.riotDeadline !== null) {
    if (s.discontent < 75) syncSocial(s);
    else if (--c.riotDeadline <= 0) {
      c.rulerStatus = s.laws.includes('forcedWork') ? '被处决' : s.laws.includes('longShift') || s.laws.includes('childWork') ? '被推翻' : '被放逐';
      s.lossReason = 'riot'; s.mode = 'lost'; s.event = null; note(s, `最后通牒到期，执政者${c.rulerStatus}。`); return;
    }
  }
  if (c.despairDeadline !== null) {
    if (s.hope >= 15) syncSocial(s);
    else if (--c.despairDeadline <= 0) {
      c.despairDeadline = null; c.massExodus = true;
      flee(s, Math.max(c.leavingIntent, Math.ceil(s.population * 0.75)));
      if (s.population < 10) { s.lossReason = 'exodus'; s.mode = 'lost'; c.rulerStatus = '城市解体'; s.event = null; return; }
      s.hope = Math.max(s.hope, 5);
    }
  }
  if (s.hope < 20) c.lowHopeHours++;
  else c.lowHopeHours = 0;
  if (c.lowHopeHours >= 6) c.leavingIntent = Math.min(s.population, round(c.leavingIntent + (s.hope <= 10 ? 0.5 : 0.25)));
  else if (s.hope >= 20) c.leavingIntent = Math.max(0, round(c.leavingIntent - 0.5));
  syncSocial(s);
  if (s.hour === 6 && s.hope > 0 && s.hope <= 10 && c.leavingIntent >= 1) {
    const fraction = Math.min(0.15, 0.05 + (10 - s.hope) / 100 + (s.resources.food === 0 ? 0.02 : 0) + (housing(s) < s.population ? 0.02 : 0));
    flee(s, Math.min(Math.floor(c.leavingIntent), Math.ceil(s.population * fraction)));
  }
}

export function act(s, action) {
  if (action.type === 'confirmName' && s.mode === 'naming') {
    const name = typeof action.name === 'string' ? action.name.trim().replace(/\s+/g, ' ') : '';
    const length = Array.from(name).length;
    if (length < 2 || length > 12) return result(false, '执政者姓名须为 2～12 个字符。');
    if (typeof action.playerId !== 'string' || !action.playerId.trim()) return result(false, '无法确认玩家身份。');
    s.playerName = name; s.playerId = action.playerId; s.mode = 'intro';
    return result(true, `执政者 ${name}，请阅读开场记录。`);
  }
  if (action.type === 'start' && s.mode === 'intro') { s.mode = 'playing'; return result(true, s.message); }
  if (s.mode === 'naming') return result(false, '请先填写执政者姓名。');
  if (s.mode === 'intro') return result(false, '请先阅读开场记录。');
  if (s.mode !== 'playing') return result(false, '本局已结束，请重新开始。');
  if (s.event && action.type !== 'event') return result(false, '请先处理城市报告。');
  const i = action.index, b = s.slots[i];
  switch (action.type) {
    case 'build': {
      const def = BUILDINGS[action.building];
      if (!Number.isInteger(i) || i < 0 || i >= 24 || b || !def) return result(false, '无法在此建造。');
      if (ringOf(i) > s.generator.range) return result(false, '请先研究供暖范围。');
      if (def.law && !s.laws.includes(def.law)) return result(false, '需要先签署对应法令。');
      if (!canPay(s, def.cost)) return result(false, '材料不足。');
      pay(s, def.cost); s.slots[i] = { type: action.building, level: 1, workers: 0 };
      note(s, `建成${def.name}。`); return result(true, s.message);
    }
    case 'demolish': {
      if (!b) return result(false, '此处没有建筑。');
      s.resources.wood = Math.min(storageLimit(s), s.resources.wood + Math.floor((BUILDINGS[b.type].cost.wood || 0) / 3));
      note(s, `拆除了${BUILDINGS[b.type].name}，回收少量木材。`); s.slots[i] = null; return result(true, s.message);
    }
    case 'upgrade': {
      if (!b || b.level >= 3) return result(false, '无法继续升级。');
      const cost = { wood: 18 * b.level, steel: 5 * b.level };
      if (!canPay(s, cost)) return result(false, '升级材料不足。');
      pay(s, cost); b.level++; note(s, `${BUILDINGS[b.type].name}升至 ${b.level} 级。`); return result(true, s.message);
    }
    case 'staff': {
      normalizeStaffing(s);
      if (!b || !BUILDINGS[b.type].workers || !Number.isInteger(action.delta)) return result(false, '此建筑不需要工人。');
      const next = b.workers + action.delta;
      if (next < 0 || next > BUILDINGS[b.type].workers * b.level || (action.delta > 0 && availableWorkers(s) < action.delta)) return result(false, '没有足够的可用工人。');
      b.workers = next; return result(true, `${BUILDINGS[b.type].name}工人 ${next} 人。`);
    }
    case 'research': {
      const tech = RESEARCH[action.id];
      if (!tech || s.researched.includes(action.id) || (tech.requires && !s.researched.includes(tech.requires))) return result(false, '该研究暂不可用。');
      if (s.researchPoints < tech.points || !canPay(s, tech.cost)) return result(false, '研究点或材料不足。');
      pay(s, tech.cost); s.researchPoints -= tech.points; s.researched.push(action.id);
      if (action.id === 'range2') s.generator.range = 2;
      if (action.id === 'range3') s.generator.range = 3;
      if (action.id === 'power2') s.generator.power = 2;
      if (action.id === 'power3') s.generator.power = 3;
      note(s, `完成研究：${tech.name}。`); return result(true, s.message);
    }
    case 'law': {
      const law = LAWS[action.id];
      if (!law || s.laws.includes(action.id) || (law.excludes && s.laws.includes(law.excludes))) return result(false, '该法令不可签署。');
      if (s.lawDay === s.day) return result(false, '今天已签署一条法令。');
      s.laws.push(action.id); s.lawDay = s.day; s.hope += law.hope; s.discontent += law.discontent; updateExtremes(s);
      note(s, `签署法令：${law.name}。`); syncSocial(s); return result(true, s.message);
    }
    case 'relief': {
      if (s.hope > 20 || s.social.lastReliefDay === s.day) return result(false, '当前不能再次发放救济。');
      const cost = { food: 12, wood: 8 };
      if (!canPay(s, cost)) return result(false, '救济所需食物或木材不足。');
      pay(s, cost); s.social.lastReliefDay = s.day; s.hope += 6; s.discontent -= 2; updateExtremes(s);
      note(s, '发放救济，居民重新看见一点希望。'); syncSocial(s); return result(true, s.message);
    }
    case 'concession': {
      if (s.social.riotDeadline === null || s.social.lastConcessionDay === s.day) return result(false, '当前不能再次作出让步。');
      const cost = { food: 10, wood: 10 };
      if (!canPay(s, cost)) return result(false, '让步所需食物或木材不足。');
      pay(s, cost); s.social.lastConcessionDay = s.day; s.discontent -= 8; s.hope += 2; updateExtremes(s);
      note(s, '向抗议人群作出让步。'); syncSocial(s); return result(true, s.message);
    }
    case 'power': {
      if (action.on === false || (action.on === undefined && s.generator.on)) { s.generator.on = false; s.generator.manualOff = true; }
      else { s.generator.on = s.resources.coal > 0; s.generator.manualOff = false; }
      return result(true, s.generator.on ? '发电机运行中。' : '发电机已熄火。');
    }
    case 'overdrive': {
      s.generator.overdrive = !s.generator.overdrive;
      return result(true, s.generator.overdrive ? '超载已开启，注意压力。' : '超载已关闭。');
    }
    case 'event': {
      const eventId = s.event;
      const choice = EVENTS[eventId]?.choices[action.choice];
      if (!choice) return result(false, '请选择一项决定。');
      let effect = choice.effect;
      if (eventId === 'refugees') {
        const offer = ensureRefugees(s).offer;
        if (!offer) return result(false, '这批幸存者已经离开。');
        effect = action.choice === 0
          ? { population: offer.count, children: offer.children, sick: offer.sick, food: -offer.foodCost, hope: 4 }
          : { hope: -Math.min(8, 3 + Math.ceil(offer.count / 2)) };
      }
      const cost = Object.fromEntries(Object.entries(effect).filter(([key, value]) => key in s.resources && value < 0).map(([key, value]) => [key, -value]));
      if (!canPay(s, cost)) return result(false, '这个决定所需的物资不足。');
      for (const [key, value] of Object.entries(effect)) {
        if (key in s.resources) s.resources[key] = Math.max(0, round(s.resources[key] + value));
        else if (key === 'population' || key === 'children' || key === 'sick') s[key] = Math.max(0, s[key] + value);
        else s[key] = Math.max(0, s[key] + value);
      }
      if (eventId === 'refugees') {
        const r = ensureRefugees(s);
        if (action.choice === 0) r.arrivals++;
        r.offer = null;
      }
      normalizeStaffing(s);
      updateExtremes(s); s.event = null; note(s, `${EVENTS[eventId].title}：${choice.label}。`); syncSocial(s); showNextEvent(s); return result(true, s.message);
    }
    default: return result(false, '未知操作。');
  }
}

function daily(s) {
  const labor = Math.min(1, workforce(s) / Math.max(1, assigned(s)));
  const workers = s.slots.filter(b => b?.type === 'hunter').reduce((n, b) => n + b.workers, 0) * labor;
  if (s.day < 20) s.resources.food = Math.min(storageLimit(s), round(s.resources.food + workers * (s.day === 19 ? 0.7 : 1.8)));
  const need = s.population * (s.laws.includes('soup') ? 0.24 : 0.3);
  const missing = Math.max(0, need - s.resources.food);
  s.resources.food = Math.max(0, round(s.resources.food - need));
  const homes = s.slots.flatMap((b, i) => b?.type === 'house' ? [buildingHeat(s, i)] : []);
  const avgHeat = homes.length ? homes.reduce((a, b) => a + b, 0) / homes.length : -50;
  const exposed = Math.max(0, s.population - housing(s));
  const cold = Math.max(0, Math.ceil(s.population * Math.max(0, -avgHeat - 3) / 700));
  const childLaborSick = childLaborers(s) > 0 && avgHeat < -10 ? 1 : 0;
  const newSick = Math.ceil(exposed * 0.12) + cold + Math.ceil(missing * 0.6) + childLaborSick;
  const clinicWorkers = s.slots.filter(b => b?.type === 'clinic').reduce((n, b) => n + b.workers, 0);
  const treated = Math.min(s.sick + newSick, Math.floor(clinicWorkers * 0.8));
  s.sick = Math.min(s.population, s.sick + newSick - treated);
  s.frostbite += cold;
  const deaths = Math.min(s.sick, Math.max(0, Math.floor((s.sick - s.population * 0.27) / 5)) + Math.floor(missing / 8));
  s.sick -= deaths; s.population -= deaths; s.dead += deaths;
  normalizeStaffing(s);
  s.hope += (housing(s) >= s.population ? 1 : -2) - (missing ? 4 : 0) - (deaths ? deaths * 2 : 0) + (s.slots.some(b => b?.type === 'shelter') ? 2 : 0) - (s.laws.includes('forcedWork') ? 1 : 0) - (s.laws.includes('childWork') ? 1 : 0);
  s.discontent += (exposed ? 2 : -1) + (missing ? 5 : 0) + (s.laws.includes('longShift') ? 2 : 0) + (s.laws.includes('soup') ? 1 : 0) + (s.laws.includes('forcedWork') ? 2 : 0) + (s.laws.includes('childWork') ? 1 : 0) + (s.social.aftermathHours > 0 ? 2 : 0) + (s.social.riotDeadline !== null && s.laws.includes('longShift') ? 3 : 0);
  s.discontent -= s.slots.filter(b => b?.type === 'tavern' || b?.type === 'venue').reduce((n, b) => n + Math.min(b.workers, 3), 0);
  updateExtremes(s);

  // 条件事件：像《冰汽时代》一样，让城市当前状态自己生成问题，
  // 而不是按固定日期假设玩家已经建了某个建筑。
  const es = eventState(s);
  es.foodShortageDays = missing > 0 ? es.foodShortageDays + 1 : 0;
  es.untreatedSickDays = s.sick >= Math.max(4, Math.ceil(s.population * 0.12)) ? es.untreatedSickDays + 1 : 0;
  es.coldHomesDays = avgHeat < -15 ? es.coldHomesDays + 1 : 0;
  es.homelessDays = exposed > 0 ? es.homelessDays + 1 : 0;

  const hasClinic = s.slots.some(b => b?.type === 'clinic');
  const staffedClinic = s.slots.some(b => b?.type === 'clinic' && b.workers > 0);

  if (es.foodShortageDays >= 1) queueOnce(s, 'foodProblem');
  if (es.foodShortageDays >= 2) queueOnce(s, 'foodRiot');

  if (es.untreatedSickDays >= 1) queueOnce(s, hasClinic ? 'healthcareOverload' : 'healthcareProblem');
  if (es.untreatedSickDays >= 2 && (!hasClinic || !staffedClinic || s.sick >= Math.ceil(s.population * 0.18))) queueOnce(s, 'healthcareProtest');

  if (es.homelessDays >= 1) queueOnce(s, 'housingProblem');
  if (es.coldHomesDays >= 1) queueOnce(s, 'coldHomes');
  if (es.coldHomesDays >= 2) queueOnce(s, 'coldHomesProtest');

  if (s.hope < 20) s.social.leavingIntent = Math.min(s.population, round(s.social.leavingIntent + deaths * 2 + Math.ceil(missing / 4) + Math.ceil(exposed / 5)));
  if (deaths) note(s, `${deaths} 人未能撑过寒夜。`);
  else if (missing) note(s, '粮食不足，饥饿正在蔓延。');
  else note(s, '城市撑过了又一个寒夜。');
}

export function advanceHours(s, count = 1) {
  if (s.mode !== 'playing' || s.event) return 0;
  let moved = 0;
  for (let t = 0; t < count && s.mode === 'playing' && !s.event; t++) {
    const burn = coalPerHour(s);
    if (s.generator.on) {
      if (s.resources.coal >= burn) s.resources.coal = round(s.resources.coal - burn);
      else { s.resources.coal = 0; s.generator.on = false; note(s, '煤炭耗尽，发电机熄火！'); }
    }
    if (!s.generator.on && !s.generator.manualOff && s.resources.coal > 0) { s.generator.on = true; note(s, '发电机恢复运转。'); }
    s.generator.outage = s.generator.on ? 0 : s.generator.outage + 1;
    if (s.generator.overdrive) s.generator.stress = Math.min(100, s.generator.stress + 2.5);
    else s.generator.stress = Math.max(0, s.generator.stress - 2);
    if (s.generator.stress >= 100) { s.generator.overdrive = false; s.generator.on = false; s.generator.stress = 55; note(s, '超载引发故障，发电机停机！'); }
    const isWork = s.laws.includes('longShift') ? s.hour >= 6 && s.hour < 20 : s.hour >= 8 && s.hour < 18;
    if (isWork) {
      const labor = Math.min(1, workforce(s) / Math.max(1, assigned(s)));
      for (let i = 0; i < 24; i++) {
        const b = s.slots[i]; if (!b || !b.workers) continue;
        const outside = ['coal', 'saw', 'steel'].includes(b.type);
        if (outside && s.day === 20) continue;
        const rate = b.workers / BUILDINGS[b.type].workers * labor * (s.day === 19 && outside ? 0.5 : 1) * (outside && buildingHeat(s, i) < -35 ? 0.7 : 1) * (s.social.riotDeadline !== null ? 0.85 : s.social.riotState === 'warning' ? 0.93 : 1) * (s.laws.includes('forcedWork') ? 1.1 : 1);
        const key = { coal: 'coal', saw: 'wood', steel: 'steel', greenhouse: 'food' }[b.type];
        const amount = { coal: 5, saw: 3, steel: 1.8, greenhouse: buildingHeat(s, i) < -25 ? 0 : 2.2 }[b.type] || 0;
        if (key) s.resources[key] = Math.min(storageLimit(s), round(s.resources[key] + amount * rate * b.level * (b.type === 'coal' && s.researched.includes('coalEfficiency') ? 1.3 : 1)));
        if (b.type === 'workshop') s.researchPoints = round(s.researchPoints + rate * b.level);
      }
    }
    s.hour = (s.hour + 1) % 24; moved++;
    const dawn = s.hour === 6;
    const finalDawn = dawn && s.day === 20;
    if (dawn) {
      daily(s);
      if (!finalDawn) {
        s.day++;
        if (EVENTS[s.day]) queueEvent(s, s.day);
        maybeQueueRefugees(s);
      }
    }
    tickSocial(s);
    if (s.mode === 'lost') break;
    if (s.population <= 0 || (weather(s.day) <= -30 && s.generator.outage >= 12)) {
      s.mode = 'lost'; s.lossReason = s.population <= 0 ? 'population' : 'generator'; s.social.rulerStatus = '城市消亡'; note(s, '城市未能继续生存。'); break;
    }
    if (finalDawn) { s.mode = s.population > 0 && s.generator.on ? 'won' : 'lost'; if (s.mode === 'lost') s.lossReason = 'generator'; note(s, s.mode === 'won' ? '风暴终于过去，炉火仍在燃烧。' : '黎明没有来到。'); break; }
    showNextEvent(s, true);
  }
  return moved;
}

export function score(s) {
  return Math.round(s.population * 100 + s.resources.coal + s.resources.food + s.hope * 10 - s.dead * 50 - s.social.fled * 30 + (s.mode === 'won' ? 2000 : 0));
}
