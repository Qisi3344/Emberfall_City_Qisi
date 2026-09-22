import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApi, TOOLS } from './mcp-server.mjs';

async function withApi(run) {
  const dir = await mkdtemp(join(tmpdir(), 'ember-mcp-'));
  try { await run(createApi({ ranksPath: join(dir, 'ranks.json') })); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

test('mcp tools reuse the human rule engine with no bypass', async () => {
  await withApi(async api => {
    assert.ok(TOOLS.length >= 14);
    assert.ok(api.listTools().every(t => t.name && t.description && t.inputSchema));
    const bad = await api.call('create_ruler', { name: '狼' });
    assert.match(bad.content[0].text, /2～12/);
    const created = await api.call('create_ruler', { name: '测试智能体' });
    assert.match(created.content[0].text, /已上任/);
    const state = api.gameStateOf();
    assert.equal(state.mode, 'playing');
    assert.equal(state.playerName, '测试智能体');
    // 引擎校验：占用槽位不可建造、未解锁环不可建造、法令前置不满足不可建造
    const occupied = await api.call('build', { index: 0, building: 'coal' });
    assert.match(occupied.content[0].text, /无法在此建造/);
    const locked = await api.call('build', { index: 6, building: 'coal' });
    assert.match(locked.content[0].text, /请先研究供暖范围/);
    const gated = await api.call('build', { index: 3, building: 'shelter' });
    assert.match(gated.content[0].text, /需要先签署对应法令/);
    const built = await api.call('build', { index: 2, building: 'coal' });
    assert.match(built.content[0].text, /"ok": true/);
    assert.ok(api.gameStateOf().buildings.some(b => b.index === 2 && b.type === 'coal'));
    // 每日一条法令的限制同样生效
    assert.match((await api.call('sign_law', { id: 'soup' })).content[0].text, /"ok": true/);
    assert.match((await api.call('sign_law', { id: 'longShift' })).content[0].text, /今日已签署|今天已签署/);
    assert.match((await api.call('assign_workers', { index: 2, delta: 10 })).content[0].text, /"ok": true/);
    assert.match((await api.call('advance_time', { hours: 48 })).content[0].text, /推进了 48 小时/);
    assert.equal(api.gameStateOf().day, 3);
    await api.call('create_ruler', { name: '极寒智能体', difficulty: 'extreme' });
    assert.equal(api.gameStateOf().difficulty, 'extreme');
    assert.equal(api.gameStateOf().temperature, -30);
    assert.equal(api._state().tutorialPromptSeen, true);
  });
});

test('advance_time pauses on pending events and get_result records once', async () => {
  await withApi(async api => {
    await api.call('create_ruler', { name: '结算智能体' });
    await api.call('toggle_generator', { on: false });
    // 制造希望崩塌触发离城危机事件，时间推进必须停下等待事件处理
    api._state().hope = 0;
    const moved = await api.call('advance_time', { hours: 48 });
    assert.match(moved.content[0].text, /推进了 1 小时/);
    assert.equal(api.gameStateOf().event.id, 'despair');
    assert.match((await api.call('choose_event_option', { choice: 1 })).content[0].text, /"ok": true/);
    // 熄炉 + 危机导致失败结算，并只记录一次战绩
    let resultText = '';
    for (let i = 0; i < 14 && !resultText; i++) {
      const snapshot = api.gameStateOf();
      if (snapshot.event) await api.call('choose_event_option', { choice: Math.min(1, snapshot.event.choices.length - 1) });
      await api.call('advance_time', { hours: 48 });
      const result = await api.call('get_result', {});
      resultText = /"status": "(won|lost)"/.test(result.content[0].text) ? result.content[0].text : '';
    }
    assert.ok(resultText, '应在危机到期后进入结算');
    const final = api.gameStateOf();
    const ranks = JSON.parse(await readFile(api.ranksFile, 'utf8'));
    assert.equal(ranks.length, 1);
    assert.equal(ranks[0].playerName, '结算智能体');
    assert.equal(ranks[0].won, final.mode === 'won');
    assert.ok(typeof ranks[0].score === 'number');
    await api.call('get_result', {});
    const ranksAgain = JSON.parse(await readFile(api.ranksFile, 'utf8'));
    assert.equal(ranksAgain.length, 1, '重复查看结算不应重复记录');
  });
});
