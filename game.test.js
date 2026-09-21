import test from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH, newGame, act, advanceHours, weather, ringOf, housing, availableWorkers, score } from './game.js';
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
  const doAction = action => assert.equal(act(s, action).ok, true, JSON.stringify(action));
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
      doAction({ type: 'staff', index: 6, delta: -5 });
      doAction({ type: 'staff', index: 9, delta: Math.min(5, availableWorkers(s)) }); clinicBuilt = true;
    }
    if (!secondMine && s.day >= 15 && s.resources.wood >= 30 && s.resources.steel >= 4) {
      doAction({ type: 'build', index: 8, building: 'coal' });
      doAction({ type: 'staff', index: 4, delta: -5 });
      doAction({ type: 'staff', index: 5, delta: -5 });
      doAction({ type: 'staff', index: 8, delta: 10 }); secondMine = true;
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
  assert.equal(s.population, 30 - s.social.fled);
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
  assert.equal(availableWorkers(s), 24, '想离城但尚未离城的人仍应属于劳动力');

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

  // Clear the food event so we can inspect healthcare.
  if (s.event) act(s, { type: 'event', choice: 0 });
  s.eventQueue = [];
  s.sick = Math.max(5, Math.ceil(s.population * 0.15));
  while (s.hour !== 5 && s.mode === 'playing') advanceHours(s, 1);
  advanceHours(s, 1);
  assert.ok(s.event === 'healthcareProblem' || s.eventQueue.includes('healthcareProblem'));
});
