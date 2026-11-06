import { EntityManager } from '../ecs/Entity';
import { EntityId } from '../ecs/Component';
import { SpatialGrid } from '../core/SpatialGrid';
import { EventBus } from '../core/EventBus';
import { WeaponSystem } from './WeaponSystem';
import { HealthSystem } from './HealthSystem';
import { GameSystem } from '../core/Game';
import { Vector2 } from '../utils/Vector2';

/**
 * 2D Broadphase Spatial Grid + Narrowphase Core Hitbox Collision System (FR-014).
 * - Uses 64x64 SpatialGrid for O(N) player-bullet vs enemy broadphase queries.
 * - Uses 40-50% centered circular cockpit core hitbox for player damage detection.
 * - Permits wingtip grazing outside the core hitbox with zero damage (FR-014).
 */
export class CollisionSystem implements GameSystem {
  private readonly entities: EntityManager;
  private readonly spatialGrid: SpatialGrid;
  private readonly eventBus: EventBus;
  private readonly weaponSystem: WeaponSystem;
  private readonly healthSystem: HealthSystem;
  private playerId: EntityId;

  // Pre-allocated query buffer to uphold Zero-Allocation rule (Principle IV)
  private readonly queryBuffer: number[] = new Array(64);
  private onPowerUpCollected?: (powerUpEntityId: EntityId) => void;

  constructor(
    entities: EntityManager,
    spatialGrid: SpatialGrid,
    eventBus: EventBus,
    weaponSystem: WeaponSystem,
    healthSystem: HealthSystem,
    playerId: EntityId,
    onPowerUpCollected?: (powerUpEntityId: EntityId) => void
  ) {
    this.entities = entities;
    this.spatialGrid = spatialGrid;
    this.eventBus = eventBus;
    this.weaponSystem = weaponSystem;
    this.healthSystem = healthSystem;
    this.playerId = playerId;
    this.onPowerUpCollected = onPowerUpCollected;
  }

  public setPlayerId(id: EntityId): void {
    this.playerId = id;
  }

  public setPowerUpCollector(cb: (powerUpEntityId: EntityId) => void): void {
    this.onPowerUpCollected = cb;
  }

