import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../../src/ecs/Entity';
import { EventBus } from '../../src/core/EventBus';
import { SpatialGrid } from '../../src/core/SpatialGrid';
import { createPlayerShip } from '../../src/components/PlayerComponents';
import { InputSystem } from '../../src/systems/InputSystem';
import { WeaponSystem } from '../../src/systems/WeaponSystem';
import { EnemyPool } from '../../src/ecs/EnemyPool';
import { HealthSystem } from '../../src/systems/HealthSystem';
import { CollisionSystem } from '../../src/systems/CollisionSystem';
import { PowerUpPool, SURPLUS_UPGRADE_BONUS_POINTS } from '../../src/components/PowerUp';
import { DropSystem } from '../../src/systems/DropSystem';
import {
  WEAPON_TIER_SPECS,
  MAX_WEAPON_TIER,
  OVERCHARGE_BONUS_POINTS,
  OVERCHARGE_RADIAL_CLEAR_RADIUS_PX
} from '../../src/components/WeaponTierConfig';
import { EntityId, WeaponTier } from '../../src/ecs/Component';

describe('Feature 003 - User Story 1: 5-Tier Weapon Progression & Visual Specs', () => {
  let entities: EntityManager;
  let eventBus: EventBus;
  let spatialGrid: SpatialGrid;
  let playerId: EntityId;
  let inputSystem: InputSystem;
  let weaponSystem: WeaponSystem;
  let enemyPool: EnemyPool;
  let healthSystem: HealthSystem;
  let collisionSystem: CollisionSystem;
  let powerUpPool: PowerUpPool;
  let dropSystem: DropSystem;
  let bonusPointsAwarded: number;

  beforeEach(() => {
    entities = new EntityManager();
    eventBus = new EventBus();
    spatialGrid = new SpatialGrid(600, 800, 64);
    playerId = createPlayerShip(entities);
    inputSystem = new InputSystem(entities, eventBus, playerId);
    weaponSystem = new WeaponSystem(entities, eventBus, inputSystem, playerId, 600, 800);
    enemyPool = new EnemyPool(entities);
    healthSystem = new HealthSystem(entities, eventBus, enemyPool, weaponSystem, playerId);
    collisionSystem = new CollisionSystem(
      entities,
      spatialGrid,
      eventBus,
      weaponSystem,
      healthSystem,
      playerId
    );
    powerUpPool = new PowerUpPool(entities);
    bonusPointsAwarded = 0;
    dropSystem = new DropSystem(
      entities,
      eventBus,
      powerUpPool,
      weaponSystem,
      collisionSystem,
      800,
      (pts) => {
        bonusPointsAwarded += pts;
      }
    );
  });

  it('defines distinct stream counts, colors, dimensions, and audio frequencies across all 5 tiers (FR-001, FR-002)', () => {
    expect(MAX_WEAPON_TIER).toBe(5);
    const tiers: WeaponTier[] = [1, 2, 3, 4, 5];
    const colors = new Set<string>();
    const shapes = new Set<string>();

    for (const tier of tiers) {
      const spec = WEAPON_TIER_SPECS[tier];
      expect(spec.tier).toBe(tier);
      expect(spec.streamCount).toBe(tier);
      expect(spec.streams.length).toBe(tier);
      colors.add(spec.primaryColor);
      shapes.add(spec.shape);
    }

    // All 5 tiers have distinct colors and shapes
    expect(colors.size).toBe(5);
    expect(shapes.size).toBe(5);

    // Bullet width and audio frequency escalate monotonically from Tier 1 to Tier 5
    for (let t = 1; t < 5; t++) {
      const curr = WEAPON_TIER_SPECS[t as WeaponTier];
      const next = WEAPON_TIER_SPECS[(t + 1) as WeaponTier];
      expect(next.bulletWidth).toBeGreaterThan(curr.bulletWidth);
      expect(next.audioFreqHz).toBeGreaterThan(curr.audioFreqHz);
    }

    // Only Tier 5 has central armor-piercing beams
    expect(WEAPON_TIER_SPECS[1].hasPiercingCenter).toBe(false);
    expect(WEAPON_TIER_SPECS[4].hasPiercingCenter).toBe(false);
    expect(WEAPON_TIER_SPECS[5].hasPiercingCenter).toBe(true);
    expect(WEAPON_TIER_SPECS[5].streams.filter((s) => s.isPiercing).length).toBe(2);
  });

  it('progresses sequentially from Tier 1 through Tier 5 on token pickups and spawns matching stream counts (FR-001)', () => {
    const playerWeapon = entities.weapons.get(playerId)!;
    const playerTransform = entities.transforms.get(playerId)!;
    playerTransform.x = 300;
    playerTransform.y = 700;

    for (let expectedTier = 1; expectedTier <= 5; expectedTier++) {
      expect(playerWeapon.tier).toBe(expectedTier);

      weaponSystem.firePlayerWeaponPattern(300, 680, playerWeapon.tier);
      expect(weaponSystem.getPoolMetrics().playerBullets.activeCount).toBe(expectedTier);
      weaponSystem.releaseAllBullets();

      if (expectedTier < 5) {
        powerUpPool.spawn('WEAPON_UPGRADE', 300, 700);
        collisionSystem.update(1 / 60);
      }
    }

    expect(playerWeapon.tier).toBe(5);
  });

  it('awards +2,000 Overcharge bonus points and clears nearby enemy bullets (80px radius) when collecting a token at Tier 5 (FR-004)', () => {
    const playerWeapon = entities.weapons.get(playerId)!;
    const playerTransform = entities.transforms.get(playerId)!;
    playerTransform.x = 300;
    playerTransform.y = 700;
    playerWeapon.tier = 5;

    // Spawn 2 enemy bullets inside 80px radius (at distance 40px and 75px) and 1 outside (at distance 120px)
    weaponSystem.spawnEnemyBullet(300, 660, 0, 200, 25); // dist = 40px <= 80px
    weaponSystem.spawnEnemyBullet(360, 655, 0, 200, 25); // dist = 75px <= 80px
    weaponSystem.spawnEnemyBullet(300, 550, 0, 200, 25); // dist = 150px > 80px
    expect(weaponSystem.getPoolMetrics().enemyBullets.activeCount).toBe(3);

    // Collect surplus weapon upgrade token at Tier 5
    const tokenId = powerUpPool.spawn('WEAPON_UPGRADE', 300, 700)!;
    dropSystem.collectPowerUp(tokenId);

    expect(playerWeapon.tier).toBe(5);
    expect(SURPLUS_UPGRADE_BONUS_POINTS).toBe(OVERCHARGE_BONUS_POINTS);
    expect(bonusPointsAwarded).toBe(2000);
    expect(OVERCHARGE_RADIAL_CLEAR_RADIUS_PX).toBe(80);
    // The 2 nearby enemy bullets were cleared; the distant one remains
    expect(weaponSystem.getPoolMetrics().enemyBullets.activeCount).toBe(1);
  });
});

