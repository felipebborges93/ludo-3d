/** Web Audio procedural sound synthesizer - zero external audio assets. */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted = false;
  private musicTimer: number | null = null;
  private noteIdx = 0;

  private init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.35;
    this.sfxGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.07;
    this.musicGain.connect(this.ctx.destination);

    this.startBgm();
  }

  toggleMute(): boolean {
    this.init();
    this.isMuted = !this.isMuted;
    if (this.ctx) {
      if (this.sfxGain) this.sfxGain.gain.value = this.isMuted ? 0 : 0.35;
      if (this.musicGain) this.musicGain.gain.value = this.isMuted ? 0 : 0.07;
    }
    return this.isMuted;
  }

  get muted() {
    return this.isMuted;
  }

  // --- SFX Generators ---

  click() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);
    g.gain.setValueAtTime(0.3, t);
    g.gain.linearRampToValueAtTime(0.01, t + 0.04);
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  diceRoll() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // Series of 4 rapid click/rattle clicks
    for (let i = 0; i < 5; i++) {
      const dt = t + i * 0.11 + Math.random() * 0.04;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300 + Math.random() * 300, dt);
      g.gain.setValueAtTime(0.25, dt);
      g.gain.exponentialRampToValueAtTime(0.01, dt + 0.04);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(dt);
      osc.stop(dt + 0.05);
    }
  }

  hop() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.12);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  trip() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.linearRampToValueAtTime(140, t + 0.25);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.28);
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  capture() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    // Cartoon whistle down + low pop
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.35);
    g.gain.setValueAtTime(0.4, t);
    g.gain.linearRampToValueAtTime(0.01, t + 0.4);
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.start(t);
    osc.stop(t + 0.42);
  }

  finish() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const dt = this.ctx!.currentTime + i * 0.1;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, dt);
      g.gain.setValueAtTime(0.3, dt);
      g.gain.exponentialRampToValueAtTime(0.01, dt + 0.35);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(dt);
      osc.stop(dt + 0.4);
    });
  }

  win() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const fanfare = [
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.15 },
      { f: 783.99, d: 0.15 },
      { f: 1046.5, d: 0.4 },
      { f: 880.0, d: 0.2 },
      { f: 1046.5, d: 0.6 },
    ];
    let offset = 0;
    fanfare.forEach(({ f, d }) => {
      const dt = this.ctx!.currentTime + offset;
      offset += d;
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, dt);
      g.gain.setValueAtTime(0.4, dt);
      g.gain.exponentialRampToValueAtTime(0.01, dt + d * 0.95);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(dt);
      osc.stop(dt + d);
    });
  }

  // --- Procedural BGM (Plucked Pentatonic Lullaby/Tune) ---

  private startBgm() {
    if (this.musicTimer) return;
    // C Major Pentatonic: C4, D4, E4, G4, A4, C5
    const melody = [
      261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 329.63,
      392.0, 440.0, 523.25, 440.0, 392.0, 329.63, 261.63, 293.66,
    ];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const freq = melody[this.noteIdx % melody.length];
      this.noteIdx++;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.005, t + 0.35);
      osc.connect(g);
      g.connect(this.musicGain!);
      osc.start(t);
      osc.stop(t + 0.38);
    }, 380);
  }
}

export const sound = new SoundSystem();
