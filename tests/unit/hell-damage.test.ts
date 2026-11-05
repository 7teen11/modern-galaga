import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../../src/ecs/Entity';
import { EventBus } from '../../src/core/EventBus';
import { HellDirector } from '../../src/modes/hell/HellDirector';
import { HellDamageSystem } from '../../src/modes/hell/HellDamageSystem';
import { HealthSystem } from '../../src/systems/HealthSystem';
import { EnemyPool } from '../../src/ecs/EnemyPool';
import { WeaponSystem } from '../../src/systems/WeaponSystem';
import { InputSystem } from '../../src/systems/InputSystem';
import { createPlayerShip, DEFAULT_PLAYER_CONFIG } from '../../src/components/PlayerComponents';

describe('HellDamageSystem & 2x Hazard Multipliers (T008)', () => {
  let entities: EntityManager;
  let eventBus: EventBus;
  let director: HellDirector;
  let damageSystem: HellDamageSystem;
  let healthSystem: HealthSystem;
  let weaponSystem: WeaponSystem;
  let enemyPool: EnemyPool;
  let playerId: number;

  beforeEach(() => {
    entities = new EntityManager();
    eventBus = new EventBus();
    director = new HellDirector(eventBus);

    playerId = createPlayerShip(entities, DEFAULT_PLAYER_CONFIG);

    const inputSystem = new InputSystem(entities, eventBus, playerId);
    weaponSystem = new WeaponSystem(entities, eventBus, inputSystem, playerId);
    enemyPool = new EnemyPool(entities);

    healthSystem = new HealthSystem(
      entities,
      eventBus,
      enemyPool,
      weaponSystem,
      playerId
    );

    damageSystem = new HellDamageSystem(
      entities,
      eventBus,
      director,
      weaponSystem,
      playerId
    );
  });

  it('keeps standard damage when Hell Mode is inactive', () => {
    director.setMode('STANDARD');

    // Spawn an enemy bullet
    const bullet = weaponSystem.enemyBulletPool.acquire();
    expect(bullet).not.toBeNull();
    if (!bullet) return;

    entities.projectiles.set(bullet.entityId, {
      damage: 20,
      sourceAffiliation: 'ENEMY',
    });

    damageSystem.update(0.016);
    expect(entities.projectiles.get(bullet.entityId)?.damage).toBe(20);

    // Apply damage via healthSystem
    const health = entities.healths.get(playerId)!;
    health.invulnerableTimer = 0;
    healthSystem.applyDamage(playerId, 20, bullet.entityId);
    expect(health.currentHealth).toBe(80);
  });

  it('scales enemy bullet damage to 40 HP (2x) when Hell Mode is active', () => {
    director.setMode('HELL');

    const bullet = weaponSystem.enemyBulletPool.acquire();
    expect(bullet).not.toBeNull();
    if (!bullet) return;

    entities.projectiles.set(bullet.entityId, {
      damage: 20,
      sourceAffiliation: 'ENEMY',
    });

    damageSystem.update(0.016);
    expect(entities.projectiles.get(bullet.entityId)?.damage).toBe(40);

    // Bullet hitting player deals 40 HP
    const health = entities.healths.get(playerId)!;
    health.invulnerableTimer = 0;
    healthSystem.applyDamage(playerId, 40, bullet.entityId);
    expect(health.currentHealth).toBe(60);
  });

  it('doubles ramming collision damage from 35 HP to 70 HP (2x) when Hell Mode is active', () => {
    director.setMode('HELL');

    const health = entities.healths.get(playerId)!;
    health.invulnerableTimer = 0;
    health.currentHealth = 100;

    // Simulate enemy ramming: sourceId is an enemy ship (e.g. id: 500)
    const enemyId = 500;
    entities.enemyBehaviors.set(enemyId, {
      archetype: 'SCOUT',
      state: 'SWOOP',
      fireCooldown: 1,
      swayTimer: 0,
    } as any);

    healthSystem.applyDamage(playerId, 35, enemyId);
    // 100 HP - 70 HP = 30 HP
    expect(health.currentHealth).toBe(30);
  });

  it('causes instant life loss when ramming player with <= 70 HP in Hell Mode', () => {
    director.setMode('HELL');

    const health = entities.healths.get(playerId)!;
    health.invulnerableTimer = 0;
    health.currentHealth = 70;
    const initialLives = health.livesRemaining ?? 3;

    const enemyId = 501;
    entities.enemyBehaviors.set(enemyId, {
      archetype: 'FIGHTER',
      state: 'SWOOP',
      fireCooldown: 1,
      swayTimer: 0,
    } as any);

    healthSystem.applyDamage(playerId, 35, enemyId);
    // Player took 70 HP damage -> 0 HP -> consumed 1 life and respawned
    expect(health.livesRemaining).toBe(initialLives - 1);
  });
});
