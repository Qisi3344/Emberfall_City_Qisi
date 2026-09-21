import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENTS, RESEARCH, newGame, act, advanceHours, weather, ringOf, housing, availableWorkers, childLaborers, lawState, lawVisibility, score } from './game.js';
const start = s => {
  assert.equal(act(s, { type: 'confirmName', name: '测试执政者', playerId: 'test-player-id' }).ok, true);
  assert.equal(act(s, { type: 'start' }).ok, true);
};

test('naming gates the opening and records a stable identity', () => {
  const s = newGame();
  assert.equal(s.mode, 'naming');
  assert.equal(act(s, { type: 'start' }).ok, false);
  assert.equal(act(s, { type: 'confirmName', name: '狼', playerId: 'test-player-id' }).ok, false);
  assert.equal(act(s, { type: 'confirmName', name: 'a'.repeat(13), playerId: 'test-player-id' }).ok, false);
  assert.equal(act(s, { type: 'confirmName', name: '小狼', playerId: '' }).ok, false);
  assert.equal(act(s, { type: 'confirmName', name: '  小狼  ', playerId: 'test-player-id' }).ok, true);
  assert.equal(s.mode, 'intro');
  assert.equal(s.playerName, '小狼');
  assert.equal(s.playerId, 'test-player-id');
  assert.equal(act(s, { type: 'start' }).ok, true);
  assert.equal(s.mode, 'playing');
});

test('city decisions, ring unlocks, and a complete 20-day run', () => {
  const s = newGame();
  s.population = 30; s.initialPopulation = 30; s.children = 6; s.sick = 0;
  const doAction = action => assert.equal(act(s, action).ok, true, JSON.stringify(action));
  const releaseWorkers = index => {
    const count = s.slots[index]?.workers || 0;
    if (count) doAction({ type: 'staff', index, delta: -count });
  };
  const canResearch = id => s.researchPoints >= RESEARCH[id].points && Object.entries(RESEARCH[id].cost).every(([key, value]) => s.resources[key] >= value);
  start(s);
  doAction({ type: 'power', on: false });
  advanceHours(s, 1);
  assert.equal(s.generator.on, false);
  doAction({ type: 'power', on: true });
  assert.equal(s.slots.length, 24);
  assert.deepEqual([0, 5, 6, 13, 14, 23].map(ringOf), [1, 1, 2, 2, 3, 3]);
  assert.equal(act(s, { type: 'build', index: 6, building: 'coal' }).ok, false);
  doAction({ type: 'build', index: 2, building: 'coal' });
  doAction({ type: 'build', index: 3, building: 'hunter' });
  doAction({ type: 'build', index: 4, building: 'workshop' });
  doAction({ type: 'build', index: 5, building: 'saw' });
  doAction({ type: 'staff', index: 2, delta: 10 });
  doAction({ type: 'staff', index: 3, delta: 9 });
  doAction({ type: 'staff', index: 4, delta: 5 });
  assert.equal(housing(s), 30);
  let unlocked2 = false, unlocked3 = false, sawStaffed = false, huntersRestored = false, houseBuilt = false, clinicBuilt = false, secondMine = false;
  for (let hour = 0; hour < 24 * 21 && s.mode === 'playing'; hour++) {
    if (s.event) doAction({ type: 'event', choice: s.event === 6 ? 0 : 0 });
    if (s.day >= 3 && !s.laws.includes('soup')) doAction({ type: 'law', id: 'soup' });
    if (!unlocked2 && canResearch('range2')) {
      doAction({ type: 'research', id: 'range2' }); unlocked2 = true;
      doAction({ type: 'build', index: 6, building: 'steel' });
      doAction({ type: 'staff', index: 3, delta: -5 });
      doAction({ type: 'staff', index: 6, delta: 5 });
    }
    if (unlocked2 && !sawStaffed && s.day >= 6) {
      doAction({ type: 'staff', index: 5, delta: 5 }); sawStaffed = true;
    }
    if (sawStaffed && !huntersRestored && s.day >= 6) { doAction({ type: 'staff', index: 3, delta: 3 }); huntersRestored = true; }
    if (!houseBuilt && s.day >= 6 && s.resources.wood >= 24) { doAction({ type: 'build', index: 7, building: 'house' }); houseBuilt = true; }
    if (!clinicBuilt && s.day >= 10 && s.resources.wood >= 26 && s.resources.steel >= 5) {
      doAction({ type: 'build', index: 9, building: 'clinic' });
      releaseWorkers(6);
      const clinicStaff = Math.min(5, availableWorkers(s));
      if (clinicStaff) doAction({ type: 'staff', index: 9, delta: clinicStaff });
      clinicBuilt = true;
    }
    if (!secondMine && s.day >= 15 && s.resources.wood >= 30 && s.resources.steel >= 4) {
      doAction({ type: 'build', index: 8, building: 'coal' });
      releaseWorkers(4);
      releaseWorkers(5);
      const mineStaff = Math.min(10, availableWorkers(s));
      if (mineStaff) doAction({ type: 'staff', index: 8, delta: mineStaff });
      secondMine = true;
    }
    if (unlocked2 && !s.researched.includes('power2') && canResearch('power2')) doAction({ type: 'research', id: 'power2' });
    if (unlocked2 && !unlocked3 && canResearch('range3')) { doAction({ type: 'research', id: 'range3' }); unlocked3 = true; }
    if (unlocked3 && !s.researched.includes('power3') && canResearch('power3')) doAction({ type: 'research', id: 'power3' });
    advanceHours(s, 1);
  }
  assert.equal(unlocked2, true);
  assert.equal(unlocked3, true, JSON.stringify({ day: s.day, hour: s.hour, mode: s.mode, resources: s.resources, population: s.population, sick: s.sick, researchPoints: s.researchPoints, hope: s.hope, discontent: s.discontent, researched: s.researched }));
  assert.equal(s.day, 20);
  assert.equal(weather(20), -120);
  assert.equal(s.mode, 'won', JSON.stringify({ day: s.day, hour: s.hour, resources: s.resources, population: s.population, sick: s.sick, hope: s.hope, discontent: s.discontent, generator: s.generator, researched: s.researched }));
  assert.ok(s.population > 0);
  assert.ok(score(s) > 0);
});

