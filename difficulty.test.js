import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, newGame, act, advanceHours, weather, coalPerHour, outdoorProductionMult, hunterFoodPerWorker, dailyFoodNeed, eventEffect, lawFor, score } from './game.js';

function begin(difficulty = 'mild') {
  const s = newGame();
  assert.equal(act(s, { type: 'confirmName', name: '测试执政者', playerId: 'test-id' }).ok, true);
  assert.equal(act(s, { type: 'start' }).ok, true);
  assert.equal(s.mode, 'difficulty');
  assert.equal(act(s, { type: 'selectDifficulty', difficulty }).ok, true);
  return s;
}
function ready(difficulty = 'mild') {
  const s = begin(difficulty);
  assert.equal(act(s, { type: 'tutorialChoice', needsTutorial: false }).ok, true);
  return s;
}
function atFinalDawn(population = 15) {
  const s = ready('extreme');
  s.day = 20; s.hour = 5; s.population = population; s.children = 0; s.sick = 0;
  s.generator.power = 3; s.generator.overdrive = true; s.generator.stress = 0;
  s.resources.coal = 1000; s.resources.food = 1000; s.hope = 100; s.discontent = 0;
  s.event = null; s.eventQueue = [];
  return s;
}

test('mode selection, opening bounds, immutable difficulty and tutorial gate', () => {
  for (const difficulty of ['mild', 'extreme']) {
    const opening = DIFFICULTIES[difficulty].opening;
    for (let i = 0; i < 30; i++) {
      const s = begin(difficulty);
      for (const key of ['population', 'sick', 'hope', 'discontent']) assert.ok(s[key] >= opening[key][0] && s[key] <= opening[key][1], `${difficulty} ${key}`);
      for (const key of ['coal', 'wood', 'steel', 'food']) assert.ok(s.resources[key] >= opening[key][0] && s.resources[key] <= opening[key][1], `${difficulty} ${key}`);
      assert.ok(s.children >= opening.minChildren);
      assert.equal(s.speed, 0);
      assert.equal(s.tutorialPromptSeen, false);
      assert.equal(advanceHours(s, 6), 0);
      assert.equal(act(s, { type: 'selectDifficulty', difficulty: 'mild' }).ok, false);
      assert.equal(act(s, { type: 'tutorialChoice', needsTutorial: i % 2 === 0 }).ok, true);
      assert.equal(act(s, { type: 'tutorialChoice', needsTutorial: false }).ok, false);
      assert.equal(s.difficulty, difficulty);
    }
  }
  const legacy = newGame(); delete legacy.difficulty;
  assert.equal(coalPerHour(legacy), 1);
  assert.equal(weather(1), -20);
});

test('extreme temperature, coal, outdoor work and storm rules', () => {
  assert.deepEqual(DIFFICULTIES.extreme.weather, [-30,-30,-40,-40,-50,-50,-60,-60,-70,-70,-80,-80,-90,-90,-100,-100,-110,-120,-130,-150]);
  const s = ready('extreme');
  assert.equal(weather(20, s.difficulty), -150);
  assert.equal(coalPerHour(s), 1.2);
  s.generator.range = 2; assert.equal(coalPerHour(s), 1.62);
  s.generator.range = 3; assert.equal(coalPerHour(s), 2.04);
  s.generator.overdrive = true; assert.equal(coalPerHour(s), 2.856);
  s.day = 20; assert.ok(Math.abs(coalPerHour(s) - 6.426) < 1e-9);
  for (const [day, factor, hunter] of [[16,1,1.8],[17,.7,1.26],[18,.5,.9],[19,.3,0],[20,0,0]]) {
    s.day = day;
    assert.equal(outdoorProductionMult(s), factor);
    assert.ok(Math.abs(hunterFoodPerWorker(s) - hunter) < 1e-9);
  }
  const mild = ready(); mild.day = 19;
  assert.equal(outdoorProductionMult(mild), .5);
  assert.equal(hunterFoodPerWorker(mild), .7);
  assert.equal(dailyFoodNeed(mild), mild.population * .3);
  const freshExtreme = ready('extreme');
  assert.equal(dailyFoodNeed(freshExtreme), freshExtreme.population * .36);
});