  public update(_dt: number): void {
    // 1. Populate 64x64 SpatialGrid with active enemy ships
    this.spatialGrid.clear();
    const activeEntities = this.entities.getActiveEntities();

    for (const id of activeEntities) {
      if (!this.entities.enemyBehaviors.has(id)) continue;
      const t = this.entities.transforms.get(id);
      const hb = this.entities.hitboxes.get(id);
      if (t && hb) {
        this.spatialGrid.insertAABB(id, t.x, t.y, hb.halfWidth, hb.halfHeight);
      }
    }

    // 2. Player Bullets vs Enemies (O(N) spatial hash query)
    this.weaponSystem.playerBulletPool.forEachActive((pooledBullet) => {
      const bulletId = pooledBullet.entityId;
      if (!this.entities.isEntityActive(bulletId)) return;

      const bt = this.entities.transforms.get(bulletId);
      const bhb = this.entities.hitboxes.get(bulletId);
      const bProj = this.entities.projectiles.get(bulletId);
      if (!bt || !bhb || !bProj) return;

      const candidateCount = this.spatialGrid.queryRegion(
        bt.x,
        bt.y,
        bhb.radius,
        bhb.radius,
        this.queryBuffer
      );

      for (let i = 0; i < candidateCount; i++) {
        const enemyId = this.queryBuffer[i];
        if (!this.entities.isEntityActive(enemyId)) continue;

        const et = this.entities.transforms.get(enemyId);
        const ehb = this.entities.hitboxes.get(enemyId);
        if (!et || !ehb) continue;

        if (
          CollisionSystem.circleIntersectsAABB(
            bt.x,
            bt.y,
            bhb.radius,
            et.x,
            et.y,
            ehb.halfWidth,
            ehb.halfHeight
          )
        ) {
          if (bProj.isPiercing) {
            // Tier 5 Armor-Piercing Hyper Beam: penetrate through multiple enemies without despawning (FR-002, Q3: A)
            const penetrated = bProj.penetratedEntityIds;
            if (penetrated && penetrated.indexOf(enemyId) !== -1) {
              continue;
            }
            if (penetrated) {
              penetrated.push(enemyId);
            }
            this.healthSystem.applyDamage(enemyId, bProj.damage, bulletId);
            continue;
          } else {
            // Standard non-piercing projectile: deterministic single-target hit resolution
            this.weaponSystem.releaseBulletByEntityId(bulletId);
            this.healthSystem.applyDamage(enemyId, bProj.damage, bulletId);
            break;
          }
        }
      }
    });

    // 3. Enemy Bullets, Enemy Ships & Power-Ups vs Player Ship
    if (!this.entities.isEntityActive(this.playerId)) return;

    const pt = this.entities.transforms.get(this.playerId);
    const phb = this.entities.hitboxes.get(this.playerId);
    if (!pt || !phb) return;

    const coreRadius = phb.radius; // 45% cockpit core radius (~10px)
    const wingHalfWidth = phb.halfWidth; // Full wing half-width (22px)
    const wingHalfHeight = phb.halfHeight;

    // 3a. Enemy Bullets vs Player 45% Core Hitbox (with wing grazing tolerance - FR-014)
    this.weaponSystem.enemyBulletPool.forEachActive((pooledBullet) => {
      const bulletId = pooledBullet.entityId;
      if (!this.entities.isEntityActive(bulletId)) return;

      const bt = this.entities.transforms.get(bulletId);
      const bhb = this.entities.hitboxes.get(bulletId);
      const bProj = this.entities.projectiles.get(bulletId);
      if (!bt || !bhb || !bProj) return;

      const distSq = Vector2.distanceSq(pt.x, pt.y, bt.x, bt.y);
      const lethalDist = coreRadius + bhb.radius;

      if (distSq <= lethalDist * lethalDist) {
        // Direct hit to the 45% cockpit core!
        this.weaponSystem.releaseBulletByEntityId(bulletId);
        this.healthSystem.applyDamage(this.playerId, bProj.damage, bulletId);
      } else {
        // Check if bullet grazed the outer wings without hitting core
        const grazeDist = wingHalfWidth + bhb.radius;
        if (distSq <= grazeDist * grazeDist) {
          this.eventBus.emit('VFX_SPAWN_TRIGGERED', {
            type: 'GRAZE_SPARK',
            x: bt.x,
            y: bt.y,
            particleCount: 1,
            color: '#00f0ff'
          });
        }
      }
    });

    // 3b. Enemy Ships vs Player 45% Core Hitbox
    const nearbyEnemies = this.spatialGrid.queryRegion(
      pt.x,
      pt.y,
      coreRadius + 24,
      coreRadius + 24,
      this.queryBuffer
    );

    for (let i = 0; i < nearbyEnemies; i++) {
      const enemyId = this.queryBuffer[i];
      if (!this.entities.isEntityActive(enemyId)) continue;

      const et = this.entities.transforms.get(enemyId);
      const ehb = this.entities.hitboxes.get(enemyId);
      if (!et || !ehb) continue;

      if (
        CollisionSystem.circleIntersectsAABB(
          pt.x,
          pt.y,
          coreRadius,
          et.x,
          et.y,
          ehb.halfWidth,
          ehb.halfHeight
        )
      ) {
        // Ramming collision with enemy hull
        const damaged = this.healthSystem.applyDamage(this.playerId, 35, enemyId);
        if (damaged) {
          // Destroy the colliding enemy
          this.healthSystem.applyDamage(enemyId, 999, this.playerId);
        }
        break;
      }
    }

    // 3c. Power-Ups vs Player Full Hull Envelope (generous pickup radius covers wings)
    for (const id of activeEntities) {
      if (!this.entities.powerUps.has(id)) continue;
      const put = this.entities.transforms.get(id);
      const puhb = this.entities.hitboxes.get(id);
      if (!put || !puhb) continue;

      if (
        CollisionSystem.circleIntersectsAABB(
          put.x,
          put.y,
          puhb.radius,
          pt.x,
          pt.y,
          wingHalfWidth,
          wingHalfHeight
        )
      ) {
        if (this.onPowerUpCollected) {
          this.onPowerUpCollected(id);
        }
      }
    }
  }

  /**
   * Fast squared-distance Circle vs Axis-Aligned Bounding Box intersection check.
   */
  public static circleIntersectsAABB(
    cx: number,
    cy: number,
    radius: number,
    boxX: number,
    boxY: number,
    halfW: number,
    halfH: number
  ): boolean {
    const closestX = Vector2.clamp(cx, boxX - halfW, boxX + halfW);
    const closestY = Vector2.clamp(cy, boxY - halfH, boxY + halfH);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= radius * radius;
  }
}