test('an unfueled city reaches the loss screen', () => {
  const s = newGame();
  start(s);
  s.resources.coal = 1;
  advanceHours(s, 72);
  assert.equal(s.mode, 'lost');
  assert.ok(s.generator.outage >= 12);
});

test('hope causes a staged departure and capped resource loss', () => {
  const s = newGame();
  start(s);
  s.hope = 5;
  advanceHours(s, 6);
  assert.equal(s.social.exodusState, 'active');
  assert.equal(s.event, 'leavingTalk');
  act(s, { type: 'event', choice: 1 });
  const before = { ...s.resources };
  advanceHours(s, 18);
  assert.ok(s.social.fled > 0);
  assert.equal(s.event, 'exodus');
  assert.equal(s.population, s.initialPopulation - s.social.fled);
  assert.ok(s.social.lastFlight.food <= s.social.lastFlight.count * 0.8);
  assert.ok(s.resources.wood <= before.wood);
  assert.equal(score(s), Math.round(s.population * 100 + s.resources.coal + s.resources.food + s.hope * 10 - s.dead * 50 - s.social.fled * 30));
});

test('simultaneous crises prioritize riot and both can be recovered', () => {
  const s = newGame();
  start(s);
  s.hope = 0; s.discontent = 100;
  advanceHours(s, 1);
  assert.equal(s.event, 'riotUltimatum');
  assert.equal(s.social.riotDeadline, 48);
  assert.equal(s.social.despairDeadline, 24);
  act(s, { type: 'event', choice: 1 });
  assert.equal(s.event, 'despair');
  act(s, { type: 'event', choice: 0 });
  assert.equal(s.social.despairDeadline, null);
  s.discontent = 74;
  advanceHours(s, 1);
  assert.equal(s.social.riotDeadline, null);
  assert.equal(s.social.aftermathHours, 24);
  assert.equal(s.mode, 'playing');
});

