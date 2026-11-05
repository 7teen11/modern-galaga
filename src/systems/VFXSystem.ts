import { ObjectPool, Poolable, PoolMetrics } from '../ecs/Pool';
import { EventBus } from '../core/EventBus';
import { RenderSystem } from './RenderSystem';
import { GameSystem } from '../core/Game';
import { VisualQualityPreset } from '../services/StorageService';
import { EntityId } from '../ecs/Component';

export class PooledParticle implements Poolable {
  public active = false;
  public poolIndex = 0;
  public x = 0;
  public y = 0;
  public vx = 0;
  public vy = 0;
  public size = 3;
  public color = '#00f0ff';
  public alpha = 1.0;
  public currentLifetime = 0;
  public maxLifetime = 0.4;

  constructor(poolIndex: number) {
    this.poolIndex = poolIndex;
  }

  public reset(): void {
    this.x = -100;
    this.y = -100;
    this.vx = 0;
    this.vy = 0;
    this.size = 3;
    this.alpha = 1.0;
    this.currentLifetime = 0;
    this.maxLifetime = 0.4;
  }
}

/**
 * Neon Arcade Visual Feedback & Pooled Particle System (FR-016, SC-007, Principle I & IV).
 * - Pre-warmed ParticlePool (300 capacity, RECYCLE_OLDEST)
 * - Directional explosion sparks and pickup bursts
 * - Micro screen-shake strictly bounded to <0.2s duration with configurable intensity slider
 */
export class VFXSystem implements GameSystem {
  public static readonly PARTICLE_POOL_CAPACITY = 300;
  public static readonly MAX_SHAKE_DURATION_SEC = 0.16; // Strictly < 0.2s (FR-016)

  public readonly particlePool: ObjectPool<PooledParticle>;
  private readonly renderSystem: RenderSystem;
  private readonly playerId: EntityId;

  public screenShakeIntensityScale = 0.8; // 0.0 (disabled) to 1.0 (full)
  public reducedFlashEnabled = false;
  public qualityPreset: VisualQualityPreset = 'HIGH';

  private shakeTimer = 0;
  private shakeMagnitude = 0;

  constructor(eventBus: EventBus, renderSystem: RenderSystem, playerId: EntityId = 1) {
    this.renderSystem = renderSystem;
    this.playerId = playerId;

    // Pre-warm 300 particles upfront (Constitution Principle IV)
    this.particlePool = new ObjectPool<PooledParticle>(
      VFXSystem.PARTICLE_POOL_CAPACITY,
      (idx) => new PooledParticle(idx),
      'RECYCLE_OLDEST'
    );

    eventBus.on('VFX_SPAWN_TRIGGERED', (payload) => {
      this.spawnBurst(
        payload.x,
        payload.y,
        payload.particleCount,
        payload.color,
        payload.type === 'EXPLOSION' ? 220 : 130
      );

      if (payload.type === 'EXPLOSION') {
        this.triggerMicroShake(5.5, VFXSystem.MAX_SHAKE_DURATION_SEC);
      } else if (payload.type === 'HIT_SPARK' && payload.color === '#00f0ff') {
        this.triggerMicroShake(3.8, 0.12);
      }
    });

    // Trigger micro screen-shake on non-lethal player damage (FR-016, US3/AC1)
    eventBus.on('ENTITY_DAMAGED', (payload) => {
      if (payload.targetId === this.playerId) {
        this.triggerMicroShake(3.8, 0.12);
      }
    });
  }

  public setAccessibilityPreferences(
    shakeScale: number,
    reducedFlash: boolean,
    qualityPreset: VisualQualityPreset = 'HIGH'
  ): void {
    this.screenShakeIntensityScale = Math.max(0, Math.min(1, shakeScale));
    this.reducedFlashEnabled = reducedFlash;
    this.qualityPreset = qualityPreset;
    this.renderSystem.reducedFlash = reducedFlash;
    this.renderSystem.qualityPreset = qualityPreset;

    if (this.screenShakeIntensityScale === 0) {
      this.shakeTimer = 0;
      this.renderSystem.screenShakeOffsetX = 0;
      this.renderSystem.screenShakeOffsetY = 0;
    }
  }

  /**
   * Triggers a micro screen-shake strictly bounded to < 0.2 seconds (FR-016).
   */
  public triggerMicroShake(magnitude = 5.0, duration = 0.15): void {
    if (this.screenShakeIntensityScale <= 0.01) return;

    // Clamp duration strictly below 0.2s
    this.shakeTimer = Math.min(VFXSystem.MAX_SHAKE_DURATION_SEC, duration);
    this.shakeMagnitude = magnitude * this.screenShakeIntensityScale;
  }

  public spawnBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    maxSpeed = 200
  ): void {
    const scaledCount =
      this.qualityPreset === 'PERFORMANCE'
        ? Math.max(1, Math.ceil(count * 0.5))
        : count;
    const cappedCount = Math.min(40, scaledCount);
    for (let i = 0; i < cappedCount; i++) {
      const p = this.particlePool.acquire();
      if (!p) break;

      const angle = (Math.PI * 2 * i) / cappedCount + (Math.random() - 0.5) * 0.4;
      const speed = maxSpeed * (0.35 + Math.random() * 0.65);

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = color;
      p.size = 2 + Math.random() * 3;
      p.alpha = 1.0;
      p.currentLifetime = 0;
      p.maxLifetime = 0.22 + Math.random() * 0.26;
    }
  }

  public update(dt: number): void {
    // 1. Update pooled particles
    this.particlePool.forEachActive((p) => {
      p.currentLifetime += dt;
      if (p.currentLifetime >= p.maxLifetime) {
        this.particlePool.release(p);
        return;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.alpha = Math.max(0, 1 - p.currentLifetime / p.maxLifetime);
    });

    // 2. Update micro screen-shake (<0.2s)
    if (this.shakeTimer > 0 && this.screenShakeIntensityScale > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.shakeTimer > 0) {
        const decay = this.shakeTimer / VFXSystem.MAX_SHAKE_DURATION_SEC;
        const currentMag = this.shakeMagnitude * decay;
        this.renderSystem.screenShakeOffsetX = (Math.random() * 2 - 1) * currentMag;
        this.renderSystem.screenShakeOffsetY = (Math.random() * 2 - 1) * currentMag;
      } else {
        this.renderSystem.screenShakeOffsetX = 0;
        this.renderSystem.screenShakeOffsetY = 0;
      }
    } else {
      this.renderSystem.screenShakeOffsetX = 0;
      this.renderSystem.screenShakeOffsetY = 0;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation =
      this.qualityPreset === 'HIGH' ? 'lighter' : 'source-over';

    this.particlePool.forEachActive((p) => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
    });

    ctx.restore();
  }

  public getMetrics(): PoolMetrics {
    return this.particlePool.getMetrics();
  }
}
