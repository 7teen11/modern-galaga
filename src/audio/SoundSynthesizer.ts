import { EventBus } from '../core/EventBus';

/**
 * Web Audio API Procedural Arcade Sound Synthesizer (Constitution Principle V - Original Assets).
 * Generates low-latency retro-modern laser blasts, hit thuds, explosion rumbles,
 * and power-up arpeggios without requiring external audio files.
 */
export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterVolume = 0.6;

  constructor(eventBus: EventBus, initialVolume = 0.6) {
    this.masterVolume = initialVolume;

    eventBus.on('PLAYER_INPUT', (e) => {
      if (e.isFiring) {
        // Sound is triggered directly by weapon fire or events
      }
    });

    eventBus.on('ENTITY_DAMAGED', (e) => {
      if (e.remainingHealth > 0) {
        this.playHitConfirm();
      }
    });

    eventBus.on('ENEMY_DESTROYED', (e) => {
      this.playExplosion(e.archetype === 'COMMANDER' ? 0.26 : 0.16);
    });

    eventBus.on('WEAPON_UPGRADED', () => {
      this.playPowerUp();
    });

    eventBus.on('PLAYER_LIFE_LOST', (e) => {
      if (e.isGameOver) {
        this.playGameOver();
      } else {
        this.playExplosion(0.35);
      }
    });
  }

  public setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  private ensureContext(): AudioContext | null {
    if (this.masterVolume <= 0.01) return null;
    if (typeof window === 'undefined') return null;

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
    return this.ctx;
  }

  public playLaser(tier = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = tier === 3 ? 'sawtooth' : 'square';
    osc.frequency.setValueAtTime(tier === 3 ? 980 : 860, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

    gain.gain.setValueAtTime(0.12 * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playHitConfirm(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.045);

    gain.gain.setValueAtTime(0.14 * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playExplosion(duration = 0.2): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + duration);

    gain.gain.setValueAtTime(0.22 * this.masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  public playPowerUp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.055;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.16 * this.masterVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.095);
    });
  }

  public playGameOver(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const notes = [392.0, 349.23, 329.63, 261.63]; // G4, F4, E4, C4
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.14;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18 * this.masterVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }
}