test('ignored ultimatum removes the ruler after 48 hours', () => {
  const s = newGame();
  start(s);
  s.discontent = 100;
  advanceHours(s, 1);
  act(s, { type: 'event', choice: 1 });
  for (let i = 0; i < 50 && s.mode === 'playing'; i++) {
    if (s.event) act(s, { type: 'event', choice: 1 });
    advanceHours(s, 1);
  }
  assert.equal(s.mode, 'lost');
  assert.equal(s.lossReason, 'riot');
  assert.equal(s.social.rulerStatus, '被放逐');
});

test('unresolved despair can dissolve a small city after 24 hours', () => {
  const s = newGame();
  start(s);
  s.hope = 0;
  advanceHours(s, 1);
  assert.equal(s.event, 'despair');
  act(s, { type: 'event', choice: 1 });
  for (let i = 0; i < 26 && s.mode === 'playing'; i++) {
    if (s.event) act(s, { type: 'event', choice: 0 });
    advanceHours(s, 1);
  }
  assert.equal(s.social.massExodus, true);
  assert.equal(s.lossReason, 'exodus');
  assert.equal(s.social.rulerStatus, '城市解体');
});


test('leaving intent does not remove workers and staffing recovers after sickness', () => {
  const s = newGame();
  start(s);
  s.social.leavingIntent = 8;
  assert.equal(availableWorkers(s), s.population - s.children - s.sick, '想离城但尚未离城的人仍应属于劳动力');

  assert.equal(act(s, { type: 'build', index: 2, building: 'hunter' }).ok, true);
  assert.equal(act(s, { type: 'build', index: 3, building: 'clinic' }).ok, true);
  assert.equal(act(s, { type: 'staff', index: 2, delta: 10 }).ok, true);

  s.sick = 8;
  assert.equal(act(s, { type: 'staff', index: 2, delta: -10 }).ok, true);
  assert.ok(availableWorkers(s) > 0);
  assert.equal(act(s, { type: 'staff', index: 3, delta: 5 }).ok, true, '撤回其他岗位后应能给医务所重新派人');
});


test('state-driven survival events only appear when their conditions exist', () => {
  const s = newGame();
  start(s);

  // Day 3 itself should no longer force a medical/cold event.
  while (s.day < 3 && s.mode === 'playing') {
    if (s.event) act(s, { type: 'event', choice: 0 });
    advanceHours(s, 1);
  }
  assert.notEqual(s.event, 3);

  // A real food shortage should create the food problem.
  s.resources.food = 0;
  while (s.hour !== 5 && s.mode === 'playing') {
    if (s.event) act(s, { type: 'event', choice: 0 });
    advanceHours(s, 1);
  }
  advanceHours(s, 1); // dawn -> daily()
  assert.ok(s.event === 'foodProblem' || s.eventQueue.includes('foodProblem'));

  // Use a fresh city so the shortage cannot consume the one-time healthcare event.
  const medical = newGame();
  start(medical);
  medical.resources.food = 200;
  medical.sick = Math.max(5, Math.ceil(medical.population * 0.15));
  while (medical.hour !== 5 && medical.mode === 'playing') advanceHours(medical, 1);
  advanceHours(medical, 1);
  assert.ok(medical.event === 'healthcareProblem' || medical.eventQueue.includes('healthcareProblem'));
});


test('opening population and refugee waves are randomized within safe bounds', () => {
  for (let n = 0; n < 30; n++) {
    const s = newGame();
    assert.ok(s.population >= 22 && s.population <= 28);
    assert.equal(s.initialPopulation, s.population);
    assert.ok(s.children >= 3 && s.children < s.population);
    assert.ok(s.sick >= 0 && s.sick <= 2);
    assert.ok(s.refugees.waves.length >= 1 && s.refugees.waves.length <= 3);
    assert.ok(s.refugees.waves[0].earliest >= 5 && s.refugees.waves[0].earliest <= 8);
    assert.equal(s.refugees.waves[0].required, true);
  }
});

