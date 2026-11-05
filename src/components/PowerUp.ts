import { EntityManager } from '../ecs/Entity';
import {
  EntityId,
  RenderLayer,
  CollisionMask
} from '../ecs/Component';
import { ObjectPool, Poolable, PoolMetrics } from '../ecs/Pool';
import { PowerUpType } from '../core/EventBus';

export const POWERUP_DRIFT_SPEED = 110; // pixels/sec downward drift
export const POWERUP_DESPAWN_SEC = 9.0;
export const SURPLUS_UPGRADE_BONUS_POINTS = 1000; // Bonus when already at Tier 3 (User Story 4)

export class PooledPowerUp implements Poolable {
  public active = false;
  public poolIndex = 0;
  public readonly entityId: EntityId;
  private readonly entities: EntityManager;

  constructor(poolIndex: number, entityId: EntityId, entities: EntityManager) {
    this.poolIndex = poolIndex;
    this.entityId = entityId;
    this.entities = entities;
  }

  public reset(): void {
    this.entities.setEntityActive(this.entityId, false);
    const t = this.entities.transforms.get(this.entityId);
    if (t) {
      t.x = -150;
      t.y = -150;
      t.vx = 0;
      t.vy = 0;
    }
  }
}

/**
 * Pre-warmed Object Pool for Power-Up drops (Capacity: 20, Constitution Principle IV).
 */
export class PowerUpPool {
  public static readonly CAPACITY = 20;

  private readonly entities: EntityManager;
  public readonly pool: ObjectPool<PooledPowerUp>;
  private readonly powerUpByEntityId: Map<EntityId, PooledPowerUp> = new Map();

  constructor(entities: EntityManager) {
    this.entities = entities;
    this.pool = new ObjectPool<PooledPowerUp>(
      PowerUpPool.CAPACITY,
      (idx) => this.createPooledPowerUpEntity(idx),
      'RECYCLE_OLDEST'
    );
  }

  private createPooledPowerUpEntity(poolIndex: number): PooledPowerUp {
    const id = this.entities.createEntity();

    this.entities.transforms.set(id, {
      x: -150,
      y: -150,
      vx: 0,
      vy: 0,
      speed: POWERUP_DRIFT_SPEED,
      rotation: 0
    });

    this.entities.renders.set(id, {
      spriteKey: 'POWERUP_WEAPON',
      width: 26,
      height: 26,
      layer: RenderLayer.POWERUPS,
      alpha: 1.0,
      scale: 1.0,
      hitFlashTimer: 0,
      bloomColor: '#00ff88'
    });

    this.entities.hitboxes.set(id, {
      shape: 'circle',
      radius: 14,
      halfWidth: 14,
      halfHeight: 14,
      isCoreHitbox: false,
      collisionLayer: CollisionMask.POWERUP,
      collisionMask: CollisionMask.PLAYER_SHIP
    });

    this.entities.powerUps.set(id, {
      type: 'WEAPON_UPGRADE',
      driftSpeed: POWERUP_DRIFT_SPEED,
      despawnTimer: POWERUP_DESPAWN_SEC
    });

    this.entities.setEntityActive(id, false);
    const pooled = new PooledPowerUp(poolIndex, id, this.entities);
    this.powerUpByEntityId.set(id, pooled);
    return pooled;
  }

  public spawn(type: PowerUpType, x: number, y: number): EntityId | null {
    const item = this.pool.acquire();
    if (!item) return null;

    const id = item.entityId;
    this.entities.setEntityActive(id, true);

    const t = this.entities.transforms.get(id)!;
    t.x = x;
    t.y = y;
    t.vx = 0;
    t.vy = POWERUP_DRIFT_SPEED;

    const p = this.entities.powerUps.get(id)!;
    p.type = type;
    p.driftSpeed = POWERUP_DRIFT_SPEED;
    p.despawnTimer = POWERUP_DESPAWN_SEC;

    return id;
  }

  public releaseByEntityId(entityId: EntityId): void {
    const pooled = this.powerUpByEntityId.get(entityId);
    if (pooled && pooled.active) {
      this.pool.release(pooled);
    }
  }

  public releaseAll(): void {
    this.pool.releaseAll();
  }

  public getActiveCount(): number {
    return this.pool.getMetrics().activeCount;
  }

  public getMetrics(): PoolMetrics {
    return this.pool.getMetrics();
  }
}

