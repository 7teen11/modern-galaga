import { EntityManager } from '../ecs/Entity';
import {
  EntityId,
  RenderLayer,
  CollisionMask,
  WeaponTier
} from '../ecs/Component';
import { ObjectPool, Poolable, PoolMetrics } from '../ecs/Pool';
import { EventBus } from '../core/EventBus';
import { InputSystem } from './InputSystem';
import { Game, GameSystem } from '../core/Game';
import {
  WEAPON_TIER_SPECS,
  MAX_WEAPON_TIER
} from '../components/WeaponTierConfig';

export interface PlayerBulletSpawnOptions {
  tier?: WeaponTier;
  color?: string;
  bloomColor?: string;
  width?: number;
  height?: number;
  isPiercing?: boolean;
  rotation?: number;
}

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
      t.rotation = 0;
    }
    const proj = this.entities.projectiles.get(this.entityId);
    if (proj) {
      proj.isPiercing = false;
      if (proj.penetratedEntityIds) {
        proj.penetratedEntityIds.length = 0;
      }
    }
  }
}

/**
 * 5-Tier Weapon Firing, Cooldown & Pooled Projectile Lifecycle System (FR-001 to FR-005).
 * Enforces Constitution Principle IV:
 * - Pre-warmed PlayerBulletPool (160 capacity, RECYCLE_OLDEST)
 * - Pre-warmed EnemyBulletPool (200 capacity, RECYCLE_OLDEST)
 * - Zero dynamic allocations during active combat loops
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

  private readonly bulletByEntityId: Map<EntityId, { pool: ObjectPool<PooledBullet>; item: PooledBullet }> =
    new Map();

  public onPlayerFire?: (tier: WeaponTier) => void;
  public onHighTierFireRecoil?: (recoilPx: number, shakeMag: number, shakeDurSec: number) => void;

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

    // Pre-warm Player & Enemy bullet pools upfront (Constitution Principle IV)
    this.playerBulletPool = new ObjectPool<PooledBullet>(
      WeaponSystem.PLAYER_BULLET_CAPACITY,
      (idx) => this.createPooledBulletEntity(idx, 'PLAYER'),
      'RECYCLE_OLDEST'
    );

    this.enemyBulletPool = new ObjectPool<PooledBullet>(
      WeaponSystem.ENEMY_BULLET_CAPACITY,
      (idx) => this.createPooledBulletEntity(idx, 'ENEMY'),
      'RECYCLE_OLDEST'
    );
  }

  public setPlayerId(id: EntityId): void {
    this.playerId = id;
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
      speed: isPlayer ? 760 : 280,
      rotation: 0
    });

    this.entities.renders.set(id, {
      spriteKey: isPlayer ? 'PLAYER_LASER_T1' : 'ENEMY_PLASMA',
      width: isPlayer ? 4 : 10,
      height: isPlayer ? 16 : 10,
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
      halfHeight: isPlayer ? 8 : 5,
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
      damage: isPlayer ? 25 : 25,
      tier: 1,
      color: isPlayer ? '#00f0ff' : '#ff1e8a',
      isPiercing: false,
      penetratedEntityIds: isPlayer ? [] : undefined
    });

    this.entities.setEntityActive(id, false);
    const pooled = new PooledBullet(poolIndex, id, affiliation, this.entities);
    return pooled;
  }

  public update(dt: number): void {
    // 1. Update player weapon cooldown and trigger firing if held
    const weapon = this.entities.weapons.get(this.playerId);
    const playerTransform = this.entities.transforms.get(this.playerId);

    if (weapon && playerTransform && this.entities.isEntityActive(this.playerId)) {
      if (weapon.cooldownTimer > 0) {
        weapon.cooldownTimer = Math.max(0, weapon.cooldownTimer - dt);
      }

      if (this.inputSystem.isFiring && weapon.cooldownTimer <= 0) {
        const tierSpec = WEAPON_TIER_SPECS[weapon.tier];
        this.firePlayerWeaponPattern(
          playerTransform.x,
          playerTransform.y,
          weapon.tier,
          tierSpec.bulletSpeed,
          tierSpec.baseDamage
        );
        weapon.cooldownTimer = tierSpec.cooldownSec;
        if (this.onPlayerFire) {
          this.onPlayerFire(weapon.tier);
        }
        if (tierSpec.recoilPx > 0 && this.onHighTierFireRecoil) {
          this.onHighTierFireRecoil(
            tierSpec.recoilPx,
            tierSpec.screenShakeMagnitude,
            tierSpec.screenShakeDurationSec
          );
        }
      }
    }

    // 2. Reclaim off-screen player bullets back to pool
    this.reclaimOffscreenBullets(this.playerBulletPool);
    // 3. Reclaim off-screen enemy bullets back to pool
    this.reclaimOffscreenBullets(this.enemyBulletPool);
  }

  /**
   * Fires player weapon streams according to current WeaponTier (FR-001, FR-002):
   * - Tier 1: Single Ion Needle (1 stream, Cyan #00f0ff)
   * - Tier 2: Twin Pulse Blaster (2 parallel streams, Emerald #00ff88)
   * - Tier 3: Tri-Beam Spread Cannon (3 streams, +-12 deg spread, Golden Amber #ffcc00)
   * - Tier 4: Quad Plasma Annihilator (4 streams, +-7 deg outer spread, Electric Violet #bf55ec)
   * - Tier 5: Omega Vanguard Hyper Beam (5 streams, twin central Armor-Piercing Hyper Beams + wing bolts, Solar Crimson #ff2a55)
   */
  public firePlayerWeaponPattern(
    x: number,
    y: number,
    tier: WeaponTier,
    speed?: number,
    damage?: number
  ): void {
    const spec = WEAPON_TIER_SPECS[tier] ?? WEAPON_TIER_SPECS[1];
    const effectiveSpeed = speed ?? spec.bulletSpeed;

    for (let i = 0; i < spec.streams.length; i++) {
      const stream = spec.streams[i];
      const vx = Math.sin(stream.angleRad) * effectiveSpeed;
      const vy = -Math.cos(stream.angleRad) * effectiveSpeed;
      const streamDamage = damage !== undefined && tier <= 3 ? damage : stream.damage;

      this.spawnPlayerBullet(
        x + stream.offsetX,
        y + stream.offsetY,
        vx,
        vy,
        streamDamage,
        {
          tier: spec.tier,
          color: spec.primaryColor,
          bloomColor: spec.bloomColor,
          width: stream.width,
          height: stream.height,
          isPiercing: stream.isPiercing,
          rotation: stream.angleRad
        }
      );
    }
  }

  public spawnPlayerBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage: number,
    options?: PlayerBulletSpawnOptions
  ): EntityId | null {
    const item = this.playerBulletPool.acquire();
    if (!item) return null;

    const tier = options?.tier ?? 1;
    const spec = WEAPON_TIER_SPECS[tier];
    const width = options?.width ?? spec.bulletWidth;
    const height = options?.height ?? spec.bulletHeight;
    const color = options?.color ?? spec.primaryColor;
    const bloomColor = options?.bloomColor ?? spec.bloomColor;
    const isPiercing = options?.isPiercing ?? false;
    const rotation = options?.rotation ?? 0;

    const id = item.entityId;
    this.entities.setEntityActive(id, true);
    this.bulletByEntityId.set(id, { pool: this.playerBulletPool, item });

    const t = this.entities.transforms.get(id)!;
    t.x = x;
    t.y = y;
    t.vx = vx;
    t.vy = vy;
    t.rotation = rotation;

    const r = this.entities.renders.get(id)!;
    r.spriteKey = `PLAYER_LASER_T${tier}`;
    r.width = width;
    r.height = height;
    r.bloomColor = bloomColor;
    r.hullPrimary = color;
    r.hullSecondary = spec.coreColor;

    const hb = this.entities.hitboxes.get(id)!;
    hb.radius = Math.max(4, Math.round(width * 0.55));
    hb.halfWidth = width * 0.5;
    hb.halfHeight = height * 0.5;

    const proj = this.entities.projectiles.get(id)!;
    proj.sourceAffiliation = 'PLAYER';
    proj.damage = damage;
    proj.tier = tier;
    proj.color = color;
    proj.isPiercing = isPiercing;
    if (!proj.penetratedEntityIds) {
      proj.penetratedEntityIds = [];
    } else {
      proj.penetratedEntityIds.length = 0;
    }

    return id;
  }

  public spawnEnemyBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    damage = 25
  ): EntityId | null {
    const item = this.enemyBulletPool.acquire();
    if (!item) return null;

    const id = item.entityId;
    this.entities.setEntityActive(id, true);
    this.bulletByEntityId.set(id, { pool: this.enemyBulletPool, item });

    const t = this.entities.transforms.get(id)!;
    t.x = x;
    t.y = y;
    t.vx = vx;
    t.vy = vy;
    t.rotation = 0;

    const proj = this.entities.projectiles.get(id)!;
    proj.sourceAffiliation = 'ENEMY';
    proj.damage = damage;
    proj.isPiercing = false;

    return id;
  }

  public releaseBulletByEntityId(entityId: EntityId): void {
    const entry = this.bulletByEntityId.get(entityId);
    if (entry && entry.item.active) {
      entry.pool.release(entry.item);
    }
  }

  /**
   * Upgrades player weapon tier (1 -> 2 -> 3 -> 4 -> 5) or signals max-tier overcharge bonus (FR-001, FR-004).
   */
  public upgradePlayerWeapon(): { newTier: WeaponTier; isMaxTierBonus: boolean } {
    const weapon = this.entities.weapons.get(this.playerId);
    if (!weapon) {
      return { newTier: 1, isMaxTierBonus: false };
    }

    if (weapon.tier < MAX_WEAPON_TIER) {
      weapon.tier = (weapon.tier + 1) as WeaponTier;
      const spec = WEAPON_TIER_SPECS[weapon.tier];
      weapon.cooldown = spec.cooldownSec;
      weapon.bulletSpeed = spec.bulletSpeed;
      weapon.bulletDamage = spec.baseDamage;

      this.eventBus.emit('WEAPON_UPGRADED', {
        newTier: weapon.tier,
        isMaxTierBonus: false
      });
      return { newTier: weapon.tier, isMaxTierBonus: false };
    }

    // Already at Tier 5 -> Overcharge bonus!
    this.eventBus.emit('WEAPON_UPGRADED', {
      newTier: MAX_WEAPON_TIER,
      isMaxTierBonus: true
    });
    return { newTier: MAX_WEAPON_TIER, isMaxTierBonus: true };
  }

  /**
   * Degrades player weapon tier by 1 level on life loss: max(1, currentTier - 1) (FR-005, Q1: A).
   */
  public degradePlayerWeaponTier(): WeaponTier {
    const weapon = this.entities.weapons.get(this.playerId);
    if (!weapon) return 1;

    weapon.tier = Math.max(1, weapon.tier - 1) as WeaponTier;
    const spec = WEAPON_TIER_SPECS[weapon.tier];
    weapon.cooldown = spec.cooldownSec;
    weapon.bulletSpeed = spec.bulletSpeed;
    weapon.bulletDamage = spec.baseDamage;
    weapon.cooldownTimer = 0;
    return weapon.tier;
  }

  public resetPlayerWeaponTier(): void {
    const weapon = this.entities.weapons.get(this.playerId);
    if (weapon) {
      weapon.tier = 1;
      const spec = WEAPON_TIER_SPECS[1];
      weapon.cooldown = spec.cooldownSec;
      weapon.bulletSpeed = spec.bulletSpeed;
      weapon.bulletDamage = spec.baseDamage;
      weapon.cooldownTimer = 0;
    }
  }

  /**
   * Clears all active enemy bullets within a given radius around (centerX, centerY) (FR-004 Overcharge).
   * Returns the number of cleared enemy projectiles.
   */
  public clearEnemyBulletsInRadius(centerX: number, centerY: number, radiusPx: number): number {
    const radiusSq = radiusPx * radiusPx;
    let clearedCount = 0;

    this.enemyBulletPool.forEachActive((pooled) => {
      const id = pooled.entityId;
      const t = this.entities.transforms.get(id);
      if (!t) return;
      const dx = t.x - centerX;
      const dy = t.y - centerY;
      if (dx * dx + dy * dy <= radiusSq) {
        this.enemyBulletPool.release(pooled);
        clearedCount++;
      }
    });

    return clearedCount;
  }

  private reclaimOffscreenBullets(pool: ObjectPool<PooledBullet>): void {
    const margin = 40;
    pool.forEachActive((pooled) => {
      const t = this.entities.transforms.get(pooled.entityId);
      if (!t) return;
      if (
        t.y < -margin ||
        t.y > this.canvasHeight + margin ||
        t.x < -margin ||
        t.x > this.canvasWidth + margin
      ) {
        pool.release(pooled);
      }
    });
  }

  public releaseAllBullets(): void {
    this.playerBulletPool.releaseAll();
    this.enemyBulletPool.releaseAll();
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