test('first refugee wave is guaranteed and accepts a dynamic 2-10 person group', () => {
  const s = newGame();
  start(s);
  s.resources.coal = 999;
  s.resources.food = 999;
  s.hope = 70;
  s.discontent = 10;

  for (let i = 0; i < 24 * 9 && s.mode === 'playing' && s.event !== 'refugees'; i++) {
    if (s.event) act(s, { type: 'event', choice: 0 });
    advanceHours(s, 1);
  }

  assert.equal(s.event, 'refugees');
  assert.ok(s.refugees.offer.count >= 2 && s.refugees.offer.count <= 10);
  const before = s.population;
  const offer = { ...s.refugees.offer };
  assert.equal(act(s, { type: 'event', choice: 0 }).ok, true);
  assert.equal(s.population, before + offer.count);
  assert.equal(s.refugees.arrivals, 1);
  assert.equal(s.refugees.offer, null);
});


test('child labor scales with actual children instead of granting a flat three workers', () => {
  const s = newGame();
  start(s);
  s.children = 1;
  s.day = 2;
  const before = availableWorkers(s);
  assert.equal(act(s, { type: 'law', id: 'childWork' }).ok, true);
  assert.equal(childLaborers(s), 1);
  assert.equal(availableWorkers(s), before + 1);

  s.children = 0;
  assert.equal(childLaborers(s), 0);
  assert.equal(availableWorkers(s), s.population - s.sick);
});

test('child labor carries a recurring social cost and extra cold sickness risk', () => {
  const s = newGame();
  start(s);
  s.children = 3;
  s.sick = 0;
  s.day = 2;
  s.resources.food = 999;
  s.hope = 70;
  s.discontent = 10;
  assert.equal(act(s, { type: 'law', id: 'childWork' }).ok, true);

  const hopeAfterLaw = s.hope;
  const discontentAfterLaw = s.discontent;

  while (s.hour !== 5 && s.mode === 'playing') {
    if (s.event) act(s, { type: 'event', choice: 0 });
    advanceHours(s, 1);
  }
  advanceHours(s, 1);

  assert.ok(s.hope <= hopeAfterLaw, '儿童劳动应产生持续希望代价');
  assert.ok(s.discontent >= discontentAfterLaw, '儿童劳动应产生持续不满代价');
  assert.ok(s.sick >= 1, '严寒环境下儿童劳动应增加病患风险');
});


test('paused player actions queue social events without popping them until time advances', () => {
  const s = newGame();
  start(s);
  s.speed = 0;
  s.discontent = 79;

  assert.equal(act(s, { type: 'law', id: 'longShift' }).ok, true);
  assert.equal(s.event, null, '暂停状态下签署法令不应立即弹出事件');
  assert.ok(s.eventQueue.includes('protest'), '事件应进入队列等待时间继续');

  advanceHours(s, 1);
  assert.equal(s.event, 'protest', '手动或自动推进时间后再显示排队事件');
});


test('paused event resolution does not chain into the next queued event', () => {
  const s = newGame();
  start(s);
  s.speed = 0;
  s.event = 'foodProblem';
  s.eventQueue.push('housingProblem');

  assert.equal(act(s, { type: 'event', choice: 0 }).ok, true);
  assert.equal(s.event, null, '暂停时处理完当前事件后不应自动弹出下一个');
  assert.ok(s.eventQueue.includes('housingProblem'));

  advanceHours(s, 1);
  assert.equal(s.event, 'housingProblem', '玩家主动推进时间后才显示排队事件');
});

test('paused queued events remain hidden across unrelated renders and actions', () => {
  const s = newGame();
  start(s);
  s.speed = 0;
  s.eventQueue.push('foodProblem');

  assert.equal(act(s, { type: 'build', index: 2, building: 'saw' }).ok, true);
  assert.equal(s.event, null);
  assert.ok(s.eventQueue.includes('foodProblem'));

  advanceHours(s, 1);
  assert.equal(s.event, 'foodProblem');
});


