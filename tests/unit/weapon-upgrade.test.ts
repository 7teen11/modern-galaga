import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../../src/ecs/Entity';
import { EventBus } from '../../src/core/EventBus';
import { SpatialGrid } from '../../src/core/SpatialGrid';
import { createPlayerShip } from '../../src/components/PlayerComponents';
import { InputSystem } from '../../src/systems/InputSystem';
import { MovementSystem } from '../../src/systems/MovementSystem';
import { WeaponSystem } from '../../src/systems/WeaponSystem';
import { EnemyPool } from '../../src/ecs/EnemyPool';
import { HealthSystem } from '../../src/systems/HealthSystem';
import { CollisionSystem } from '../../src/systems/CollisionSystem';
import { PowerUpPool, SURPLUS_UPGRADE_BONUS_POINTS } from '../../src/components/PowerUp';
import { DropSystem } from '../../src/systems/DropSystem';
import { Spline } from '../../src/utils/Spline';
import { EntityId } from '../../src/ecs/Component';

describe('User Story 4: In-Run Weapon Upgrades & Power-Up Drops', () => {
  let entities: EntityManager;
  let eventBus: EventBus;
  let spatialGrid: SpatialGrid;
  let playerId: EntityId;
  let inputSystem: InputSystem;
  let movementSystem: MovementSystem;
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
    movementSystem = new MovementSystem(entities, playerId, 600, 800);
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

  it('pre-warms PowerUpPool to capacity 20 and drops a weapon upgrade token when an elite Commander is defeated (FR-008)', () => {
    expect(powerUpPool.getMetrics().capacity).toBe(20);
    expect(powerUpPool.getActiveCount()).toBe(0);

    const path = Spline.createSwoopEntryPath('left', 300, 200);
    const commanderId = enemyPool.spawn({
      archetype: 'COMMANDER', // 100 HP, guaranteed drop
      gridCol: 0,
      gridRow: 0,
      targetSlotX: 300,
      targetSlotY: 200,
      splinePath: path,
      difficultyMultiplier: 1.0
    })!;

    const ct = entities.transforms.get(commanderId)!;
    ct.x = 300;
    ct.y = 200;

    // Defeat the Commander (100 damage)
    healthSystem.applyDamage(commanderId, 100);

    expect(powerUpPool.getActiveCount()).toBe(1);
  });

  it('upgrades player weapon across 3 tiers (Single -> Dual Parallel -> Triple Spread) on token pickup (FR-007)', () => {
    const playerTransform = entities.transforms.get(playerId)!;
    const playerWeapon = entities.weapons.get(playerId)!;
    playerTransform.x = 300;
    playerTransform.y = 700;

    expect(playerWeapon.tier).toBe(1);

    // Tier 1 fires 1 projectile per volley
    weaponSystem.firePlayerWeaponPattern(300, 680, playerWeapon.tier, 760, 25);
    expect(weaponSystem.getPoolMetrics().playerBullets.activeCount).toBe(1);
    weaponSystem.releaseAllBullets();

    // Spawn Token #1 directly on player -> upgrades Tier 1 -> Tier 2
    powerUpPool.spawn('WEAPON_UPGRADE', 300, 700);
    collisionSystem.update(1 / 60);
    expect(playerWeapon.tier).toBe(2);
    expect(powerUpPool.getActiveCount()).toBe(0);

    // Tier 2 fires 2 parallel projectiles per volley
    weaponSystem.firePlayerWeaponPattern(300, 680, playerWeapon.tier, 760, 25);
    expect(weaponSystem.getPoolMetrics().playerBullets.activeCount).toBe(2);
    weaponSystem.releaseAllBullets();

    // Spawn Token #2 directly on player -> upgrades Tier 2 -> Tier 3
    powerUpPool.spawn('WEAPON_UPGRADE', 300, 700);
    collisionSystem.update(1 / 60);
    expect(playerWeapon.tier).toBe(3);

    // Tier 3 fires 3 spread projectiles per volley
    weaponSystem.firePlayerWeaponPattern(300, 680, playerWeapon.tier, 760, 25);
    expect(weaponSystem.getPoolMetrics().playerBullets.activeCount).toBe(3);
  });

  it('awards +2,000 Overcharge bonus points when collecting surplus weapon tokens at maximum Tier 5 (User Story 1 / FR-004)', () => {
    const playerTransform = entities.transforms.get(playerId)!;
    const playerWeapon = entities.weapons.get(playerId)!;
    playerTransform.x = 300;
    playerTransform.y = 700;
    playerWeapon.tier = 5;

    powerUpPool.spawn('WEAPON_UPGRADE', 300, 700);
    collisionSystem.update(1 / 60);

    expect(playerWeapon.tier).toBe(5);
    expect(bonusPointsAwarded).toBe(SURPLUS_UPGRADE_BONUS_POINTS);
  });

  it('degrades weapon tier by 1 level (max(1, tier - 1)) when losing a life and respawning (FR-005)', () => {
    const playerWeapon = entities.weapons.get(playerId)!;
    playerWeapon.tier = 2;

    // Lose 1 life (100 damage) -> Tier 2 degrades to Tier 1
    healthSystem.applyDamage(playerId, 100);
    expect(playerWeapon.tier).toBe(1);
  });

  it('drifts tokens downward and reclaims expired/offscreen tokens back to PowerUpPool', () => {
    const tokenId = powerUpPool.spawn('WEAPON_UPGRADE', 200, 790)!;
    expect(powerUpPool.getActiveCount()).toBe(1);

    // Advance 1 second so token drifts past bottom margin (790 + 110 = 900 > 830)
    for (let i = 0; i < 60; i++) {
      movementSystem.update(1 / 60);
      dropSystem.update(1 / 60);
    }

    expect(entities.isEntityActive(tokenId)).toBe(false);
    expect(powerUpPool.getActiveCount()).toBe(0);
    expect(powerUpPool.getMetrics().freeCount).toBe(20);
  });
});

