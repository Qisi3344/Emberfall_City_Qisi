// 音频系统：BGM 按游戏状态自动切换（顺序淡入淡出，任一时刻只有一首在播），
// Master / BGM / SFX 三路独立音量，雪花粒子偏好也存这里供设置面板读写。
const PREFS_KEY = 'ember-city-audio-v1';
const FADE = 1.6;

export const BGM_TRACKS = {
  hearth: { src: './assets/bgm/bgm-hearth.mp3' },        // 炉火未熄 · 日常经营
  'cold-front': { src: './assets/bgm/bgm-cold-front.mp3' }, // 逼近寒潮 · 中期降温与资源压力
  'white-fall': { src: './assets/bgm/bgm-white-fall.mp3' }, // 白灾将至 · 最终风暴与严重危机
};

const SFX_FILES = {
  ui: './assets/sfx/ui-click.wav',
  place: './assets/sfx/build-place.wav',
  complete: './assets/sfx/build-complete.wav',
  stamp: './assets/sfx/law-stamp.wav',
  popup: './assets/sfx/event-popup.wav',
  alarm: './assets/sfx/warning-alarm.wav',
  furnace: './assets/sfx/furnace-start.wav',
  shutdown: './assets/sfx/furnace-shutdown.wav',
};

const DEFAULT_PREFS = { master: 0.8, bgm: 0.6, sfx: 0.8, snow: true };

function loadPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; }
  catch { return { ...DEFAULT_PREFS }; }
}

// 白灾将至：最终风暴（第 17 天起）、暴乱最后通牒或离城倒计时等严重社会危机。
export function bgmKeyFor(s) {
  if (!s || s.mode === 'won' || s.mode === 'lost') return null;
  const c = s.social || {};
  if (s.day >= 17 || (c.riotDeadline !== null && c.riotDeadline !== undefined) || (c.despairDeadline !== null && c.despairDeadline !== undefined)) return 'white-fall';
  if (s.day >= 8) return 'cold-front';
  return 'hearth';
}

class EmberAudio {
  constructor() {
    this.prefs = loadPrefs();
    this.ctx = null;
    this.gains = null;
    this.buffers = new Map();
    this.fetching = new Map();
    this.pending = null;
    this.current = null;
    this.nodes = null;
    this.snapshot = null;
  }
  ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    const master = this.ctx.createGain(); master.connect(this.ctx.destination);
    const bgm = this.ctx.createGain(); bgm.connect(master);
    const sfx = this.ctx.createGain(); sfx.connect(master);
    this.gains = { master, bgm, sfx };
    this.applyVolumes();
    return this.ctx;
  }
  applyVolumes() {
    if (!this.gains) return;
    this.gains.master.gain.value = this.prefs.master;
    this.gains.bgm.gain.value = this.prefs.bgm;
    this.gains.sfx.gain.value = this.prefs.sfx;
  }
  setVolume(key, value) {
    if (!['master', 'bgm', 'sfx'].includes(key)) return;
    this.prefs[key] = Math.max(0, Math.min(1, Number(value) || 0));
    this.persist(); this.applyVolumes();
  }
  setSnow(on) { this.prefs.snow = !!on; this.persist(); }
  persist() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs)); } catch {} }
  init() {
    const unlock = () => {
      const ctx = this.ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().then(() => this.applyPending()).catch(() => {});
      else this.applyPending();
      this.prefetch();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  }
  fetchBuffer(url) {
    if (this.buffers.has(url)) return Promise.resolve(this.buffers.get(url));
    if (this.fetching.has(url)) return this.fetching.get(url);
    const task = fetch(url).then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.status)))
      .then(data => this.ctx ? this.ctx.decodeAudioData(data) : null)
      .then(buf => { this.buffers.set(url, buf); return buf; })
      .catch(() => null)
      .finally(() => this.fetching.delete(url));
    this.fetching.set(url, task);
    return task;
  }
  prefetch() {
    if (!this.ensure()) return;
    Object.values(BGM_TRACKS).forEach(t => this.fetchBuffer(t.src));
    Object.values(SFX_FILES).forEach(url => this.fetchBuffer(url));
  }
  async play(name) {
    const url = SFX_FILES[name];
    const ctx = this.ensure();
    if (!url || !ctx || ctx.state !== 'running') return;
    const buf = await this.fetchBuffer(url);
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gains.sfx);
    src.start();
  }
  setBgm(key) { this.pending = key; this.applyPending(); }
  applyPending() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const key = this.pending;
    if (key === this.current) return;
    if (this.nodes) {
      const { source, gain } = this.nodes;
      this.nodes = null;
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0.0001, t + FADE);
      source.stop(t + FADE + 0.1);
    }
    this.current = key;
    if (!key || !BGM_TRACKS[key]) return;
    this.fetchBuffer(BGM_TRACKS[key]).then(buf => {
      if (!buf || !this.ctx || this.current !== key) return;
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const gain = ctx.createGain(); gain.gain.value = 0.0001;
      src.connect(gain); gain.connect(this.gains.bgm);
      src.start();
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + FADE);
      this.nodes = { source: src, gain };
    });
  }
  // 每次渲染后调用：对比上一帧状态，驱动 BGM 切换与状态类音效。
  observe(s) {
    this.setBgm(bgmKeyFor(s));
    const prev = this.snapshot;
    this.snapshot = { event: s.event, on: s.generator.on, laws: s.laws.length, buildings: s.slots.filter(Boolean).length };
    if (!prev) return;
    if (prev.on && !s.generator.on) this.play('shutdown');
    if (!prev.on && s.generator.on) this.play('furnace');
    if (s.event && s.event !== prev.event) this.play(s.event === 'riotUltimatum' || s.event === 'despair' ? 'alarm' : 'popup');
    if (s.laws.length > prev.laws) this.play('stamp');
    if (s.buildings > prev.buildings) this.play('complete');
  }
}

export const audio = new EmberAudio();
audio.init();
