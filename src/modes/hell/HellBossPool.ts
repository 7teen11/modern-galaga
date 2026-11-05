import { EntityManager } from '../../ecs/Entity';
import {
  EntityId,
  RenderLayer,
  CollisionMask,
} from '../../ecs/Component';
import { PoolMetrics } from '../../ecs/Pool';
import { PooledBullet } from '../../systems/WeaponSystem';
import { HELL_RULES } from './HellConfig';

/**
 * HellBossPool - Pre-warmed 160-capacity Danmaku projectile pool (US3).
 * Enforces zero-allocation compliance and RECYCLE_OLDEST overflow policy
 * (Constitution Principle IV).
 */
export class HellBossPool {
  private readonly entities: EntityManager;
  public readonly capacity: number;
  private readonly pool: PooledBullet[];
  private activeCount = 0;
  private oldestActiveIndex = 0;
  private peakActive = 0;
  private overflowCount = 0;

  constructor(entities: EntityManager, capacity = HELL_RULES.BOSS.poolCapacity) {
    this.entities = entities;
    this.capacity = capacity;
    this.pool = new Array(capacity);

    // Pre-warm all 160 Danmaku projectile entities
    for (let i = 0; i < capacity; i++) {
      const entityId = this.entities.createEntity();
      this.entities.transforms.set(entityId, {
        x: -9999,
        y: -9999,
        vx: 0,
        vy: 0,
        speed: 0,
        rotation: 0,
      });

      this.entities.hitboxes.set(entityId, {
        shape: 'circle',
        radius: HELL_RULES.BOSS.bulletRadius,
        halfWidth: HELL_RULES.BOSS.bulletRadius,
        halfHeight: HELL_RULES.BOSS.bulletRadius,
        isCoreHitbox: false,
        collisionLayer: CollisionMask.ENEMY_BULLET,
        collisionMask: CollisionMask.PLAYER_SHIP,
      });

      this.entities.projectiles.set(entityId, {
        sourceAffiliation: 'ENEMY',
        damage: HELL_RULES.DAMAGE.bulletDamage,
      });

      this.entities.renders.set(entityId, {
        spriteKey: 'BULLET_ENEMY',
        width: HELL_RULES.BOSS.bulletRadius * 2,
        height: HELL_RULES.BOSS.bulletRadius * 2,
        layer: RenderLayer.BULLETS,
        alpha: 1,
        scale: 1,
        hitFlashTimer: 0,
      });

      this.entities.setEntityActive(entityId, false);

      this.pool[i] = new PooledBullet(i, entityId, 'ENEMY', this.entities);
    }
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public getMetrics(): PoolMetrics {
    return {
      capacity: this.capacity,
      activeCount: this.activeCount,
      freeCount: this.capacity - this.activeCount,
      peakActiveCount: this.peakActive,
      recycleOverflowCount: this.overflowCount,
    };
  }

  /**
   * Acquires a Danmaku bullet from pre-warmed pool.
   * If all 160 slots are occupied, recycles the oldest active bullet (RECYCLE_OLDEST).
   */
  public acquire(): PooledBullet {
    // 1. Look for an inactive bullet
    for (let i = 0; i < this.capacity; i++) {
      const b = this.pool[i];
      if (!b.active) {
        b.active = true;
        this.activeCount++;
        if (this.activeCount > this.peakActive) {
          this.peakActive = this.activeCount;
        }
        this.entities.setEntityActive(b.entityId, true);
        return b;
      }
    }

    // 2. All 160 bullets active: RECYCLE_OLDEST
    this.overflowCount++;
    const recycled = this.pool[this.oldestActiveIndex];
    this.oldestActiveIndex = (this.oldestActiveIndex + 1) % this.capacity;
    this.entities.setEntityActive(recycled.entityId, true);
    return recycled;
  }

  public release(bullet: PooledBullet): void {
    if (!bullet.active) return;
    bullet.active = false;
    this.activeCount = Math.max(0, this.activeCount - 1);

    this.entities.setEntityActive(bullet.entityId, false);
    const t = this.entities.transforms.get(bullet.entityId);
    if (t) {
      t.x = -9999;
      t.y = -9999;
      t.vx = 0;
      t.vy = 0;
    }
  }

  public releaseByEntityId(entityId: EntityId): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.pool[i].entityId === entityId) {
        this.release(this.pool[i]);
        break;
      }
    }
  }

  public releaseAll(): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.pool[i].active) {
        this.release(this.pool[i]);
      }
    }
    this.activeCount = 0;
    this.oldestActiveIndex = 0;
  }

  public forEachActive(cb: (bullet: PooledBullet) => void): void {
    for (let i = 0; i < this.capacity; i++) {
      const b = this.pool[i];
      if (b.active) {
        cb(b);
      }
    }
  }
}
