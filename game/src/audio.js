// All of Gobble Run's sound is synthesised with WebAudio — no audio files,
// nothing to load. A lazy AudioContext starts on the first user gesture
// (browsers refuse one before that), and every effect is a few oscillators
// and noise bursts shaped by hand: a gobble, a squawk, the farmer's alarm
// sting, and a plucky little banjo-ish loop while a run is on.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  ensure() {
    if (typeof window === 'undefined') return null; // headless: stay silent
    if (this.ctx === null) {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    }
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopMusic();
    return this.muted;
  }

  tone(freqFrom, freqTo, seconds, type = 'square', volume = 0.12, when = 0) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqFrom, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t0 + seconds);
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  noise(seconds, volume = 0.1, when = 0, lowpass = 1200) {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + when;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  }

  /** The turkey's jump gobble: two quick descending chirps. */
  gobble() {
    this.tone(880, 420, 0.09, 'square', 0.07);
    this.tone(990, 380, 0.1, 'square', 0.06, 0.07);
  }

  /** A happy chirp for corn and pie. */
  pop() {
    this.tone(620, 1240, 0.08, 'triangle', 0.12);
  }

  /** A chilli-pepper whoosh and rising zip. */
  zip() {
    this.noise(0.18, 0.08, 0, 2600);
    this.tone(300, 1400, 0.2, 'sawtooth', 0.05);
  }

  /** Hit by an oven, a knife or the farmer's net: a squawk and a thud. */
  squawk() {
    this.tone(1400, 300, 0.22, 'sawtooth', 0.13);
    this.noise(0.16, 0.12, 0, 700);
  }

  /** The moment the farmer spots the turkey: a two-note alarm. */
  sting() {
    this.tone(196, 196, 0.11, 'square', 0.13);
    this.tone(185, 185, 0.16, 'square', 0.13, 0.12);
  }

  /** The farmer, baffled, while he searches a hay bale. */
  hmm() {
    this.tone(220, 175, 0.16, 'triangle', 0.09);
    this.tone(196, 160, 0.2, 'triangle', 0.08, 0.22);
  }

  /** A soft wooden knock for clearing an obstacle by a whisker. */
  nearMiss() {
    this.tone(1500, 1500, 0.05, 'sine', 0.1);
    this.tone(1900, 1900, 0.06, 'sine', 0.08, 0.05);
  }

  jingle(escaped) {
    const notes = escaped ? [523, 659, 784, 1047, 784, 1047] : [392, 370, 349, 311];
    notes.forEach((freq, i) => this.tone(freq, freq, 0.22, 'triangle', 0.12, i * 0.16));
    if (escaped) this.noise(0.4, 0.05, 0.3, 4000);
  }

  /** A 16-step loop: bass on the beats, a plucked melody over it. */
  startMusic() {
    const ctx = this.ensure();
    if (!ctx || this.musicTimer !== null) return;
    const bass = [110, 0, 110, 0, 131, 0, 110, 0, 98, 0, 98, 0, 147, 0, 131, 0];
    const pluck = [440, 0, 523, 587, 0, 523, 440, 0, 392, 0, 440, 494, 523, 0, 0, 0];
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const i = this.musicStep % 16;
      if (bass[i]) this.tone(bass[i], bass[i], 0.16, 'triangle', 0.055);
      if (pluck[i]) this.tone(pluck[i], pluck[i], 0.1, 'square', 0.028);
      this.musicStep += 1;
    }, 138);
  }

  stopMusic() {
    if (this.musicTimer !== null) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicStep = 0;
  }
}
