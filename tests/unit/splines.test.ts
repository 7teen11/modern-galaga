import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../../src/ecs/Entity';
import { EventBus } from '../../src/core/EventBus';
import { createPlayerShip } from '../../src/components/PlayerComponents';
import { InputSystem } from '../../src/systems/InputSystem';
import { MovementSystem } from '../../src/systems/MovementSystem';
import { WeaponSystem } from '../../src/systems/WeaponSystem';
import { EnemyPool } from '../../src/ecs/EnemyPool';
import { EnemySystem } from '../../src/systems/EnemySystem';
import { WaveSpawnSystem } from '../../src/systems/WaveSpawnSystem';
import { Spline } from '../../src/utils/Spline';
import { EntityId } from '../../src/ecs/Component';

describe('User Story 2: Wave-Based Enemies with Diverse Tactical Behaviors', () => {
  let entities: EntityManager;
  let eventBus: EventBus;
  let playerId: EntityId;
  let inputSystem: InputSystem;
  let movementSystem: MovementSystem;
  let weaponSystem: WeaponSystem;
  let enemyPool: EnemyPool;
  let enemySystem: EnemySystem;
  let waveSpawnSystem: WaveSpawnSystem;

  beforeEach(() => {
    entities = new EntityManager();
    eventBus = new EventBus();
    playerId = createPlayerShip(entities);
    inputSystem = new InputSystem(entities, eventBus, playerId);
    movementSystem = new MovementSystem(entities, playerId, 600, 800);
    weaponSystem = new WeaponSystem(entities, eventBus, inputSystem, playerId, 600, 800);
    enemyPool = new EnemyPool(entities);
    enemySystem = new EnemySystem(entities, weaponSystem, playerId, 600, 800);
    waveSpawnSystem = new WaveSpawnSystem(enemyPool, enemySystem, eventBus, 600, 800);
  });

  it('pre-warms EnemyPool to capacity 60 and spawns distinct Scout, Fighter, and Commander archetypes', () => {
    expect(enemyPool.getMetrics().capacity).toBe(60);
    expect(enemyPool.getMetrics().freeCount).toBe(60);

    const path = Spline.createSwoopEntryPath('left', 200, 100);
    const scoutId = enemyPool.spawn({
      archetype: 'SCOUT',
      gridCol: 0,
      gridRow: 2,
      targetSlotX: 200,
      targetSlotY: 180,
      splinePath: path,
      difficultyMultiplier: 1.0
    })!;

    const commanderId = enemyPool.spawn({
      archetype: 'COMMANDER',
      gridCol: 0,
      gridRow: 0,
      targetSlotX: 200,
      targetSlotY: 95,
      splinePath: path,
      difficultyMultiplier: 1.0
    })!;

    expect(entities.healths.get(scoutId)!.maxHealth).toBe(25);
    expect(entities.enemyBehaviors.get(scoutId)!.pointValue).toBe(100);

    expect(entities.healths.get(commanderId)!.maxHealth).toBe(100);
    expect(entities.enemyBehaviors.get(commanderId)!.pointValue).toBe(400);
  });

  it('moves entering enemies along Bézier spline trajectories and transitions to IN_FORMATION', () => {
    const path = Spline.createSwoopEntryPath('left', 250, 120, 600, 800);
    const enemyId = enemyPool.spawn({
      archetype: 'FIGHTER',
      gridCol: 1,
      gridRow: 1,
      targetSlotX: 250,
      targetSlotY: 120,
      splinePath: path,
      difficultyMultiplier: 1.0
    })!;

    const behavior = entities.enemyBehaviors.get(enemyId)!;
    const transform = entities.transforms.get(enemyId)!;
    expect(behavior.state).toBe('ENTERING_SPLINE');

    // Advance spline traversal to completion
    for (let i = 0; i < 160; i++) {
      movementSystem.update(1 / 60);
    }

    expect(behavior.state).toBe('IN_FORMATION');
    expect(transform.x).toBeCloseTo(250, 1);
    expect(transform.y).toBeCloseTo(120, 1);
  });

  it('triggers coordinated escort dives when a Commander initiates a dive attack (FR-006)', () => {
    const path = Spline.createSwoopEntryPath('right', 300, 95);

    const commanderId = enemyPool.spawn({
      archetype: 'COMMANDER',
      gridCol: 2,
      gridRow: 0,
      targetSlotX: 300,
      targetSlotY: 95,
      splinePath: path,
      difficultyMultiplier: 1.0
    })!;

    const escortId = enemyPool.spawn({
      archetype: 'FIGHTER',
      gridCol: 2,
      gridRow: 1,
      targetSlotX: 300,
      targetSlotY: 143,
      splinePath: path,
      difficultyMultiplier: 1.0
    })!;

    const cmdBehavior = entities.enemyBehaviors.get(commanderId)!;
    const escortBehavior = entities.enemyBehaviors.get(escortId)!;
    cmdBehavior.state = 'IN_FORMATION';
    escortBehavior.state = 'IN_FORMATION';

    // Force Commander dive timer to expire
    cmdBehavior.diveTimer = 0.01;
    enemySystem.update(0.05);

    expect(cmdBehavior.state).toBe('DIVING');
    expect(escortBehavior.state).toBe('DIVING');
  });

  it('wraps diving enemies from bottom of screen to top and returns them to formation', () => {
    const path = Spline.createSwoopEntryPath('left', 220, 140);
    const scoutId = enemyPool.spawn({
      archetype: 'SCOUT',
      gridCol: 0,
      gridRow: 2,
      targetSlotX: 220,
      targetSlotY: 140,
      splinePath: path,
      difficultyMultiplier: 1.0
    })!;

    const behavior = entities.enemyBehaviors.get(scoutId)!;
    const transform = entities.transforms.get(scoutId)!;
    behavior.state = 'DIVING';
    transform.x = 220;
    transform.y = 835; // Past bottom margin (800 + 32)

    enemySystem.update(1 / 60);
    expect(behavior.state).toBe('RETURNING');
    expect(transform.y).toBeLessThan(0);

    // Let returning enemy glide back to formation slot
    for (let i = 0; i < 60; i++) {
      enemySystem.update(1 / 60);
      movementSystem.update(1 / 60);
    }

    expect(behavior.state).toBe('IN_FORMATION');
  });

  it('spawns structured wave squads and emits WAVE_COMPLETED when all enemies are cleared', () => {
    let completedEventFired = false;
    let bonusAwarded = 0;

    eventBus.on('WAVE_COMPLETED', (payload) => {
      completedEventFired = true;
      bonusAwarded = payload.bonusPoints;
    });

    waveSpawnSystem.startWave(1);
    expect(waveSpawnSystem.currentWaveIndex).toBe(1);
    expect(waveSpawnSystem.getPendingSpawnCount()).toBeGreaterThanOrEqual(12);

    // Advance clock to spawn all queued squads
    for (let i = 0; i < 600; i++) {
      waveSpawnSystem.update(1 / 60);
    }
    expect(waveSpawnSystem.getPendingSpawnCount()).toBe(0);
    expect(enemyPool.getActiveCount()).toBeGreaterThanOrEqual(12);

    // Simulate defeating all enemies in Wave 1
    enemyPool.releaseAll();
    waveSpawnSystem.update(1 / 60);

    expect(completedEventFired).toBe(true);
    expect(bonusAwarded).toBe(500);
  });
});

