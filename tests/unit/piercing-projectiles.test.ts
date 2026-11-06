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
import { EntityId } from '../../src/ecs/Component';

describe('Feature 003 - User Story 4: Tier 5 Armor-Piercing Hyper Beams (FR-002, Q3: A)', () => {
  let entities: EntityManager;
  let eventBus: EventBus;
  let spatialGrid: SpatialGrid;
  let playerId: EntityId;
  let inputSystem: InputSystem;
  let weaponSystem: WeaponSystem;
  let enemyPool: EnemyPool;
  let healthSystem: HealthSystem;
  let collisionSystem: CollisionSystem;

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
  });

  it('penetrates through multiple stacked enemies without despawning on first contact and avoids duplicate hits on the same enemy', () => {
    // Spawn two Scouts stacked at (300, 200) and (300, 170)
    const enemy1 = enemyPool.spawn({
      archetype: 'SCOUT', // 25 HP
      gridCol: 0,
      gridRow: 0,
      targetSlotX: 300,
      targetSlotY: 200,
      splinePath: [],
      difficultyMultiplier: 1.0
    })!;
    const enemy2 = enemyPool.spawn({
      archetype: 'SCOUT', // 25 HP
      gridCol: 0,
      gridRow: 1,
      targetSlotX: 300,
      targetSlotY: 170,
      splinePath: [],
      difficultyMultiplier: 1.0
    })!;

    entities.transforms.get(enemy1)!.x = 300;
    entities.transforms.get(enemy1)!.y = 200;
    entities.transforms.get(enemy2)!.x = 300;
    entities.transforms.get(enemy2)!.y = 170;

    // Spawn a single Tier 5 armor-piercing central beam at (300, 200)
    const beamId = weaponSystem.spawnPlayerBullet(300, 200, 0, -900, 30, {
      tier: 5,
      isPiercing: true,
      width: 14,
      height: 32
    })!;

    // Frame 1: Beam hits enemy1 at (300, 200) -> destroys enemy1, but beam remains active!
    collisionSystem.update(1 / 60);
    expect(entities.isEntityActive(enemy1)).toBe(false);
    expect(entities.isEntityActive(beamId)).toBe(true);

    // Move beam up to (300, 170) where enemy2 is stationed
    entities.transforms.get(beamId)!.y = 170;
    collisionSystem.update(1 / 60);

    // Enemy2 is also destroyed by the same piercing beam, and beam still continues flying!
    expect(entities.isEntityActive(enemy2)).toBe(false);
    expect(entities.isEntityActive(beamId)).toBe(true);
    expect(enemyPool.getActiveCount()).toBe(0);
  });
});

