import { describe, it, expect, beforeEach } from 'vitest';
import { EntityManager } from '../../src/ecs/Entity';
import { EventBus } from '../../src/core/EventBus';
import { HellDirector } from '../../src/modes/hell/HellDirector';
import { HellBossPool } from '../../src/modes/hell/HellBossPool';
import { HellBossSystem } from '../../src/modes/hell/HellBossSystem';
import { EnemyPool } from '../../src/ecs/EnemyPool';
import { createPlayerShip } from '../../src/components/PlayerComponents';
import { InputSystem } from '../../src/systems/InputSystem';
import { WeaponSystem } from '../../src/systems/WeaponSystem';
import { HealthSystem } from '../../src/systems/HealthSystem';

describe('HellBossSystem & Danmaku Mechanics (T014)', () => {
  let entities: EntityManager;
  let eventBus: EventBus;
  let director: HellDirector;
  let bossPool: HellBossPool;
  let enemyPool: EnemyPool;
  let bossSystem: HellBossSystem;

  beforeEach(() => {
    entities = new EntityManager();
    eventBus = new EventBus();
    director = new HellDirector(eventBus);
    director.setMode('HELL');

    bossPool = new HellBossPool(entities, 160);
    enemyPool = new EnemyPool(entities);

    bossSystem = new HellBossSystem(
      entities,
      eventBus,
      director,
      bossPool,
      enemyPool,
      1 // Player ID
    );
  });

  it('initializes HellBossPool with 160 pre-warmed bullets and enforces RECYCLE_OLDEST', () => {
    expect(bossPool.capacity).toBe(160);
    expect(bossPool.getActiveCount()).toBe(0);

    // Acquire all 160 bullets
    for (let i = 0; i < 160; i++) {
      const b = bossPool.acquire();
      expect(b).not.toBeNull();
    }
    expect(bossPool.getActiveCount()).toBe(160);

    // 161st bullet recycles the oldest bullet without exceeding 160
    const recycled = bossPool.acquire();
    expect(recycled).not.toBeNull();
    expect(bossPool.getActiveCount()).toBe(160);
  });

  it('spawns Void Dreadnought with 1,200 max health', () => {
    bossSystem.spawnBoss();
    expect(bossSystem.isBossActive()).toBe(true);
    expect(bossSystem.getCurrentHealth()).toBe(1200);
    expect(bossSystem.getMaxHealth()).toBe(1200);
    expect(bossSystem.isEnraged()).toBe(false);
  });

  it('emits 16-way radial danmaku burst in Phase 1', () => {
    bossSystem.spawnBoss();
    bossSystem.setBossPosition(300, 140);
    // Move out of intro state
    bossSystem.forcePhase1();

    bossSystem.fireRadialRing(16);
    expect(bossPool.getActiveCount()).toBe(16);
  });

  it('emits 7-way spread fan targeted toward player in Phase 1', () => {
    bossSystem.spawnBoss();
    bossSystem.setBossPosition(300, 140);
    bossSystem.forcePhase1();

    bossSystem.fireTargetedFan(7, 300, 700);
    expect(bossPool.getActiveCount()).toBe(7);
  });

  it('transitions to Phase 2 Enrage when HP drops <= 50% (600 HP) and spawns 2 Fighter escorts', () => {
    bossSystem.spawnBoss();
    bossSystem.forcePhase1();

    // Deal 600 damage
    bossSystem.applyBossDamage(600);
    expect(bossSystem.getCurrentHealth()).toBe(600);
    expect(bossSystem.isEnraged()).toBe(true);
    expect(bossSystem.getEscortsSpawnedCount()).toBe(2);
  });

  it('enters DYING state when boss health reaches 0 and triggers victory sequence', () => {
    bossSystem.spawnBoss();
    bossSystem.forcePhase1();

    let victoryTriggered = false;
    bossSystem.onBossDefeated = () => {
      victoryTriggered = true;
    };

    bossSystem.applyBossDamage(1200);
    expect(bossSystem.getCurrentHealth()).toBe(0);
    expect(bossSystem.getState()).toBe('DYING');

    // Simulate death animation timer (2.5s)
    bossSystem.update(2.6);
    expect(victoryTriggered).toBe(true);
    expect(bossSystem.getState()).toBe('DEFEATED');
  });

  it('damages and destroys the Boss when player bullets hit the Boss hitbox and triggers player death when Boss Danmaku depletes player HP', () => {
    const playerId = createPlayerShip(entities);
    const inputSystem = new InputSystem(entities, eventBus, playerId);
    const weaponSystem = new WeaponSystem(entities, eventBus, inputSystem, playerId, 600, 800);
    let gameOverCalled = false;
    const healthSystem = new HealthSystem(
      entities,
      eventBus,
      enemyPool,
      weaponSystem,
      playerId,
      () => {
        gameOverCalled = true;
      }
    );

    bossSystem.setPlayerId(playerId);
    bossSystem.setCombatSystems(weaponSystem, healthSystem);
    bossSystem.spawnBoss();
    bossSystem.setBossPosition(300, 148);
    bossSystem.forcePhase1();

    // 1. Spawn a player bullet directly inside the Boss hitbox (300, 148) with 1,200 damage
    weaponSystem.spawnPlayerBullet(300, 148, 0, -800, 1200);
    bossSystem.update(1 / 60);

    expect(bossSystem.getCurrentHealth()).toBe(0);
    expect(bossSystem.getState()).toBe('DYING');

    // 2. Respawn Boss to test Boss Danmaku killing the player across all 3 lives
    bossSystem.spawnBoss();
    bossSystem.setBossPosition(300, 148);
    bossSystem.forcePhase1();

    const pt = entities.transforms.get(playerId)!;
    const ph = entities.healths.get(playerId)!;
    pt.x = 300;
    pt.y = 700;
    ph.livesRemaining = 1;
    ph.currentHealth = 40; // 1 Danmaku bullet (40 damage) will reduce HP to 0 and trigger Game Over
    ph.invulnerableTimer = 0;

    const bullet = bossPool.acquire();
    const bt = entities.transforms.get(bullet.entityId)!;
    bt.x = 300;
    bt.y = 700;
    bt.vx = 0;
    bt.vy = 0;

    bossSystem.update(1 / 60);

    expect(ph.currentHealth).toBe(0);
    expect(ph.livesRemaining).toBe(0);
    expect(gameOverCalled).toBe(true);
    expect(entities.isEntityActive(playerId)).toBe(false);
  });
});
