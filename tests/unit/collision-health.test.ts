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
import { Spline } from '../../src/utils/Spline';
import {
  DAMAGE_INVULNERABILITY_SEC,
  RESPAWN_INVULNERABILITY_SEC,
  SAFE_RESPAWN_X,
  SAFE_RESPAWN_Y,
  isHealthCritical
} from '../../src/components/Health';
import { EntityId } from '../../src/ecs/Component';

describe('User Story 3: Multi-Life Stock with Health Bar, Grazing Hitbox & Damage Feedback', () => {
  let entities: EntityManager;
  let eventBus: EventBus;
  let spatialGrid: SpatialGrid;
  let playerId: EntityId;
  let inputSystem: InputSystem;
  let weaponSystem: WeaponSystem;
  let enemyPool: EnemyPool;
  let healthSystem: HealthSystem;
  let collisionSystem: CollisionSystem;
  let gameOverTriggered: boolean;

  beforeEach(() => {
    entities = new EntityManager();
    eventBus = new EventBus();
    spatialGrid = new SpatialGrid(600, 800, 64);
    playerId = createPlayerShip(entities);
    inputSystem = new InputSystem(entities, eventBus, playerId);
    weaponSystem = new WeaponSystem(entities, eventBus, inputSystem, playerId, 600, 800);
    enemyPool = new EnemyPool(entities);
    gameOverTriggered = false;
    healthSystem = new HealthSystem(
      entities,
      eventBus,
      enemyPool,
      weaponSystem,
      playerId,
      () => {
        gameOverTriggered = true;
      }
    );
    collisionSystem = new CollisionSystem(
      entities,
      spatialGrid,
      eventBus,
      weaponSystem,
      healthSystem,
      playerId
    );
  });

  it('permits wingtip grazing outside the 45% cockpit core hitbox with zero damage (FR-014)', () => {
    const playerTransform = entities.transforms.get(playerId)!;
    const playerHealth = entities.healths.get(playerId)!;
    playerTransform.x = 300;
    playerTransform.y = 700;

    let grazeSparkEmitted = false;
    eventBus.on('VFX_SPAWN_TRIGGERED', (e) => {
      if (e.type === 'GRAZE_SPARK') grazeSparkEmitted = true;
    });

    // Core hitbox radius is 10px, bullet radius is 5px (lethal distance <= 15px).
    // Wing halfWidth is 22px (graze zone is 15px < dist <= 27px).
    // Spawn enemy bullet at x = 320 (20px away from center -> hits wingtip, misses core!)
    weaponSystem.spawnEnemyBullet(320, 700, 0, 250, 25);
    collisionSystem.update(1 / 60);

    expect(playerHealth.currentHealth).toBe(100);
    expect(grazeSparkEmitted).toBe(true);
    // Bullet was NOT consumed by a core hit
    expect(weaponSystem.getPoolMetrics().enemyBullets.activeCount).toBe(1);
  });

  it('inflicts damage on direct cockpit core hits and grants 0.5s temporary invulnerability (FR-004, FR-014)', () => {
    const playerTransform = entities.transforms.get(playerId)!;
    const playerHealth = entities.healths.get(playerId)!;
    playerTransform.x = 300;
    playerTransform.y = 700;

    // Spawn enemy bullet directly on cockpit center (304, 700 -> dist = 4px <= 15px)
    weaponSystem.spawnEnemyBullet(304, 700, 0, 250, 30);
    collisionSystem.update(1 / 60);

    expect(playerHealth.currentHealth).toBe(70);
    expect(playerHealth.invulnerableTimer).toBeCloseTo(DAMAGE_INVULNERABILITY_SEC, 4);
    expect(weaponSystem.getPoolMetrics().enemyBullets.activeCount).toBe(0);

    // Second hit during 0.5s invulnerability window deals 0 damage
    healthSystem.applyDamage(playerId, 30);
    expect(playerHealth.currentHealth).toBe(70);

    // Advance timer past 0.5s and verify critical health indicator at <= 25%
    healthSystem.update(0.55);
    healthSystem.applyDamage(playerId, 50);
    expect(playerHealth.currentHealth).toBe(20);
    expect(isHealthCritical(playerHealth)).toBe(true);
  });

  it('consumes 1 life on 0 HP, resets weapon to Tier 1, and respawns at bottom-center with 2.5s invulnerability (FR-011, FR-012)', () => {
    const playerTransform = entities.transforms.get(playerId)!;
    const playerHealth = entities.healths.get(playerId)!;
    const playerWeapon = entities.weapons.get(playerId)!;

    // Move ship away from center and upgrade weapon to Tier 2 (degrades by 1 -> Tier 1 on life loss)
    playerTransform.x = 120;
    playerTransform.y = 450;
    playerWeapon.tier = 2;

    // Inflict lethal 100 damage on Life 1 (3 -> 2 lives remaining)
    healthSystem.applyDamage(playerId, 100);

    expect(playerHealth.livesRemaining).toBe(2);
    expect(playerHealth.currentHealth).toBe(100);
    expect(playerHealth.invulnerableTimer).toBeCloseTo(RESPAWN_INVULNERABILITY_SEC, 4);
    expect(playerTransform.x).toBe(SAFE_RESPAWN_X);
    expect(playerTransform.y).toBe(SAFE_RESPAWN_Y);
    expect(playerWeapon.tier).toBe(1);
    expect(gameOverTriggered).toBe(false);
  });

  it('transitions to Game Over only when all 3 lives are exhausted (FR-012)', () => {
    const playerHealth = entities.healths.get(playerId)!;

    // Lose Life 1 (3 -> 2)
    healthSystem.applyDamage(playerId, 100);
    expect(playerHealth.livesRemaining).toBe(2);
    healthSystem.update(3.0);

    // Lose Life 2 (2 -> 1)
    healthSystem.applyDamage(playerId, 100);
    expect(playerHealth.livesRemaining).toBe(1);
    expect(gameOverTriggered).toBe(false);
    healthSystem.update(3.0);

    // Lose Final Life 3 (1 -> 0 -> Game Over)
    healthSystem.applyDamage(playerId, 100);
    expect(playerHealth.livesRemaining).toBe(0);
    expect(playerHealth.currentHealth).toBe(0);
    expect(gameOverTriggered).toBe(true);
    expect(entities.isEntityActive(playerId)).toBe(false);
  });

  it('detects player bullet vs enemy AABB collisions via 64x64 SpatialGrid and destroys enemy at 0 HP', () => {
    const path = Spline.createSwoopEntryPath('left', 300, 200);
    const enemyId = enemyPool.spawn({
      archetype: 'SCOUT', // 25 HP
      gridCol: 0,
      gridRow: 0,
      targetSlotX: 300,
      targetSlotY: 200,
      splinePath: path,
      difficultyMultiplier: 1.0
    })!;

    const et = entities.transforms.get(enemyId)!;
    et.x = 300;
    et.y = 200;

    let destroyedArchetype = '';
    eventBus.on('ENEMY_DESTROYED', (e) => {
      destroyedArchetype = e.archetype;
    });

    // Spawn player bullet (25 damage) at (300, 202) overlapping enemy
    weaponSystem.spawnPlayerBullet(300, 202, 0, -760, 25);
    collisionSystem.update(1 / 60);

    expect(destroyedArchetype).toBe('SCOUT');
    expect(enemyPool.getActiveCount()).toBe(0);
    expect(weaponSystem.getPoolMetrics().playerBullets.activeCount).toBe(0);
  });
});

