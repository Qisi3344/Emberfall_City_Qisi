// 音频系统：BGM 使用 HTMLAudioElement 以兼容 iOS / 微信等移动端浏览器，
// SFX 使用 Web Audio。Master / BGM / SFX 三路独立音量。
const PREFS_KEY = 'ember-city-audio-v1';

export const BGM_TRACKS = {
  hearth: { src: './assets/bgm/bgm-hearth.mp3' },
  'cold-front': { src: './assets/bgm/bgm-cold-front.mp3' },
  'white-fall': { src: './assets/bgm/bgm-white-fall.mp3' },
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
    this.bgmEl = null;
    this.snapshot = null;
    this.unlocked = false;
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      this.ctx = new Ctx();
      const master = this.ctx.createGain(); master.connect(this.ctx.destination);
      const sfx = this.ctx.createGain(); sfx.connect(master);
      this.gains = { master, sfx };
      this.applyVolumes();
      return this.ctx;
    } catch (error) {
      console.warn('[EmberAudio] WebAudio init failed', error);
      return null;
    }
  }

  applyVolumes() {
    if (this.gains) {
      this.gains.master.gain.value = this.prefs.master;
      this.gains.sfx.gain.value = this.prefs.sfx;
    }
    if (this.bgmEl) this.bgmEl.volume = Math.max(0, Math.min(1, this.prefs.master * this.prefs.bgm));
  }

  setVolume(key, value) {
    if (!['master', 'bgm', 'sfx'].includes(key)) return;
    this.prefs[key] = Math.max(0, Math.min(1, Number(value) || 0));
    this.persist();
    this.applyVolumes();
    if (this.unlocked && this.pending && (!this.bgmEl || this.bgmEl.paused)) this.applyPending();
  }

  setSnow(on) { this.prefs.snow = !!on; this.persist(); }
  persist() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs)); } catch {} }

  // 必须从真实用户手势里调用。HTML audio 的 play() 立即执行，
  // 避免 iOS Safari / 微信内置浏览器在 await 之后丢失手势授权。
  unlock() {
    this.unlocked = true;
    this.applyPending();

    const ctx = this.ensure();
    if (ctx?.state === 'suspended') {
      ctx.resume().then(() => this.prefetchSfx()).catch(error => console.warn('[EmberAudio] AudioContext resume failed', error));
    } else {
      this.prefetchSfx();
    }
  }

  init() {
    const unlock = () => this.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.unlocked) {
        if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
        if (this.pending && (!this.bgmEl || this.bgmEl.paused)) this.applyPending();
      }
    });
  }

  fetchBuffer(url) {
    if (this.buffers.has(url)) return Promise.resolve(this.buffers.get(url));
    if (this.fetching.has(url)) return this.fetching.get(url);
    const task = fetch(url, { cache: 'force-cache' })
      .then(r => r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}: ${url}`)))
      .then(data => this.ctx ? this.ctx.decodeAudioData(data) : null)
      .then(buf => { if (buf) this.buffers.set(url, buf); return buf; })
      .catch(error => { console.warn('[EmberAudio] SFX load failed', error); return null; })
      .finally(() => this.fetching.delete(url));
    this.fetching.set(url, task);
    return task;
  }

  prefetchSfx() {
    if (!this.ensure()) return;
    Object.values(SFX_FILES).forEach(url => this.fetchBuffer(url));
  }

  async play(name) {
    const url = SFX_FILES[name];
    const ctx = this.ensure();
    if (!url || !ctx) return;
    if (ctx.state === 'suspended' && this.unlocked) {
      try { await ctx.resume(); } catch {}
    }
    if (ctx.state !== 'running') return;
    const buf = await this.fetchBuffer(url);
    if (!buf || !this.ctx || !this.gains) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gains.sfx);
    src.start();
  }

  setBgm(key) {
    this.pending = key;
    this.applyPending();
  }

  stopBgm() {
    if (this.bgmEl) {
      try { this.bgmEl.pause(); } catch {}
      this.bgmEl.src = '';
      this.bgmEl = null;
    }
    this.current = null;
  }

  applyPending() {
    if (!this.unlocked) return;
    const key = this.pending;

    if (!key || !BGM_TRACKS[key]) {
      this.stopBgm();
      return;
    }

    if (this.current === key && this.bgmEl) {
      this.applyVolumes();
      if (this.bgmEl.paused) {
        this.bgmEl.play().catch(error => console.warn('[EmberAudio] BGM resume blocked', error));
      }
      return;
    }

    if (this.bgmEl) {
      try { this.bgmEl.pause(); } catch {}
    }

    const el = new Audio(BGM_TRACKS[key].src);
    el.loop = true;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');
    this.bgmEl = el;
    this.current = key;
    this.applyVolumes();

    el.addEventListener('error', () => {
      console.warn('[EmberAudio] BGM load failed', key, el.error, el.currentSrc);
    }, { once: true });

    el.play().catch(error => {
      console.warn('[EmberAudio] BGM play blocked', key, error);
    });
  }

  observe(s) {
    this.setBgm(bgmKeyFor(s));
    const prev = this.snapshot;
    this.snapshot = { event: s.event, on: s.generator.on, laws: s.laws.length, buildings: s.slots.filter(Boolean).length };
    if (!prev) return;
    if (prev.on && !s.generator.on) this.play('shutdown');
    if (!prev.on && s.generator.on) this.play('furnace');
    if (s.event && s.event !== prev.event) this.play(s.event === 'riotUltimatum' || s.event === 'despair' ? 'alarm' : 'popup');
    if (s.laws.length > prev.laws) this.play('stamp');
    if (this.snapshot.buildings > prev.buildings) this.play('complete');
  }
}

export const audio = new EmberAudio();
audio.init();
