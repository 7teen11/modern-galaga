import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EntityManager } from '../../src/ecs/Entity';
import { EventBus } from '../../src/core/EventBus';
import { createPlayerShip } from '../../src/components/PlayerComponents';
import { InputSystem } from '../../src/systems/InputSystem';
import { WeaponSystem } from '../../src/systems/WeaponSystem';
import { EnemyPool } from '../../src/ecs/EnemyPool';
import { HealthSystem } from '../../src/systems/HealthSystem';
import { ENEMY_ARCHETYPE_CONFIG } from '../../src/components/EnemyBehavior';
import {
  ENEMY_COLOR_VARIANTS,
  selectEnemyColorVariant
} from '../../src/components/EnemyVariants';
import { EntityId } from '../../src/ecs/Component';

describe('Feature 003 - User Story 2: Vibrant Multi-Color Enemy Fleet & Token Drop Probabilities', () => {
  let entities: EntityManager;
  let eventBus: EventBus;
  let playerId: EntityId;
  let inputSystem: InputSystem;
  let weaponSystem: WeaponSystem;
  let enemyPool: EnemyPool;
  let healthSystem: HealthSystem;

  beforeEach(() => {
    entities = new EntityManager();
    eventBus = new EventBus();
    playerId = createPlayerShip(entities);
    inputSystem = new InputSystem(entities, eventBus, playerId);
    weaponSystem = new WeaponSystem(entities, eventBus, inputSystem, playerId, 600, 800);
    enemyPool = new EnemyPool(entities);
    healthSystem = new HealthSystem(entities, eventBus, enemyPool, weaponSystem, playerId);
  });

  it('defines distinct neon color variants for Scouts, Fighters, and Commanders and assigns them deterministically (FR-006)', () => {
    expect(ENEMY_COLOR_VARIANTS.SCOUT.length).toBeGreaterThanOrEqual(3);
    expect(ENEMY_COLOR_VARIANTS.FIGHTER.length).toBeGreaterThanOrEqual(3);
    expect(ENEMY_COLOR_VARIANTS.COMMANDER.length).toBeGreaterThanOrEqual(2);

    const scoutColors = new Set<string>();
    for (let col = 0; col < 5; col++) {
      const v = selectEnemyColorVariant('SCOUT', col, 0);
      scoutColors.add(v.hullPrimary);
    }
    expect(scoutColors.size).toBe(3);

    // Spawning an enemy populates its RenderComponent with variant hull & thruster colors
    const id = enemyPool.spawn({
      archetype: 'FIGHTER',
      gridCol: 2,
      gridRow: 1,
      targetSlotX: 250,
      targetSlotY: 160,
      splinePath: [],
      difficultyMultiplier: 1.0
    })!;
    const r = entities.renders.get(id)!;
    expect(r.variantId).toBeDefined();
    expect(r.hullPrimary).toBeDefined();
    expect(r.hullSecondary).toBeDefined();
    expect(r.thrusterColor).toBeDefined();
  });

  it('guarantees 100% weapon upgrade drop from Commanders and 20% probability from Fighters (FR-008, Q2: A)', () => {
    expect(ENEMY_ARCHETYPE_CONFIG.COMMANDER.dropWeaponUpgradeChance).toBe(1.0);
    expect(ENEMY_ARCHETYPE_CONFIG.FIGHTER.dropWeaponUpgradeChance).toBe(0.20);
    expect(ENEMY_ARCHETYPE_CONFIG.SCOUT.dropWeaponUpgradeChance).toBe(0.0);

    const droppedTypes: Array<string | null> = [];
    eventBus.on('ENEMY_DESTROYED', (e) => {
      droppedTypes.push(e.droppedPowerUp);
    });

    // 1. Commander always drops WEAPON_UPGRADE
    const cmdId = enemyPool.spawn({
      archetype: 'COMMANDER',
      gridCol: 0,
      gridRow: 0,
      targetSlotX: 200,
      targetSlotY: 100,
      splinePath: [],
      difficultyMultiplier: 1.0
    })!;
    healthSystem.applyDamage(cmdId, 200);
    expect(droppedTypes[0]).toBe('WEAPON_UPGRADE');

    // 2. Fighter drops WEAPON_UPGRADE when Math.random() < 0.20
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0.15); // < 0.20 -> drops!
    const fighter1 = enemyPool.spawn({
      archetype: 'FIGHTER',
      gridCol: 1,
      gridRow: 1,
      targetSlotX: 240,
      targetSlotY: 150,
      splinePath: [],
      difficultyMultiplier: 1.0
    })!;
    healthSystem.applyDamage(fighter1, 100);
    expect(droppedTypes[1]).toBe('WEAPON_UPGRADE');

    // 3. Fighter does NOT drop when Math.random() >= 0.20
    randomSpy.mockReturnValueOnce(0.25); // >= 0.20 -> null
    const fighter2 = enemyPool.spawn({
      archetype: 'FIGHTER',
      gridCol: 2,
      gridRow: 1,
      targetSlotX: 280,
      targetSlotY: 150,
      splinePath: [],
      difficultyMultiplier: 1.0
    })!;
    healthSystem.applyDamage(fighter2, 100);
    expect(droppedTypes[2]).toBeNull();

    randomSpy.mockRestore();
  });
});

