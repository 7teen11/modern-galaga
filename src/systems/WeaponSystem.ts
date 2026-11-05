import { EntityManager } from '../ecs/Entity';
import {
  EntityId,
  RenderLayer,
  CollisionMask,
  WeaponTier
} from '../ecs/Component';
import { ObjectPool, Poolable, PoolMetrics } from '../ecs/Pool';
import { EventBus } from '../core/EventBus';
import { Game, GameSystem } from '../core/Game';
import { InputSystem } from './InputSystem';

export class PooledBullet implements Poolable {
  public active = false;
  public poolIndex = 0;
  public readonly entityId: EntityId;
  public readonly affiliation: 'PLAYER' | 'ENEMY';
  private readonly entities: EntityManager;

  constructor(
    poolIndex: number,
    entityId: EntityId,
    affiliation: 'PLAYER' | 'ENEMY',
    entities: EntityManager
  ) {
    this.poolIndex = poolIndex;
    this.entityId = entityId;
    this.affiliation = affiliation;
    this.entities = entities;
  }

  public reset(): void {
    this.entities.setEntityActive(this.entityId, false);
    const t = this.entities.transforms.get(this.entityId);
    if (t) {
      t.x = -100;
      t.y = -100;
      t.vx = 0;
      t.vy = 0;
    }
  }
}

/**
 * Primary Weapon Firing & Projectile Pool Management System (FR-002, FR-007, Principle IV).
 * Pre-allocates PlayerBulletPool (50 capacity) and EnemyBulletPool (150 capacity).
 */
export class WeaponSystem implements GameSystem {
  public static readonly PLAYER_BULLET_CAPACITY = 50;
  public static readonly ENEMY_BULLET_CAPACITY = 150;

  private readonly entities: EntityManager;
  private readonly eventBus: EventBus;
  private readonly inputSystem: InputSystem;
  private playerId: EntityId;
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;

  public readonly playerBulletPool: ObjectPool<PooledBullet>;
  public readonly enemyBulletPool: ObjectPool<PooledBullet>;
  public onPlayerFire?: (tier: WeaponTier) => void;
  private readonly bulletByEntityId: Map<EntityId, PooledBullet> = new Map();

  constructor(
    entities: EntityManager,
    eventBus: EventBus,
    inputSystem: InputSystem,
    playerId: EntityId,
    canvasWidth = Game.LOGICAL_WIDTH,
    canvasHeight = Game.LOGICAL_HEIGHT
  ) {
    this.entities = entities;
    this.eventBus = eventBus;
    this.inputSystem = inputSystem;
    this.playerId = playerId;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Pre-warm 50 player projectiles (Constitution Principle IV)
    this.playerBulletPool = new ObjectPool<PooledBullet>(
      WeaponSystem.PLAYER_BULLET_CAPACITY,
      (idx) => this.createPooledBulletEntity(idx, 'PLAYER'),
      'RECYCLE_OLDEST'
    );

    // Pre-warm 150 enemy projectiles (Constitution Principle IV)
    this.enemyBulletPool = new ObjectPool<PooledBullet>(
      WeaponSystem.ENEMY_BULLET_CAPACITY,
      (idx) => this.createPooledBulletEntity(idx, 'ENEMY'),
      'RECYCLE_OLDEST'
    );
  }

  private createPooledBulletEntity(
    poolIndex: number,
    affiliation: 'PLAYER' | 'ENEMY'
  ): PooledBullet {
    const id = this.entities.createEntity();
    const isPlayer = affiliation === 'PLAYER';

    this.entities.transforms.set(id, {
      x: -100,
      y: -100,
      vx: 0,
      vy: 0,
      speed: isPlayer ? 760 : 340,
      rotation: 0
    });

    this.entities.renders.set(id, {
      spriteKey: isPlayer ? 'BULLET_PLAYER_LASER' : 'BULLET_ENEMY_PLASMA',
      width: isPlayer ? 6 : 10,
      height: isPlayer ? 20 : 10,
      layer: RenderLayer.BULLETS,
      alpha: 1.0,
      scale: 1.0,
      hitFlashTimer: 0,
      bloomColor: isPlayer ? '#00f0ff' : '#ff1e8a'
    });

    this.entities.hitboxes.set(id, {
      shape: 'circle',
      radius: isPlayer ? 4 : 5,
      halfWidth: isPlayer ? 3 : 5,
      halfHeight: isPlayer ? 10 : 5,
      isCoreHitbox: false,
      collisionLayer: isPlayer
        ? CollisionMask.PLAYER_BULLET
        : CollisionMask.ENEMY_BULLET,
      collisionMask: isPlayer
        ? CollisionMask.ENEMY_SHIP
        : CollisionMask.PLAYER_SHIP
    });

    this.entities.projectiles.set(id, {
      sourceAffiliation: affiliation,
      damage: isPlayer ? 25 : 20
    });

    this.entities.setEntityActive(id, false);
    const pooled = new PooledBullet(poolIndex, id, affiliation, this.entities);
    this.bulletByEntityId.set(id, pooled);
    return pooled;
  }

  public setPlayerId(id: EntityId): void {
    this.playerId = id;
  }

  public update(dt: number): void {
    this.updatePlayerFiring(dt);
    this.reclaimOffscreenBullets();
  }

