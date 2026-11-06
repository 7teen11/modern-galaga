import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../../src/ecs/Entity';
import { EventBus } from '../../src/core/EventBus';
import { createPlayerShip } from '../../src/components/PlayerComponents';
import { InputSystem } from '../../src/systems/InputSystem';
import { WeaponSystem } from '../../src/systems/WeaponSystem';
import { EnemyPool } from '../../src/ecs/EnemyPool';
import { HealthSystem } from '../../src/systems/HealthSystem';
import { EntityId } from '../../src/ecs/Component';

describe('Feature 003 - User Story 4: Life Loss Weapon Tier Degradation (FR-005, Q1: A)', () => {
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

  it('degrades weapon tier by 1 level (max(1, currentTier - 1)) when losing a life at Tier 5 -> Tier 4 -> Tier 3', () => {
    const playerWeapon = entities.weapons.get(playerId)!;
    const playerHealth = entities.healths.get(playerId)!;
    playerHealth.livesRemaining = 3;
    playerWeapon.tier = 5;

    // Lose Life 1 at Tier 5 -> respawns at Tier 4
    healthSystem.applyDamage(playerId, 100);
    expect(playerHealth.livesRemaining).toBe(2);
    expect(playerWeapon.tier).toBe(4);

    // Advance past respawn invulnerability (2.5s) and lose Life 2 at Tier 4 -> respawns at Tier 3
    healthSystem.update(3.0);
    healthSystem.applyDamage(playerId, 100);
    expect(playerHealth.livesRemaining).toBe(1);
    expect(playerWeapon.tier).toBe(3);
  });

  it('never degrades below Tier 1 when losing a life at Tier 1', () => {
    const playerWeapon = entities.weapons.get(playerId)!;
    playerWeapon.tier = 1;

    healthSystem.applyDamage(playerId, 100);
    expect(playerWeapon.tier).toBe(1);
  });
});

