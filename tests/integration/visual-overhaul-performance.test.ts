import { describe, it, expect } from 'vitest';
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
import { ParallaxSystem } from '../../src/systems/ParallaxSystem';
import { RenderSystem } from '../../src/systems/RenderSystem';
import { VFXSystem } from '../../src/systems/VFXSystem';

describe('Feature 003 Integration: Visual Overhaul & 5-Tier Weapon 60 FPS Frame Budget', () => {
  it('maintains <= 16.67ms average frame step with Tier 5 Hyper Beams, 30 multi-color enemies, 3-layer parallax, and 150 particles', () => {
    const entities = new EntityManager();
    const eventBus = new EventBus();
    const spatialGrid = new SpatialGrid(600, 800, 64);
    const playerId = createPlayerShip(entities);
    const inputSystem = new InputSystem(entities, eventBus, playerId);
    const movementSystem = new MovementSystem(entities, playerId, 600, 800);
    const weaponSystem = new WeaponSystem(entities, eventBus, inputSystem, playerId, 600, 800);
    const enemyPool = new EnemyPool(entities);
    const healthSystem = new HealthSystem(entities, eventBus, enemyPool, weaponSystem, playerId);
    const collisionSystem = new CollisionSystem(
      entities,
      spatialGrid,
      eventBus,
      weaponSystem,
      healthSystem,
      playerId
    );
    const parallaxSystem = new ParallaxSystem(600, 800);
    const renderSystem = new RenderSystem(entities, playerId, 600, 800, parallaxSystem);
    const vfxSystem = new VFXSystem(eventBus, renderSystem, playerId);

    // Upgrade player to Tier 5
    for (let i = 0; i < 4; i++) {
      weaponSystem.upgradePlayerWeapon();
    }
    expect(entities.weapons.get(playerId)!.tier).toBe(5);

    // Spawn 30 multi-color enemies across Scout, Fighter, and Commander roles
    const archetypes = ['SCOUT', 'FIGHTER', 'COMMANDER'] as const;
    for (let i = 0; i < 30; i++) {
      enemyPool.spawn({
        archetype: archetypes[i % 3],
        gridCol: i % 10,
        gridRow: Math.floor(i / 10),
        targetSlotX: 80 + (i % 10) * 48,
        targetSlotY: 120 + Math.floor(i / 10) * 48,
        splinePath: [],
        difficultyMultiplier: 1.2
      });
    }

    // Spawn 150 neon particles
    vfxSystem.spawnBurst(300, 400, 40, '#ff2a55', 220);
    vfxSystem.spawnBurst(200, 300, 40, '#00f0ff', 220);
    vfxSystem.spawnBurst(400, 300, 40, '#ffcc00', 220);
    vfxSystem.spawnBurst(300, 200, 30, '#00ff88', 220);

    // Simulate 120 frames (2.0 seconds) of active Tier 5 volley firing + parallax + collision
    const startMs = performance.now();
    const dt = 1 / 60;

    for (let frame = 0; frame < 120; frame++) {
      if (frame % 8 === 0) {
        weaponSystem.firePlayerWeaponPattern(300, 700, 5);
      }
      movementSystem.update(dt);
      weaponSystem.update(dt);
      healthSystem.update(dt);
      collisionSystem.update(dt);
      renderSystem.update(dt);
      vfxSystem.update(dt);
    }

    const totalMs = performance.now() - startMs;
    const avgFrameMs = totalMs / 120;
    expect(avgFrameMs).toBeLessThan(16.67);
  });
});

