// Procedural Web Audio API Sound Effects Engine for Cricket Ascend Arcade

class CricketAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try {
      this.muted = localStorage.getItem('ca_audio_muted') === '1';
    } catch {}
  }

  ensureContext() {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(val) {
    this.muted = Boolean(val);
    try {
      localStorage.setItem('ca_audio_muted', this.muted ? '1' : '0');
    } catch {}
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  makeNoiseBuffer(ctx, durationSec) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  playUiTick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  playDeliveryWhoosh() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer(ctx, 0.22);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + 0.14);
    filter.Q.value = 1.8;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
  }

  playPitchBounce() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.085);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  playBatCrack(quality = 'Perfect') {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const isSweet = quality === 'Perfect';
    const isSlight = quality.includes('Slightly');

    // Sharp willow crack noise burst
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer(ctx, 0.09);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(isSweet ? 1950 : isSlight ? 1450 : 950, now);
    bp.Q.value = isSweet ? 2.4 : 1.4;

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(isSweet ? 0.42 : isSlight ? 0.24 : 0.14, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    src.connect(bp).connect(nGain).connect(ctx.destination);
    src.start(now);

    // Warm willow thump body
    const osc = ctx.createOscillator();
    const oGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isSweet ? 320 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.075);
    oGain.gain.setValueAtTime(isSweet ? 0.28 : 0.14, now);
    oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(oGain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  playStumpsRattle() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Three timber clacks for stumps + bails tumbling
    [0, 0.045, 0.11, 0.19].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(740 - i * 110, now + offset);
      osc.frequency.exponentialRampToValueAtTime(220, now + offset + 0.06);
      gain.gain.setValueAtTime(0.22 - i * 0.03, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.075);
    });
  }

  playCrowdCheer(intensity = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = intensity >= 1.5 ? 1.55 : 0.95;
    const src = ctx.createBufferSource();
    src.buffer = this.makeNoiseBuffer(ctx, dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(680, now);
    filter.frequency.linearRampToValueAtTime(1150, now + 0.28);
    filter.frequency.linearRampToValueAtTime(620, now + dur);
    filter.Q.value = 0.7;

    const gain = ctx.createGain();
    const peak = Math.min(0.28, 0.14 * intensity);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
  }
}

export const cricketAudio = new CricketAudioEngine();