test('extreme outage, medical pressure and social thresholds', () => {
  const outage = ready('extreme');
  outage.generator.on = false; outage.generator.manualOff = true;
  assert.equal(advanceHours(outage, 3), 3);
  assert.equal(outage.mode, 'playing');
  assert.equal(advanceHours(outage, 1), 1);
  assert.equal(outage.mode, 'lost');
  assert.equal(outage.lossReason, 'generator');

  const mild = ready(), extreme = ready('extreme');
  for (const s of [mild, extreme]) {
    s.day = 3; s.hour = 5; s.population = 30; s.children = 6; s.sick = 0;
    s.resources.food = 0; s.resources.coal = 1000;
    s.hope = 70; s.discontent = 0; s.event = null; s.eventQueue = [];
    advanceHours(s, 1);
  }
  assert.ok(extreme.sick > mild.sick);
  assert.ok(extreme.hope < mild.hope);
  assert.ok(extreme.discontent > mild.discontent);

  const social = ready('extreme');
  social.hope = 25; social.discontent = 65;
  advanceHours(social, 1);
  assert.equal(social.social.lowHopeHours, 1);
  assert.equal(social.social.riotState, 'protest');
});

test('three refugee offers, event modifiers and law costs stay distinct', () => {
  const s = ready('extreme');
  assert.deepEqual(s.refugees.waves.map(w => [w.required, w.earliest >= 4 && w.latest <= 15]), [[true,true],[true,true],[true,true]]);
  s.refugees.offer = { count: 10, children: 2, sick: 2, foodCost: 18 };
  assert.deepEqual(eventEffect(s, 'refugees', 0), { population: 10, children: 2, sick: 2, food: -18, hope: 3 });
  assert.deepEqual(eventEffect(s, 'foodProblem', 0), { food: -17, hope: 2, discontent: -2 });
  assert.deepEqual(eventEffect(s, 'healthcareProblem', 2), { sick: 3, discontent: 6 });
  assert.equal(lawFor(s, 'soup').foodMult, .8);
  assert.equal(lawFor(s, 'soup').discontent, 5);
  assert.deepEqual(lawFor(s, 'strategicReserve').cost, { wood: 24, steel: 10 });
  assert.equal(lawFor(ready(), 'soup').discontent, 4);
});

test('extreme refugee waves remain guaranteed and rejection keeps the run alive', () => {
  const s = ready('extreme');
  s.resources.coal = 1000; s.resources.food = 1000;
  for (const wave of s.refugees.waves) {
    s.day = wave.earliest - 1; s.hour = 5; s.hope = 100; s.discontent = 0; s.sick = 0;
    s.event = null; s.eventQueue = [];
    advanceHours(s, 1);
    assert.equal(wave.done, true);
    assert.ok(s.refugees.offer?.count >= 5 && s.refugees.offer.count <= 12);
    s.event = 'refugees';
    assert.equal(act(s, { type: 'event', choice: 1 }).ok, true);
    assert.equal(s.mode, 'playing');
  }
  assert.equal(s.refugees.arrivals, 0);
});

test('extreme repeated survival problem stops after two offers spaced 72 hours apart', () => {
  const s = ready('extreme');
  for (const day of [2, 5, 8]) {
    s.day = day; s.hour = 5; s.event = null; s.eventQueue = [];
    s.resources.food = 0; s.resources.coal = 1000;
    s.hope = 100; s.discontent = 0; s.sick = 0;
    advanceHours(s, 1);
  }
  assert.equal(s.eventState.counts.foodProblem, 2);
});

test('extreme production applies to staffed mines and workshops', () => {
  const s = ready('extreme');
  s.day = 17; s.hour = 8; s.population = 32; s.children = 0; s.sick = 0;
  s.generator.power = 3; s.resources.coal = 100;
  s.slots[2] = { type: 'coal', level: 1, workers: 10 };
  s.slots[3] = { type: 'workshop', level: 1, workers: 5 };
  const burn = coalPerHour(s);
  advanceHours(s, 1);
  const afterBurn = Math.round((100 - burn) * 10) / 10;
  assert.equal(s.resources.coal, Math.round((afterBurn + 5 * .7 * .85) * 10) / 10);
  assert.equal(s.researchPoints, .9); // 0.85 research points, rounded to the game's 0.1 precision.
});

test('extreme final conditions and score', () => {
  const win = atFinalDawn(15); win.generator.finalStormOutageHours = 1;
  advanceHours(win, 1);
  assert.equal(win.mode, 'won');
  assert.equal(score(win), Math.round((win.population * 100 + win.resources.coal + win.resources.food + win.hope * 10 - win.dead * 50 - win.social.fled * 30 + 2000) * 1.5));
  const low = atFinalDawn(14); advanceHours(low, 1);
  assert.equal(low.mode, 'lost'); assert.equal(low.lossReason, 'survivors');
  const blackout = atFinalDawn(15); blackout.generator.finalStormOutageHours = 2; advanceHours(blackout, 1);
  assert.equal(blackout.mode, 'lost'); assert.equal(blackout.lossReason, 'stormOutage');
  const unrest = atFinalDawn(15); unrest.social.riotDeadline = 5; unrest.discontent = 70; advanceHours(unrest, 1);
  assert.equal(unrest.mode, 'lost'); assert.equal(unrest.lossReason, 'socialCrisis');
});
