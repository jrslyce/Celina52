import type { SimEvent } from '../sim/types';

export class SoundFx {
  private ctx: AudioContext | null = null;
  public muted = false;
  private lastScratchTime = 0;

  public unlock(): void {
    if (this.muted) return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(m: boolean): void {
    this.muted = m;
  }

  public handleEvents(events: SimEvent[]): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    for (const ev of events) {
      switch (ev.type) {
        case 'jug_pickup':
          this.playJugSloshPop(now, ev.value ?? 1);
          break;
        case 'jug_golden':
          this.playGoldenFanfare(now);
          break;
        case 'jug_cashin':
          this.playCashRegister(now);
          break;
        case 'player_punch':
          this.playWhoosh(now);
          break;
        case 'brawl_start':
        case 'trucker_fight':
          this.playAlertHorn(now);
          break;
        case 'brawl_hit':
        case 'alien_hit':
          this.playSlapstickHit(now);
          break;
        case 'brawl_win':
        case 'alien_defeat':
        case 'police_breakup':
          this.playVictoryChord(now);
          break;
        case 'lizard_jump':
          this.playBoing(now);
          break;
        case 'police_arrive':
          this.playPoliceSiren(now);
          break;
        case 'ufo_arrive':
          this.playUfoTheremin(now);
          break;
        case 'ufo_steal':
          this.playPop(now, 320, 780);
          break;
        case 'forklift_bump':
          this.playForkliftBeep(now);
          break;
        case 'round_end':
          this.playCashRegister(now);
          break;
      }
    }
  }

  /** Metallic coin scraping sound while scratching lotto tickets! */
  public playScratchScrape(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastScratchTime < 0.055) return;
    this.lastScratchTime = now;

    const len = Math.floor(this.ctx.sampleRate * 0.05);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(3200 + Math.random() * 900, now);
    bp.Q.value = 2.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    src.connect(bp).connect(gain).connect(this.ctx.destination);
    src.start(now);
  }

  public playJackpotWin(big = false): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const notes = big ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98] : [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.07);
      gain.gain.setValueAtTime(0.16, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.36);
      osc.connect(gain).connect(this.ctx!.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.38);
    });
  }

  public playDudBuzzer(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.linearRampToValueAtTime(125, now + 0.32);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  private playJugSloshPop(t: number, combo: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const base = 360 + Math.min(10, combo) * 42;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.65, t + 0.11);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  private playGoldenFanfare(t: number): void {
    if (!this.ctx) return;
    [587.33, 880, 1174.66].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.06);
      gain.gain.setValueAtTime(0.16, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.3);
      osc.connect(gain).connect(this.ctx!.destination);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.32);
    });
  }

  private playCashRegister(t: number): void {
    if (!this.ctx) return;
    [1318.5, 1760, 2093].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + idx * 0.055);
      gain.gain.setValueAtTime(0.14, t + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.055 + 0.42);
      osc.connect(gain).connect(this.ctx!.destination);
      osc.start(t + idx * 0.055);
      osc.stop(t + idx * 0.055 + 0.44);
    });
  }

  private playWhoosh(t: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.09);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  private playSlapstickHit(t: number): void {
    if (!this.ctx) return;
    // Punchy low thud + cartoon comic smack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.14);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  private playAlertHorn(t: number): void {
    if (!this.ctx) return;
    // Semi-truck air horn blast!
    for (const freq of [185, 233]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.48);
    }
  }

  private playPoliceSiren(t: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(640, t);
    osc.frequency.linearRampToValueAtTime(1180, t + 0.35);
    osc.frequency.linearRampToValueAtTime(640, t + 0.7);
    osc.frequency.linearRampToValueAtTime(1180, t + 1.05);
    gain.gain.setValueAtTime(0.09, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.15);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.18);
  }

  private playUfoTheremin(t: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.linearRampToValueAtTime(840, t + 0.45);
    osc.frequency.linearRampToValueAtTime(420, t + 0.95);

    lfo.frequency.value = 9.5;
    lfoGain.gain.value = 38;
    lfo.connect(lfoGain).connect(osc.frequency);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.05);

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 1.08);
    lfo.stop(t + 1.08);
  }

  private playBoing(t: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, t);
    osc.frequency.exponentialRampToValueAtTime(680, t + 0.24);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  private playForkliftBeep(t: number): void {
    if (!this.ctx) return;
    [0, 0.16].forEach((off) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(980, t + off);
      gain.gain.setValueAtTime(0.09, t + off);
      gain.gain.exponentialRampToValueAtTime(0.001, t + off + 0.1);
      osc.connect(gain).connect(this.ctx!.destination);
      osc.start(t + off);
      osc.stop(t + off + 0.11);
    });
  }

  private playPop(t: number, f0: number, f1: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + 0.15);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  private playVictoryChord(t: number): void {
    if (!this.ctx) return;
    [440, 554.37, 659.25, 880].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.05);
      gain.gain.setValueAtTime(0.15, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.42);
      osc.connect(gain).connect(this.ctx!.destination);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 0.45);
    });
  }
}