test('forced labor immediately raises discontent instead of lowering it', () => {
  const s = newGame();
  start(s);
  s.day = 10;
  s.laws.push('longShift', 'productionQuota');
  const before = s.discontent;
  assert.equal(act(s, { type: 'law', id: 'forcedWork' }).ok, true);
  assert.equal(s.discontent, before + 12);
});


test('survival event decisions require real tradeoffs instead of a free positive answer', () => {
  const ids = [10, 14, 17, 'foodProblem', 'foodRiot', 'healthcareProblem', 'healthcareOverload', 'healthcareProtest', 'housingProblem', 'coldHomes', 'coldHomesProtest', 'leavingTalk', 'protest', 'riotUltimatum'];
  for (const id of ids) {
    const choices = EVENTS[id].choices;
    assert.ok(choices.length >= 3, `${id} should offer at least three distinct responses`);
    for (const choice of choices) {
      const values = Object.values(choice.effect);
      assert.ok(values.some(value => value < 0) || values.some(value => value > 0 && ['sick','discontent'].some(key => (choice.effect[key] ?? 0) > 0)), `${id} / ${choice.label} should carry a cost or risk`);
    }
  }
});

test('resource-heavy event choices cannot be taken without the required stock', () => {
  const s = newGame();
  start(s);
  s.event = 'coldHomes';
  s.resources.coal = 0;
  const before = { hope: s.hope, discontent: s.discontent };
  const response = act(s, { type: 'event', choice: 0 });
  assert.equal(response.ok, false);
  assert.equal(s.event, 'coldHomes');
  assert.equal(s.hope, before.hope);
  assert.equal(s.discontent, before.discontent);
});


test('law tree reveals only the next layer and enforces day, prerequisite, and city-state locks', () => {
  const s = newGame();
  start(s);

  assert.equal(lawVisibility(s, 'soup'), 'visible');
  assert.equal(lawVisibility(s, 'strictRations'), 'shadow');
  assert.equal(lawVisibility(s, 'finalRations'), 'hidden');

  assert.equal(lawState(s, 'soup').status, 'available');
  assert.equal(act(s, { type: 'law', id: 'soup' }).ok, true);
  assert.equal(lawVisibility(s, 'strictRations'), 'visible');
  assert.equal(lawVisibility(s, 'finalRations'), 'shadow');

  s.lawDay = 0;
  s.day = 4;
  s.resources.food = 1;
  assert.equal(lawState(s, 'strictRations').status, 'available');
  assert.equal(act(s, { type: 'law', id: 'strictRations' }).ok, true);
  assert.equal(lawVisibility(s, 'finalRations'), 'visible');

  s.lawDay = 0;
  s.day = 14;
  assert.equal(lawState(s, 'finalRations').status, 'locked');
  s.day = 15;
  assert.equal(lawState(s, 'finalRations').status, 'available');
});

test('mutually exclusive child routes lock each other and deeper laws remain unavailable', () => {
  const s = newGame();
  start(s);
  s.day = 2;
  assert.equal(act(s, { type: 'law', id: 'shelter' }).ok, true);
  assert.equal(lawState(s, 'childWork').status, 'blocked');
  assert.equal(lawVisibility(s, 'apprenticeship'), 'visible');
  assert.equal(lawVisibility(s, 'protectEveryone'), 'shadow');
});

test('law costs are paid and strategic reserve expands storage', () => {
  const s = newGame();
  start(s);
  s.day = 13;
  s.laws.push('soup', 'careRations');
  s.sick = Math.ceil(s.population * 0.15);
  s.resources.wood = 50;
  s.resources.steel = 20;
  s.lawDay = 0;
  const before = { wood: s.resources.wood, steel: s.resources.steel };
  assert.equal(act(s, { type: 'law', id: 'strategicReserve' }).ok, true);
  assert.equal(s.resources.wood, before.wood - 20);
  assert.equal(s.resources.steel, before.steel - 8);
});