  private updatePlayerFiring(dt: number): void {
    if (!this.entities.isEntityActive(this.playerId)) return;

    const weapon = this.entities.weapons.get(this.playerId);
    const transform = this.entities.transforms.get(this.playerId);
    if (!weapon || !transform) return;

    if (weapon.cooldownTimer > 0) {
      weapon.cooldownTimer -= dt;
    }

    if (this.inputSystem.isFiring && weapon.cooldownTimer <= 0) {
      weapon.cooldownTimer = weapon.cooldown;
      this.firePlayerWeaponPattern(
        transform.x,
        transform.y - 22,
        weapon.tier,
        weapon.bulletSpeed,
        weapon.bulletDamage
      );
      if (this.onPlayerFire) {
        this.onPlayerFire(weapon.tier);
      }
    }
  }

  /**
   * Spawns player bullets according to current WeaponTier (FR-007):
   * Tier 1: Single center forward blaster
   * Tier 2: Dual parallel blasters
   * Tier 3: Triple spread blasters (center + ±14 degree angled side lasers)
   */
  public firePlayerWeaponPattern(
    originX: number,
    originY: number,
    tier: WeaponTier,
    speed: number,
    damage: number
  ): void {
    if (tier === 1) {
      this.spawnPlayerBullet(originX, originY, 0, -speed, damage);
    } else if (tier === 2) {
      this.spawnPlayerBullet(originX - 11, originY + 2, 0, -speed, damage);
      this.spawnPlayerBullet(originX + 11, originY + 2, 0, -speed, damage);
    } else {
      // Tier 3: Triple Spread Shot
      const spreadAngle = 0.24; // ~13.7 degrees
      const sinA = Math.sin(spreadAngle);
      const cosA = Math.cos(spreadAngle);
      this.spawnPlayerBullet(originX, originY - 2, 0, -speed, damage);
      this.spawnPlayerBullet(
        originX - 13,
        originY + 4,
        -speed * sinA,
        -speed * cosA,
        damage
      );
      this.spawnPlayerBullet(
        originX + 13,
        originY + 4,
        speed * sinA,
        -speed * cosA,
        damage
      );
    }
  }

  public spawnPlayerBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number
  ): EntityId | null {
    const item = this.playerBulletPool.acquire();
    if (!item) return null;

    const id = item.entityId;
    this.entities.setEntityActive(id, true);

    const t = this.entities.transforms.get(id)!;
    t.x = x;
    t.y = y;
    t.vx = vx;
    t.vy = vy;
    t.rotation = Math.atan2(vy, vx) + Math.PI * 0.5;

    const p = this.entities.projectiles.get(id)!;
    p.damage = damage;

    return id;
  }

  public spawnEnemyBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage = 20
  ): EntityId | null {
    const item = this.enemyBulletPool.acquire();
    if (!item) return null;

    const id = item.entityId;
    this.entities.setEntityActive(id, true);

    const t = this.entities.transforms.get(id)!;
    t.x = x;
    t.y = y;
    t.vx = vx;
    t.vy = vy;

    const p = this.entities.projectiles.get(id)!;
    p.damage = damage;

    return id;
  }

  public releaseBulletByEntityId(entityId: EntityId): void {
    const pooled = this.bulletByEntityId.get(entityId);
    if (!pooled || !pooled.active) return;

    if (pooled.affiliation === 'PLAYER') {
      this.playerBulletPool.release(pooled);
    } else {
      this.enemyBulletPool.release(pooled);
    }
  }

  public releaseAllBullets(): void {
    this.playerBulletPool.releaseAll();
    this.enemyBulletPool.releaseAll();
  }

  /**
   * Upgrade player weapon tier on power-up collection (FR-008, FR-011).
   */
  public upgradePlayerWeapon(): { newTier: WeaponTier; isMaxTierBonus: boolean } {
    const weapon = this.entities.weapons.get(this.playerId);
    if (!weapon) {
      return { newTier: 1, isMaxTierBonus: false };
    }

    if (weapon.tier < 3) {
      weapon.tier = (weapon.tier + 1) as WeaponTier;
      this.eventBus.emit('WEAPON_UPGRADED', {
        newTier: weapon.tier,
        isMaxTierBonus: false
      });
      return { newTier: weapon.tier, isMaxTierBonus: false };
    } else {
      this.eventBus.emit('WEAPON_UPGRADED', {
        newTier: 3,
        isMaxTierBonus: true
      });
      return { newTier: 3, isMaxTierBonus: true };
    }
  }

  /**
   * Resets player weapon tier back to Tier 1 on life loss or new run (FR-011).
   */
  public resetPlayerWeaponTier(): void {
    const weapon = this.entities.weapons.get(this.playerId);
    if (weapon) {
      weapon.tier = 1;
      weapon.cooldownTimer = 0;
    }
  }

  private reclaimOffscreenBullets(): void {
    const margin = 30;
    this.playerBulletPool.forEachActive((b) => {
      const t = this.entities.transforms.get(b.entityId);
      if (
        !t ||
        t.y < -margin ||
        t.y > this.canvasHeight + margin ||
        t.x < -margin ||
        t.x > this.canvasWidth + margin
      ) {
        this.playerBulletPool.release(b);
      }
    });

    this.enemyBulletPool.forEachActive((b) => {
      const t = this.entities.transforms.get(b.entityId);
      if (
        !t ||
        t.y < -margin ||
        t.y > this.canvasHeight + margin ||
        t.x < -margin ||
        t.x > this.canvasWidth + margin
      ) {
        this.enemyBulletPool.release(b);
      }
    });
  }

  public getPoolMetrics(): {
    playerBullets: PoolMetrics;
    enemyBullets: PoolMetrics;
  } {
    return {
      playerBullets: this.playerBulletPool.getMetrics(),
      enemyBullets: this.enemyBulletPool.getMetrics()
    };
  }
}

