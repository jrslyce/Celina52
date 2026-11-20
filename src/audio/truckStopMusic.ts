/**
 * Bouncy Southern Truck-Stop Honky-Tonk / Highway Diesel Boogie synthesizer!
 * Pure WebAudio with zero external audio failures, automatic ducking during cast voices,
 * UFO sci-fi bass mode, and final 30-second overdrive tempo!
 */
export class TruckStopMusic {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private timerId: number | null = null;
  private running = false;
  public muted = false;
  private ducked = false;
  private overdrive = false;
  private ufoMode = false;
  private step = 0;

  // Classic upbeat country-rock E / A / B7 walking bass & twangy lead notes
  private readonly bassLine = [
    82.41, 103.83, 123.47, 138.59, 82.41, 103.83, 123.47, 138.59,
    110.0, 138.59, 164.81, 185.0, 110.0, 138.59, 164.81, 146.83,
    82.41, 103.83, 123.47, 138.59, 123.47, 155.56, 185.0, 207.65,
    110.0, 138.59, 123.47, 110.0, 82.41, 98.0, 110.0, 123.47,
  ];
  private readonly twangRiff = [
    329.63, 0, 392.0, 440.0, 493.88, 0, 440.0, 392.0,
    440.0, 0, 523.25, 587.33, 659.25, 0, 587.33, 440.0,
    329.63, 392.0, 493.88, 0, 493.88, 587.33, 659.25, 0,
    587.33, 523.25, 493.88, 440.0, 392.0, 329.63, 0, 0,
  ];

  public start(): void {
    if (this.running) return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.16;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.running = true;
    this.scheduleLoop();
  }

  public stop(): void {
    this.running = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public setMuted(m: boolean): void {
    this.muted = m;
    this.updateVolume();
  }

  public setDucked(d: boolean): void {
    this.ducked = d;
    this.updateVolume();
  }

  public setOverdrive(o: boolean): void {
    this.overdrive = o;
  }

  public setUfoMode(u: boolean): void {
    this.ufoMode = u;
  }

  private updateVolume(): void {
    if (!this.masterGain || !this.ctx) return;
    const target = this.muted ? 0 : this.ducked ? 0.045 : 0.15;
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  private scheduleLoop(): void {
    if (!this.running) return;
    this.playStep();
    const stepMs = this.overdrive ? 155 : 195;
    this.timerId = window.setTimeout(() => this.scheduleLoop(), stepMs);
  }

  private playStep(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const idx = this.step % this.bassLine.length;
    this.step++;

    // 1. Walking Country Bass (or sci-fi synth bass if UFO is hovering!)
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = this.ufoMode ? 'sawtooth' : 'triangle';
    bassOsc.frequency.setValueAtTime(this.bassLine[idx] * (this.ufoMode ? 1.12 : 1.0), now);
    bassGain.gain.setValueAtTime(0.32, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    bassOsc.connect(bassGain).connect(this.masterGain);
    bassOsc.start(now);
    bassOsc.stop(now + 0.18);

    // 2. Twangy Honky-Tonk Guitar Pluck / UFO Plink
    const leadFreq = this.twangRiff[idx];
    if (leadFreq > 0) {
      const leadOsc = this.ctx.createOscillator();
      const leadGain = this.ctx.createGain();
      leadOsc.type = this.ufoMode ? 'sine' : 'square';
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = this.ufoMode ? 2400 : 1450;
      leadOsc.frequency.setValueAtTime(leadFreq * (this.ufoMode ? 1.25 : 1), now);
      leadGain.gain.setValueAtTime(0.11, now);
      leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      leadOsc.connect(filter).connect(leadGain).connect(this.masterGain);
      leadOsc.start(now);
      leadOsc.stop(now + 0.16);
    }

    // 3. Train-Beat Kick & Snare Hat
    if (idx % 2 === 0) {
      const kick = this.ctx.createOscillator();
      const kGain = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(125, now);
      kick.frequency.exponentialRampToValueAtTime(42, now + 0.08);
      kGain.gain.setValueAtTime(0.28, now);
      kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      kick.connect(kGain).connect(this.masterGain);
      kick.start(now);
      kick.stop(now + 0.1);
    } else {
      // Crisp brush snare chick
      const len = Math.floor(this.ctx.sampleRate * 0.045);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.12, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      noise.connect(hp).connect(nGain).connect(this.masterGain);
      noise.start(now);
    }
  }
}
